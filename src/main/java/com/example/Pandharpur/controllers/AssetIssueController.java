package com.example.Pandharpur.controllers;

import com.example.Pandharpur.Entity.AssetIssue;
import com.example.Pandharpur.dto.IssueDto;
import com.example.Pandharpur.services.AssetIssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class AssetIssueController {
    private final AssetIssueService iss;

    @PostMapping
    public AssetIssue submit(@RequestBody IssueDto dto) {
        return iss.create(dto);
    }

    @GetMapping
    public List<AssetIssue> mine(Authentication a) {
        return iss.forUser(a.getName());
    }
}
