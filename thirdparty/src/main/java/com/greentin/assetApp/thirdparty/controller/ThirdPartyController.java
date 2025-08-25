package com.greentin.assetApp.thirdparty.controller;

import com.greentin.assetApp.thirdparty.dto.ThirdPartyRequestDto;
import com.greentin.assetApp.thirdparty.service.ThirdPartyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/thirdparty")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")  // allow all origins for testing
public class ThirdPartyController {

    private final ThirdPartyService service;

    // Get all requests
    @GetMapping("/requests")
    public List<ThirdPartyRequestDto> getRequests() {
        return service.getAllRequests();
    }

    // Post a new request
    @PostMapping("/requests")
    public ThirdPartyRequestDto createRequest(@RequestBody ThirdPartyRequestDto dto) {
        return service.addRequest(dto);
    }
}
