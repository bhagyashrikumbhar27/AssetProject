package com.greentin.assetApp.dto;

import com.greentin.assetApp.entity.AssetRequest;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AssetRequestDto {

    private Long id;
    private String assetType;
    private String priority;
    private String justification;
    private String status;

    // Constructor to map Entity -> DTO
    public AssetRequestDto(AssetRequest request) {
        this.id = request.getId();
        this.assetType = request.getAssetType();
        this.priority = request.getPriority();
        this.justification = request.getJustification();
        this.status = request.getStatus().name(); // ensure uppercase
    }
}
