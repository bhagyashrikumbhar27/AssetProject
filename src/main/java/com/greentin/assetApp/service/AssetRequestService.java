package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.AssetRequestDto;
import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;

import java.util.List;

public interface AssetRequestService {

    // Create a new request
    AssetRequest createRequest(User user, AssetRequestDto dto);

    // Get all requests of a user
    List<AssetRequest> getRequests(User user);

    // Update the status of a request (PENDING, APPROVED, REJECTED)
    AssetRequest updateRequestStatus(Long requestId, String status);
}
