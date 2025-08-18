package com.example.Pandharpur.controllers;

import com.example.Pandharpur.config.JwtService;
import com.example.Pandharpur.dto.AuthRequest;
import com.example.Pandharpur.dto.AuthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest req) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        String token = jwtService.generate((UserDetails) auth.getPrincipal());
        long exp = Instant.now().plus(Duration.ofHours(8)).toEpochMilli();
        return new AuthResponse(token, exp);
    }
}
