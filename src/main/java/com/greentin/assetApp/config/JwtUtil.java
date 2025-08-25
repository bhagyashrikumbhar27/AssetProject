package com.greentin.assetApp.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

public class JwtUtil {

    private static String SECRET;
    private static long EXPIRATION_MS;

    public static void configure(String base64Secret, long expirationMs) {
        SECRET = base64Secret;
        EXPIRATION_MS = expirationMs;
    }

    private static SecretKey getSigningKey() {
        if (SECRET == null || SECRET.isBlank()) {
            throw new IllegalStateException("JWT secret is not configured");
        }
        byte[] keyBytes;
        String sec = SECRET.trim();
        // Heuristic: choose decoder without throwing
        boolean looksBase64Url = sec.matches("[A-Za-z0-9_-]+={0,2}") && (sec.contains("-") || sec.contains("_"));
        boolean looksBase64 = sec.matches("[A-Za-z0-9+/]+={0,2}");
        try {
            if (looksBase64Url) {
                keyBytes = Decoders.BASE64URL.decode(sec);
            } else if (looksBase64) {
                keyBytes = Decoders.BASE64.decode(sec);
            } else {
                // Not Base64/URL-safe: treat as raw
                keyBytes = sec.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (RuntimeException ex) {
            // Fallback chain if heuristic misclassified
            try {
                keyBytes = Decoders.BASE64.decode(sec);
            } catch (RuntimeException ex2) {
                try {
                    keyBytes = Decoders.BASE64URL.decode(sec);
                } catch (RuntimeException ex3) {
                    keyBytes = sec.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                }
            }
        }
        if (keyBytes.length < 32) {
            // HS256 needs at least 256-bit (32 bytes) key
            throw new IllegalStateException("JWT secret key too short; provide a 256-bit key (32+ bytes) or a Base64/Base64URL string");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public static String generateToken(String subject, Map<String, Object> claims) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + EXPIRATION_MS);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public static Claims parse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}