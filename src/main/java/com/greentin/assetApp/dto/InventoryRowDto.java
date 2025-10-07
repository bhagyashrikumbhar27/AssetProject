package com.greentin.assetApp.dto;

import com.greentin.assetApp.entity.AssetStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryRowDto {
    private Long id;
    private String name;
    private String model;
    private int totalQuantity;
    private int available;
    private int issued;
    private AssetStatus status;
}
