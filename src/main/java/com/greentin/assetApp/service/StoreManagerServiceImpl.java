package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.*;
import com.greentin.assetApp.entity.*;
import com.greentin.assetApp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.stream.Stream;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoreManagerServiceImpl implements StoreManagerService {

    private final StoreAssetRepository assetRepo;
    private final AssetTransactionRepository txnRepo;
    private final LocationRepository locationRepository;

    @Override
    public StoreStatsDto getStoreStats() {
        List<StoreAsset> assets = assetRepo.findAll();
        int total = assets.size();
        int available = (int) assets.stream().filter(a -> a.getStatus() == AssetStatus.AVAILABLE).count();
        int issued = (int) assets.stream().filter(a -> a.getStatus() == AssetStatus.ISSUED).count();
        int lowStock = (int) assets.stream().filter(a -> a.getStatus() == AssetStatus.LOW_STOCK).count();

        return StoreStatsDto.builder()
                .totalAssets(total)
                .availableAssets(available)
                .issuedAssets(issued)
                .lowStockAssets(lowStock)
                .build();
    }

    @Override
    public List<InventoryRowDto> getInventory() {
        return assetRepo.findAll()
                .stream()
                .map(a -> InventoryRowDto.builder()
                        .id(a.getId())
                        .name(a.getName())
                        .model(a.getModel())
                        .totalQuantity(a.getQuantity())
                        .available(a.getStatus() == AssetStatus.AVAILABLE ? a.getQuantity() : 0)
                        .issued(a.getStatus() == AssetStatus.ISSUED ? a.getQuantity() : 0)
                        .status(a.getStatus())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public void issueAsset(IssueRequestDto request) {
        StoreAsset asset = assetRepo.findById(request.getAssetId())
                .orElseThrow(() -> new RuntimeException("Asset not found"));

        asset.setStatus(AssetStatus.ISSUED);
        assetRepo.save(asset);

        AssetTransaction txn = AssetTransaction.builder()
                .assetId(request.getAssetId())
                .employeeId(request.getEmployeeId())
                .txnType(TxnType.ISSUE)
                .txnDate(LocalDateTime.now())
                .notes(request.getNotes())
                .build();
        txnRepo.save(txn);
    }

    @Override
    public void returnAsset(ReturnRequestDto request) {
        StoreAsset asset = assetRepo.findById(request.getAssetId())
                .orElseThrow(() -> new RuntimeException("Asset not found"));

        asset.setStatus(AssetStatus.AVAILABLE);
        assetRepo.save(asset);

        AssetTransaction txn = AssetTransaction.builder()
                .assetId(request.getAssetId())
                .employeeId(request.getEmployeeId())
                .txnType(TxnType.RETURN)
                .txnDate(LocalDateTime.now())
                .notes(request.getNotes())
                .build();
        txnRepo.save(txn);
    }

    @Override
    public void addStock(AddStockRequestDto request) {
        StoreAsset asset = assetRepo.findById(request.getAssetId())
                .orElseThrow(() -> new RuntimeException("Asset not found"));

        asset.setQuantity(asset.getQuantity() + request.getQuantity());
        asset.setStatus(asset.getQuantity() < 5 ? AssetStatus.LOW_STOCK : AssetStatus.AVAILABLE);
        assetRepo.save(asset);

        AssetTransaction txn = AssetTransaction.builder()
                .assetId(request.getAssetId())
                .txnType(TxnType.ADD_STOCK)
                .txnDate(LocalDateTime.now())
                .notes("Added " + request.getQuantity() + " items")
                .build();
        txnRepo.save(txn);
    }

    @Override
    public List<TransactionDto> getTransactions() {
        return txnRepo.findAll()
                .stream()
                .map(t -> TransactionDto.builder()
                        .id(t.getId())
                        .assetId(t.getAssetId())
                        .employeeId(t.getEmployeeId())
                        .txnType(t.getTxnType())
                        .txnDate(t.getTxnDate())
                        .notes(t.getNotes())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public void createAsset(CreateAssetRequestDto request) {
        StoreAsset asset = StoreAsset.builder()
                .name(request.getName())
                .model(request.getModel())
                .quantity(request.getQuantity())
                .status(request.getQuantity() < 5 ? AssetStatus.LOW_STOCK : AssetStatus.AVAILABLE)
                .build();
        assetRepo.save(asset);
    }

    @Override
    public List<Location> getLocations() {
        return locationRepository.findAll();
    }
}
