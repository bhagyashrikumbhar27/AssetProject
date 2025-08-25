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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

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

    // -------------------- LOGIN --------------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            User user;
            try {
                user = authService.authenticate(request.getEmail(), request.getPassword());
            } catch (RuntimeException ex) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Invalid email or password. Please check your credentials."));
            }

            Map<String, Object> claims = new HashMap<>();
            claims.put("role", user.getRole());
            String token = com.greentin.assetApp.config.JwtUtil.generateToken(user.getEmail(), claims);

            // Optional: notify admin on login (if configured)
            emailService.notifyAdminOnLogin(user);

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", user
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Login failed: " + e.getMessage()));
        }
    }

    // -------------------- REGISTER --------------------
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
        // Pass raw password to service; it will encode once
        user.setPassword(request.getPassword());

        User savedUser = authService.register(user);

        emailService.sendRegistrationNotification(savedUser);

        return ResponseEntity.ok(savedUser);
    }

    // -------------------- FORGOT PASSWORD --------------------
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email").trim().toLowerCase();

        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> {
                    String token = UUID.randomUUID().toString();
                    resetTokens.put(token, new PasswordResetToken(user.getEmail(), LocalDateTime.now().plusMinutes(15)));

                    String resetLink = "http://localhost:4200/reset-password?token=" + token;
                    emailService.sendPasswordResetLink(user, resetLink);

                    return ResponseEntity.ok("Password reset link sent to " + email);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found"));
    }

    // -------------------- RESET PASSWORD --------------------
    @PostMapping("/reset-password-confirm")
    public ResponseEntity<?> resetPasswordConfirm(@Valid @RequestBody ResetPasswordRequest request) {
        String token = request.getToken();
        String newPassword = request.getNewPassword();

        PasswordResetToken resetToken = resetTokens.get(token);

        if (resetToken == null || resetToken.expiry.isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid or expired token");
        }

        return userRepository.findByEmailIgnoreCase(resetToken.email)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(user);

                    resetTokens.remove(token);

                    emailService.sendPasswordResetNotification(user);

                    return ResponseEntity.ok("Password successfully reset for " + user.getEmail());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found"));
    }

    // -------------------- TOKEN CLASS --------------------
    private static class PasswordResetToken {
        String email;
        LocalDateTime expiry;

        PasswordResetToken(String email, LocalDateTime expiry) {
            this.email = email;
            this.expiry = expiry;
        }
    }
}
