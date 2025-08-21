package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.LoginRequest;
import com.greentin.assetApp.dto.RegistrationRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public ApiResponse register(RegistrationRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return new ApiResponse(false, "Email already exists");
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            return new ApiResponse(false, "Passwords do not match");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .role(request.getRole())
                .department(request.getDepartment())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        User savedUser = userRepository.save(user);

        // Notify super admin(s)
        if ("ADMIN".equalsIgnoreCase(savedUser.getDepartment()) || "STORE_MANAGER".equalsIgnoreCase(savedUser.getRole())) {
            List<User> superAdmins = userRepository.findByRole("SUPER_ADMIN");
            for (User superAdmin : superAdmins) {
                String subject = "New User Registration";
                String body = "A new user has registered with the following details:\n\n" +
                        "Name: " + savedUser.getName() + "\n" +
                        "Email: " + savedUser.getEmail() + "\n" +
                        "Role: " + savedUser.getRole() + "\n" +
                        "Department: " + savedUser.getDepartment();
                emailService.sendEmail(superAdmin.getEmail(), subject, body);
            }
        }

        return new ApiResponse(true, "Account created successfully");
    }

    public ApiResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return new ApiResponse(false, "Invalid email or password");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return new ApiResponse(false, "Invalid email or password");
        }

        // Optional: return user details in production you can return JWT instead
        return new ApiResponse(true, "Login successful");
    }
}
