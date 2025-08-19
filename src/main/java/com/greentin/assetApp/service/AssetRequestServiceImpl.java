package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.AssetRequestDto;
import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.AssetRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetRequestServiceImpl implements AssetRequestService {

    private final AssetRequestRepository requestRepository;

    // Create a new request
    @Override
    public AssetRequest createRequest(User user, AssetRequestDto dto) {
        AssetRequest.Status status = AssetRequest.Status.PENDING; // Default to PENDING
        
        // If status is provided in the DTO, use it
        if (dto.getStatus() != null && !dto.getStatus().isEmpty()) {
            try {
                status = AssetRequest.Status.valueOf(dto.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                // If invalid status is provided, fallback to PENDING
                status = AssetRequest.Status.PENDING;
            }
        }
        
        AssetRequest request = AssetRequest.builder()
                .assetType(dto.getAssetType())
                .priority(dto.getPriority())
                .justification(dto.getJustification())
                .status(status) // Use the status from DTO if provided
                .user(user)
                .build();

        return requestRepository.save(request);
    }

    // Get all requests for a specific user
    @Override
    public List<AssetRequest> getRequests(User user) {
        return requestRepository.findByUser(user);
    }

    // Update status of a request
    @Override
    public AssetRequest updateRequestStatus(Long requestId, String status) {
        AssetRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Convert string to enum; must match PENDING, APPROVED, REJECTED exactly
        request.setStatus(AssetRequest.Status.valueOf(status.toUpperCase()));
        return requestRepository.save(request);
    }
}
