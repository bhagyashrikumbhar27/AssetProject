package com.greentin.assetApp;

import com.greentin.assetApp.config.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.greentin.assetApp")
public class AssetAppApplication {

    @Value("${app.security.jwt.secret}")
    private String jwtSecret;

    @Value("${app.security.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.security.jwt.allowed-skew-seconds:120}")
    private long jwtAllowedSkewSeconds;

    public static void main(String[] args) {
        // spring-dotenv auto-loads .env on the classpath; no manual code needed
        SpringApplication.run(AssetAppApplication.class, args);
    }

    @Bean
    public Object initJwt() {
        JwtUtil.configure(jwtSecret, jwtExpirationMs);
        JwtUtil.setAllowedSkewSeconds(jwtAllowedSkewSeconds);
        return new Object();
    }
}
