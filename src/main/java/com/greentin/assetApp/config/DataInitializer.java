package com.greentin.assetApp.config;

import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        // Super Admin
        final String superAdminEmail = "superadmin@example.com";
        if (!userRepository.existsByEmailIgnoreCase(superAdminEmail)) {
            User superAdmin = new User();
            superAdmin.setDepartment(null);
            superAdmin.setEmail(superAdminEmail);
            superAdmin.setName("Super Admin");
            superAdmin.setPassword(passwordEncoder.encode("admin123"));
            superAdmin.setRole("SUPER_ADMIN");
            userRepository.save(superAdmin);
            log.info("Initialized default SUPER_ADMIN user: {}", superAdminEmail);
        } else {
            log.info("SUPER_ADMIN user already present: {}", superAdminEmail);
        }

        // IT Department Admin - SNC
        if (!userRepository.existsByEmailIgnoreCase("snc@gmail.com")) {
            User snc = new User();
            snc.setDepartment("IT");
            snc.setEmail("snc@gmail.com");
            snc.setName("SNC");
            snc.setPassword(passwordEncoder.encode("Sumit@01"));
            snc.setRole("DEPARTMENT_ADMIN");
            userRepository.save(snc);
            log.info("Initialized default DEPARTMENT_ADMIN user: {}", "snc@gmail.com");
        } else {
            log.info("DEPARTMENT_ADMIN user already present: {}", "snc@gmail.com");
        }

        // HR Store Manager - Ahilya Kokare
        if (!userRepository.existsByEmailIgnoreCase("ahilya@gmail.com")) {
            User hr = new User();
            hr.setDepartment("HR");
            hr.setEmail("ahilya@gmail.com");
            hr.setName("Ahilya Kokare");
            hr.setPassword(passwordEncoder.encode("Ahilya@00"));
            hr.setRole("STORE_MANAGER");
            userRepository.save(hr);
            log.info("Initialized default STORE_MANAGER user: {}", "ahilya@gmail.com");
        } else {
            log.info("STORE_MANAGER user already present: {}", "ahilya@gmail.com");
        }
    }
}