package com.greentin.assetApp.thirdparty.service;

import com.greentin.assetApp.thirdparty.dto.ThirdPartyRequestDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ThirdPartyService {

    private final List<ThirdPartyRequestDto> requests = new ArrayList<>();

    public List<ThirdPartyRequestDto> getAllRequests() {
        return requests;
    }

    public ThirdPartyRequestDto addRequest(ThirdPartyRequestDto dto) {
        requests.add(dto);
        return dto;
    }
}
