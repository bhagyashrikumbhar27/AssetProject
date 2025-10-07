package com.greentin.assetApp.repository;

import com.greentin.assetApp.entity.AssetTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetTransactionRepository extends JpaRepository<AssetTransaction, Long> {
    List<AssetTransaction> findByAssetId(Long assetId);
}
