package com.example.Pandharpur.services;

import com.example.Pandharpur.Entity.*;
import com.example.Pandharpur.dto.UserDto;
import com.example.Pandharpur.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepo repo;
    private final PasswordEncoder enc;
    private final MailService mail;
    private final DepartmentRepo departmentRepo;
    private final LocationRepo locationRepo;

    public User create(UserDto dto, Role role) {
        // Basic validation (recommended)
        if (dto.getEmail() == null || dto.getEmail().isBlank()) {
            throw new IllegalArgumentException("email is required");
        }
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new IllegalArgumentException("password is required");
        }
        repo.findByEmail(dto.getEmail()).ifPresent(u -> {
            throw new IllegalStateException("Email already exists: " + dto.getEmail());
        });

        User u = new User();
        BeanUtils.copyProperties(dto, u); // FIX: remove asterisks

        // Strict relation mapping (recommended; replace ifPresent with explicit validation)
        if (dto.getDepartmentId() != null) {
            Department dept = departmentRepo.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid departmentId: " + dto.getDepartmentId()));
            u.setDepartment(dept);
        }
        if (dto.getLocationId() != null) {
            Location loc = locationRepo.findById(dto.getLocationId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid locationId: " + dto.getLocationId()));
            u.setLocation(loc);
        }

        u.setPassword(enc.encode(dto.getPassword()));
        u.setRole(role);

        User saved = repo.save(u);
        // Consider sending after TX commit for robustness
        mail.sendCredentials(saved.getEmail(), dto.getPassword());
        return saved;
    }

    // ADD these helpers so controller compiles
    public Optional<User> findByEmail(String email) {
        return repo.findByEmail(email);
    }

    public void delete(User user) {
        repo.delete(user);
    }
}
