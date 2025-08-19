package com.greentin.assetApp.repository;

import com.greentin.assetApp.entity.StoreAsset;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreAssetRepository extends JpaRepository<StoreAsset, Long> {
}
