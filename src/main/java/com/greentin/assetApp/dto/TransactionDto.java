package com.greentin.assetApp.dto;

import com.greentin.assetApp.entity.TxnType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionDto {
    private Long id;
    private Long assetId;
    private Long employeeId;
    private TxnType txnType;
    private LocalDateTime txnDate;
    private String notes;

    // Enriched fields for UI cards
    private Long locationId;      // employee's assigned location id
    private String locationName;  // employee's assigned location name
}
