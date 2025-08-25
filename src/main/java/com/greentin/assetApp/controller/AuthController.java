package com.greentin.assetApp.controller;

import com.greentin.assetApp.dto.LoginRequest;
import com.greentin.assetApp.dto.RegistrationRequest;
import com.greentin.assetApp.dto.ResetPasswordRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.service.AuthService;
import com.greentin.assetApp.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // Temporary in-memory token storage (better: DB table)
    private final Map<String, PasswordResetToken> resetTokens = new HashMap<>();

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            User user = authService.authenticate(request.getEmail(), request.getPassword());

            Map<String, Object> claims = new HashMap<>();
            claims.put("role", user.getRole());
            String token = com.greentin.assetApp.config.JwtUtil.generateToken(user.getEmail(), claims);

            // Optional: notify admin on login (if configured)
            emailService.notifyAdminOnLogin(user);

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", user
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegistrationRequest request) {
        String normalizedEmail = request.getEmail() == null ? null : request.getEmail().trim().toLowerCase();

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body("Passwords do not match");
        }

        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            return ResponseEntity.status(409).body("Email already exists");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(normalizedEmail);
        user.setRole(request.getRole());
        user.setDepartment(request.getDepartment());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User savedUser = authService.register(user);

        emailService.sendRegistrationNotification(savedUser);

        return ResponseEntity.ok(savedUser);
    }

    // Step 1: Request password reset → send email with token
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email").trim().toLowerCase();

        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> {
                    String token = UUID.randomUUID().toString();
                    resetTokens.put(token, new PasswordResetToken(user.getEmail(), LocalDateTime.now().plusMinutes(15)));

                    // send reset link
                    String resetLink = "http://localhost:4200/reset-password?token=" + token;
                    emailService.sendPasswordResetLink(user, resetLink);

                    return ResponseEntity.ok("Password reset link sent to " + email);
                })
                .orElseGet(() -> ResponseEntity.status(404).body("User not found"));
    }

    // Step 2: Reset password using token
    @PostMapping("/reset-password-confirm")
    public ResponseEntity<?> resetPasswordConfirm(@Valid @RequestBody ResetPasswordRequest request) {
        String token = request.getToken();
        String newPassword = request.getNewPassword();

        PasswordResetToken resetToken = resetTokens.get(token);

        if (resetToken == null || resetToken.expiry.isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(400).body("Invalid or expired token");
        }

        return userRepository.findByEmailIgnoreCase(resetToken.email)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(user);

                    resetTokens.remove(token);

                    emailService.sendPasswordResetNotification(user);

                    return ResponseEntity.ok("Password successfully reset for " + user.getEmail());
                })
                .orElseGet(() -> ResponseEntity.status(404).body("User not found"));
    }

    // Inner class for token tracking
    private static class PasswordResetToken {
        String email;
        LocalDateTime expiry;

        PasswordResetToken(String email, LocalDateTime expiry) {
            this.email = email;
            this.expiry = expiry;
        }
    }
}
