package com.example.Pandharpur.controllers;

import com.example.Pandharpur.Entity.AssetIssue;
import com.example.Pandharpur.services.AssetIssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreManagerController {
    private final AssetIssueService iss;

    @PostMapping("/resolve/{id}/{days}")
    public ResponseEntity<AssetIssue> resolve(@PathVariable Long id, @PathVariable Integer days) {
        return ResponseEntity.ok(iss.resolveAndNotify(id, days));
    }
}
