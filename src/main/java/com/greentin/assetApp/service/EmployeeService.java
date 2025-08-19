package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.AssetRequestDto;
import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.AssetRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final AssetRequestRepository requestRepository;

    // Create request
    public AssetRequest createRequest(User user, AssetRequestDto dto) {
        AssetRequest request = AssetRequest.builder()
                .assetType(dto.getAssetType())
                .priority(dto.getPriority())
                .justification(dto.getJustification())
                .status(AssetRequest.Status.PENDING)
                .user(user)
                .build();
        return requestRepository.save(request);
    }

    // Get all requests of a user
    public List<AssetRequest> getRequests(User user) {
        return requestRepository.findByUser(user);
    }

    // Update status (optional for admin)
    @Transactional
    public AssetRequest updateRequestStatus(Long requestId, String status) {
        AssetRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        AssetRequest.Status newStatus = AssetRequest.Status.valueOf(status.toUpperCase());
        request.setStatus(newStatus);
        return requestRepository.save(request);
    }
}
