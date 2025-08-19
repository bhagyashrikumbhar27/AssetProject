package com.greentin.assetApp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.greentin.assetApp")
public class AssetAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(AssetAppApplication.class, args);
    }
}
