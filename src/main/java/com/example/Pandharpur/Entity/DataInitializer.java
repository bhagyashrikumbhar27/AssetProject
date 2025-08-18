package com.example.Pandharpur.Entity;

import com.example.Pandharpur.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private final UserRepo userRepo;
    private final PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        userRepo.findByEmail("superadmin@demo.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("superadmin@demo.com");
            u.setFirstName("Super");
            u.setLastName("Admin");
            u.setPassword(encoder.encode("Super@123")); // must be encoded
            u.setRole(Role.SUPER_ADMIN);
            return userRepo.save(u);
        });
    }
}
