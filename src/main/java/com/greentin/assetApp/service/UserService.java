package com.greentin.assetApp.service;

import com.greentin.assetApp.entity.User;

public interface UserService {
    User updateUserStatus(Long userId, String status, String adminEmail);
}
