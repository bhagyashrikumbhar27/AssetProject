package com.greentin.assetApp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long assetId;
    private Long employeeId;

    @Enumerated(EnumType.STRING)
    private TxnType txnType;   // ✅ uses the global enum

    private LocalDateTime txnDate;

    private String notes;
}


