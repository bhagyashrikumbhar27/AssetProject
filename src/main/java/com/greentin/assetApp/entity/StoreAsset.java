package com.greentin.assetApp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "store_assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String model;
    private int quantity;

    @Enumerated(EnumType.STRING)
    private AssetStatus status;
}
