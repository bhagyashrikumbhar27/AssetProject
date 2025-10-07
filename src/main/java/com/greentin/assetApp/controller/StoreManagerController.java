package com.greentin.assetApp.controller;

import com.greentin.assetApp.dto.*;
import com.greentin.assetApp.service.StoreManagerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/store-manager")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class StoreManagerController {

    private final StoreManagerService service;

    @GetMapping("/stats")
    public StoreStatsDto getStats() {
        return service.getStoreStats();
    }

    @GetMapping("/inventory")
    public List<InventoryRowDto> getInventory() {
        return service.getInventory();
    }

    @PostMapping("/issue")
    public void issueAsset(@RequestBody IssueRequestDto request) {
        service.issueAsset(request);
    }

    @PostMapping("/return")
    public void returnAsset(@RequestBody ReturnRequestDto request) {
        service.returnAsset(request);
    }

    @PostMapping("/add-stock")
    public void addStock(@RequestBody AddStockRequestDto request) {
        service.addStock(request);
    }

    @GetMapping("/transactions")
    public List<TransactionDto> getTransactions() {
        return service.getTransactions();
    }

    @PostMapping("/create-asset")
    public void createAsset(@RequestBody CreateAssetRequestDto request) {
        service.createAsset(request);
    }

    @PostMapping("/transactions/resolve")
    public void resolveTransaction(@RequestBody ResolveTransactionRequestDto request) {
        service.resolveTransaction(request);
    }

    // Locations for Store Manager dashboard
    @GetMapping("/locations")
    public java.util.List<com.greentin.assetApp.entity.Location> getLocations() {
        return service.getLocations();
    }
}
