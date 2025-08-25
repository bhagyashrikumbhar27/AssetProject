package com.greentin.assetApp.service;

import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl {

    private final UserRepository userRepository;
    private final EmailService emailService;

    public User registerUser(User user) {
        // Save user
        User savedUser = userRepository.save(user);

        // Send welcome email to employee only
        emailService.sendRegistrationNotification(savedUser);

        return savedUser;
    }
}
