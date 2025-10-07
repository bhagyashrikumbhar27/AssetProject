package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.*;
import java.util.List;

public interface StoreManagerService {

    StoreStatsDto getStoreStats();

    List<InventoryRowDto> getInventory();

    void issueAsset(IssueRequestDto request);

    void returnAsset(ReturnRequestDto request);

    void addStock(AddStockRequestDto request);

    List<TransactionDto> getTransactions();

    void createAsset(CreateAssetRequestDto request);

    // Mark an issued item as resolved/closed with a date
    void resolveTransaction(ResolveTransactionRequestDto request);

    // Dashboard: show all locations for manager context
    java.util.List<com.greentin.assetApp.entity.Location> getLocations();
}
