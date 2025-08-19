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
}
