package com.greentin.assetApp.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResolveTransactionRequestDto {
    private Long transactionId;       // ID of AssetTransaction to resolve
    private LocalDateTime resolvedDate; // Date/time when issue was fixed/closed
    private String notes;             // Optional note
}