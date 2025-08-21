package com.greentin.assetApp.service;

import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public User updateUserStatus(Long userId, String status, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(status);
        user.setLastModifiedBy(adminEmail);
        return userRepository.save(user);
    }
}
