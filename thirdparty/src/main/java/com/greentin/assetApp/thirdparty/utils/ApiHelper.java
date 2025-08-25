package com.greentin.assetApp.thirdparty.utils;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ApiHelper {

    private final RestTemplate restTemplate = new RestTemplate();

    public <T> T get(String url, Class<T> responseType) {
        return restTemplate.getForObject(url, responseType);
    }

    public <T> T post(String url, Object request, Class<T> responseType) {
        return restTemplate.postForObject(url, request, responseType);
    }
}
