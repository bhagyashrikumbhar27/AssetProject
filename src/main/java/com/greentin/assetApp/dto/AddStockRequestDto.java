package com.greentin.assetApp.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddStockRequestDto {
    private Long assetId;
    private int quantity;
}
