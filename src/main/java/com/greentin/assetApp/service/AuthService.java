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
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public User authenticate(String email, String rawPassword) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        String stored = user.getPassword();
        if (stored == null || stored.isBlank()) {
            throw new RuntimeException("Invalid email or password");
        }

        // Case 1: Stored has {id} prefix → use DelegatingPasswordEncoder directly
        if (stored.startsWith("{")) {
            if (passwordEncoder.matches(rawPassword, stored)) return user;
            throw new RuntimeException("Invalid email or password");
        }

        // Case 2: Legacy BCrypt without {bcrypt} prefix → verify with BCrypt and upgrade
        boolean legacyBcrypt = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
        if (legacyBcrypt) {
            org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder bcrypt = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
            if (bcrypt.matches(rawPassword, stored)) {
                user.setPassword(passwordEncoder.encode(rawPassword)); // upgrade (adds {bcrypt})
                userRepository.save(user);
                return user;
            }
            throw new RuntimeException("Invalid email or password");
        }

        // Case 3: Plaintext stored → accept once and upgrade to encoded
        if (stored.equals(rawPassword)) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
            return user;
        }

        // Case 4: Try Delegating as a final attempt (covers defaultIdForEncode matches)
        if (passwordEncoder.matches(rawPassword, stored)) {
            return user;
        }

        throw new RuntimeException("Invalid email or password");
    }

    public User register(User user) {
        // Always encode password before saving
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public void sendResetPasswordEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String resetLink = "http://localhost:4200/reset-password?email=" + user.getEmail();
        emailService.sendPasswordResetLink(user, resetLink);
    }

    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
