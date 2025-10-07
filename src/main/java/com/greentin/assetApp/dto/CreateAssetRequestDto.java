package com.greentin.assetApp.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAssetRequestDto {
    private String name;
    private String model;
    private int quantity;
}
