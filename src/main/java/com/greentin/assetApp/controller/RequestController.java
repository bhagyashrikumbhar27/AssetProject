package com.greentin.assetApp.controller;

import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.service.AssetRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/request")  // changed base path
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RequestController {

    private final AssetRequestService assetRequestService;
    private final UserRepository userRepository;

    // GET requests by user (unique path)
    @GetMapping("/user/{userId}")
    public List<AssetRequest> getUserRequests(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return assetRequestService.getRequests(user);
    }
}
