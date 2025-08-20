package com.greentin.assetApp.controller;

import com.greentin.assetApp.dto.LoginRequest;
import com.greentin.assetApp.dto.RegistrationRequest;
import com.greentin.assetApp.dto.ResetPasswordRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            User user = authService.authenticate(request.getEmail(), request.getPassword());
            // Build JWT with email as subject and role claim
            java.util.Map<String,Object> claims = new java.util.HashMap<>();
            claims.put("role", user.getRole());
            String token = com.greentin.assetApp.config.JwtUtil.generateToken(user.getEmail(), claims);
            return ResponseEntity.ok(java.util.Map.of(
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

        // Check passwords match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body("Passwords do not match");
        }

        // Check duplicate email
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            return ResponseEntity.status(409).body("Email already exists");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(normalizedEmail);
        user.setRole(request.getRole());
        user.setDepartment(request.getDepartment());
        user.setPassword(request.getPassword()); // password encoded in service

        User savedUser = authService.register(user);
        return ResponseEntity.ok(savedUser);
    }

    // Admin/dev utility: reset a user's password (no auth checks for brevity; add as needed)
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        return userRepository.findByEmailIgnoreCase(normalizedEmail)
                .map(u -> {
                    u.setPassword(passwordEncoder.encode(request.getNewPassword()));
                    userRepository.save(u);
                    return ResponseEntity.ok("Password reset");
                })
                .orElseGet(() -> ResponseEntity.status(404).body("User not found"));
    }
}
