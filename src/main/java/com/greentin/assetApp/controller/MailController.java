package com.greentin.assetApp.controller;

import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.AssetRequestRepository;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class MailController {

    private final EmailService emailService;
    private final UserRepository userRepository;
    private final AssetRequestRepository requestRepository;

    /**
     * Test sending welcome email to a user
     */
    @PostMapping("/test-registration/{userId}")
    public ResponseEntity<String> testRegistrationEmail(@PathVariable Long userId) {
        if (!emailService.isEmailConfigured()) {
            return ResponseEntity.status(400)
                    .body("❌ Email is not configured. Please set MAIL_USERNAME and MAIL_PASSWORD in .env file");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        emailService.sendRegistrationNotification(user);
        return ResponseEntity.ok("✅ Welcome email sent successfully to user: " + user.getEmail());
    }

    /**
     * Test sending asset request status notification
     */
    @PostMapping("/test-request-status/{requestId}")
    public ResponseEntity<String> testRequestStatusEmail(
            @PathVariable Long requestId,
            @RequestParam(required = false) String status) {

        if (!emailService.isEmailConfigured()) {
            return ResponseEntity.status(400)
                    .body("❌ Email is not configured. Please set MAIL_USERNAME and MAIL_PASSWORD in .env file");
        }

        AssetRequest request = requestRepository.findByIdWithUser(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found with ID: " + requestId));

        String effectiveStatus = (status == null || status.isBlank())
                ? (request.getStatus() == null ? "UPDATED" : request.getStatus().name())
                : status.toUpperCase();

        // Validate against enum if provided
        if (status != null && !status.isBlank()) {
            try {
                AssetRequest.Status.valueOf(effectiveStatus);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest()
                        .body("Invalid status: " + status + ". Allowed: PENDING, APPROVED, REJECTED");
            }
        }

        emailService.sendRequestStatusNotification(request, effectiveStatus);
        return ResponseEntity.ok("✅ Request status notification sent successfully to employee: " + request.getUser().getEmail());
    }

    /**
     * Send decision email to employee for a request (used by frontend)
     */
    @PostMapping("/send-request-decision")
    public ResponseEntity<String> sendRequestDecision(
            @RequestParam(required = false) Long requestId,
            @RequestParam(required = false) String status,
            @RequestBody(required = false) Map<String, Object> body) {

        if ((requestId == null || status == null) && body != null) {
            Object idVal = body.get("requestId");
            Object statusVal = body.get("status");
            if (idVal != null && requestId == null) requestId = Long.valueOf(idVal.toString());
            if (statusVal != null && status == null) status = statusVal.toString();
        }

        if (requestId == null || status == null) {
            return ResponseEntity.badRequest().body("Missing requestId or status");
        }

        if (!emailService.isEmailConfigured()) {
            return ResponseEntity.status(400)
                    .body("❌ Email is not configured. Please set MAIL_USERNAME and MAIL_PASSWORD in .env file");
        }

        final Long finalRequestId = requestId; // Make effectively final for lambda
        AssetRequest request = requestRepository.findByIdWithUser(finalRequestId)
                .orElseThrow(() -> new RuntimeException("Request not found with ID: " + finalRequestId));

        emailService.sendRequestStatusNotification(request, status.toUpperCase());
        return ResponseEntity.ok("✅ Decision email sent successfully to: " + request.getUser().getEmail());
    }

    /**
     * Debug endpoint: List all requests with user details
     */
    @GetMapping("/debug-requests")
    public ResponseEntity<?> debugRequests() {
        return ResponseEntity.ok(
                requestRepository.findAll().stream()
                        .map(request -> String.format(
                                "Request ID: %d, User: %s (%s), Asset: %s, Status: %s",
                                request.getId(),
                                request.getUser().getName(),
                                request.getUser().getEmail(),
                                request.getAssetType(),
                                request.getStatus()
                        ))
                        .toList()
        );
    }

    /**
     * Test email configuration endpoint
     */
    @GetMapping("/test-config")
    public ResponseEntity<Map<String, Object>> testEmailConfiguration() {
        Map<String, Object> result = new HashMap<>();
        boolean isConfigured = emailService.isEmailConfigured();

        result.put("emailConfigured", isConfigured);
        result.put("smtpHost", "smtp.gmail.com");
        result.put("smtpPort", 587);
        result.put("status", isConfigured ? "✅ Email is properly configured" : "⚠️ Email is NOT configured");
        result.put("message", isConfigured ? "Email notifications will be sent" : "Email notifications will be skipped");
        result.put("solution", isConfigured ? "" : "Please set MAIL_USERNAME and MAIL_PASSWORD in .env file");

        // Also log config to console
        emailService.testEmailConfiguration();

        return ResponseEntity.ok(result);
    }

    /**
     * Simple test endpoint to send a test email
     */
    @PostMapping("/test-simple")
    public ResponseEntity<String> testSimpleEmail(@RequestParam String to) {
        try {
            emailService.sendSimpleTestEmail(to);
            return ResponseEntity.ok("✅ Test email sent successfully to: " + to);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Failed to send email: " + e.getMessage());
        }
    }
}
