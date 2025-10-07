package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.AssetRequestDto;
import com.greentin.assetApp.entity.*;
import com.greentin.assetApp.repository.AssetRepository;
import com.greentin.assetApp.repository.AssetRequestRepository;
import com.greentin.assetApp.repository.AssetTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetRequestServiceImpl implements AssetRequestService {

    private final AssetRequestRepository requestRepository;
    private final AssetRepository assetRepository;
    private final AssetTransactionRepository transactionRepository;
    private final EmailService emailService;

    @Override
    public AssetRequest createRequest(User user, AssetRequestDto dto) {
        AssetRequest.Status status = AssetRequest.Status.PENDING;

        if (dto.getStatus() != null && !dto.getStatus().isEmpty()) {
            try {
                status = AssetRequest.Status.valueOf(dto.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                status = AssetRequest.Status.PENDING;
            }
        }

        AssetRequest request = AssetRequest.builder()
                .assetType(dto.getAssetType())
                .priority(dto.getPriority())
                .justification(dto.getJustification())
                .status(status)
                .user(user)
                .build();

        return requestRepository.save(request);
    }

    @Override
    public List<AssetRequest> getRequests(User user) {
        return requestRepository.findByUser(user);
    }

    @Override
    public AssetRequest updateRequestStatus(Long requestId, String status) {
        AssetRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        AssetRequest.Status newStatus = AssetRequest.Status.valueOf(status.toUpperCase());
        request.setStatus(newStatus);

        AssetRequest updatedRequest = requestRepository.save(request);

        if (newStatus == AssetRequest.Status.APPROVED) {
            Asset asset = assetRepository.findByTypeAndStatus(request.getAssetType(), "AVAILABLE")
                    .orElseGet(() -> {
                        Asset newAsset = new Asset();
                        newAsset.setName(request.getAssetType() + " Auto");
                        newAsset.setType(request.getAssetType());
                        newAsset.setStatus("AVAILABLE");
                        return assetRepository.save(newAsset);
                    });

            AssetTransaction txn = AssetTransaction.builder()
                    .assetId(asset.getId())
                    .employeeId(request.getUser().getId())
                    .txnType(TxnType.ISSUE)
                    .notes("Auto-issued after approval")
                    .txnDate(LocalDateTime.now())
                    .build();

            transactionRepository.save(txn);
        }

        try {
            emailService.sendRequestStatusNotification(updatedRequest, status.toUpperCase());
        } catch (Exception e) {
            System.out.println("❌ Failed to send email: " + e.getMessage());
        }

        return updatedRequest;
    }
}
