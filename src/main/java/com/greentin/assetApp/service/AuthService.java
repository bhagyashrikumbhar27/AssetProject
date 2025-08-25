package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.ResetPasswordRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailService emailService; // ✅ Inject email service
    private final PasswordEncoder passwordEncoder; // ✅ Use BCrypt encoder from SecurityConfig

    public User authenticate(String email, String rawPassword) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        String stored = user.getPassword();

        // 1) Normal path: compare raw password with stored BCrypt hash
        if (passwordEncoder.matches(rawPassword, stored)) {
            return user;
        }

        // 2) Backward-compat: if old plain-text password exists, upgrade it to BCrypt on-the-fly
        boolean looksLikeBcrypt = stored != null && (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$"));
        if (!looksLikeBcrypt && stored != null && stored.equals(rawPassword)) {
            String upgraded = passwordEncoder.encode(rawPassword);
            user.setPassword(upgraded);
            userRepository.save(user); // persist upgrade
            return user;
        }

        throw new RuntimeException("Invalid email or password");
    }

    public User register(User user) {
        return userRepository.save(user);
    }

    // ✅ Forgot password: send email with reset link (simple version)
    public void sendResetPasswordEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // you can generate a token (UUID) for secure reset links
        String resetLink = "http://localhost:4200/reset-password?email=" + user.getEmail();

        emailService.sendPasswordResetLink(user, resetLink);
    }

    // ✅ Reset password: always store encoded password
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String encoded = passwordEncoder.encode(request.getNewPassword());
        user.setPassword(encoded);
        userRepository.save(user);
    }
}
