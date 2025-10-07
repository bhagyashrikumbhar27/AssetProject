package com.greentin.assetApp.controller;

import com.greentin.assetApp.dto.AssetRequestDto;
import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.service.AssetRequestService;
import com.greentin.assetApp.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employee")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class EmployeeController {

    private final AssetRequestService requestService;
    private final UserRepository userRepository;

    // GET all requests for a user
    @GetMapping("/requests/{userId}")
    public ResponseEntity<ApiResponse> getRequests(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<AssetRequestDto> dtos = requestService.getRequests(user)
                .stream()
                .map(AssetRequestDto::new)
                .collect(Collectors.toList());

        ApiResponse response = new ApiResponse(true, "Requests fetched successfully", dtos);
        return ResponseEntity.ok(response);
    }

    // POST create a new request
    @PostMapping("/requests/{userId}")
    public ResponseEntity<ApiResponse> createRequest(@PathVariable Long userId,
                                                     @RequestBody AssetRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        AssetRequest createdRequest = requestService.createRequest(user, dto);

        ApiResponse response = new ApiResponse(true, "Request created successfully",
                new AssetRequestDto(createdRequest));
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
