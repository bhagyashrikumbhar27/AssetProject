package com.greentin.assetApp.repository;

import com.greentin.assetApp.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByDepartment(String department);

    Optional<Asset> findByTypeAndStatus(String assetType, String available);
}
