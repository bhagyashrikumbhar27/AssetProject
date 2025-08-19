package com.greentin.assetApp.repository;

import com.greentin.assetApp.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByDepartment(String department);
}
