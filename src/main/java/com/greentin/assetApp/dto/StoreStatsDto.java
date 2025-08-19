package com.greentin.assetApp.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreStatsDto {
    private int totalAssets;
    private int availableAssets;
    private int issuedAssets;
    private int lowStockAssets;
}
