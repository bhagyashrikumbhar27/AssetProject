package com.greentin.assetApp.service;

import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${spring.mail.username}")
    private String smtpUsername;

    @Value("${spring.mail.password}")
    private String smtpPassword;

    @Value("${app.email.admin:}")
    private String adminEmail;

    private String getFromAddress() {
        return (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : smtpUsername;
    }

    public boolean isEmailConfigured() {
        return smtpUsername != null && !smtpUsername.isBlank() &&
                smtpPassword != null && !smtpPassword.isBlank();
    }

    // -------------------- Registration --------------------
    public void sendRegistrationNotification(User newUser) {
        if (!isEmailConfigured()) return;
        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper =
                    new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, false, "UTF-8");

            helper.setFrom(getFromAddress());
            helper.setTo(newUser.getEmail());
            helper.setSubject("Welcome to Asset Management System");

            // HTML Template
            String htmlContent = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 50px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                    h2 { color: #333; }
                    p { color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    td { padding: 8px 10px; border-bottom: 1px solid #eee; }
                    td.label { font-weight: bold; color: #555; width: 35%; }
                </style>
                </head>
                <body>
                <div class="container">
                    <h2>Welcome to Asset Management System</h2>
                    <p>Dear %s,</p>
                    <p>Your registration is successful. Below are your details:</p>
                    <table>
                        <tr><td class="label">Name</td><td>%s</td></tr>
                        <tr><td class="label">Email</td><td>%s</td></tr>
                        <tr><td class="label">Role</td><td>%s</td></tr>
                        <tr><td class="label">Department</td><td>%s</td></tr>
                        <tr><td class="label">Date</td><td>%s</td></tr>
                    </table>
                    <p>You can now log in and start using the system.</p>
                    <p>Best regards,<br/>Asset Management System</p>
                </div>
                </body>
                </html>
                """.formatted(newUser.getName(), newUser.getName(), newUser.getEmail(),
                    newUser.getRole(), newUser.getDepartment(), java.time.LocalDateTime.now());

            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("✅ Registration email sent to {}", newUser.getEmail());

        } catch (Exception e) {
            log.error("Failed to send registration email", e);
        }
    }

    // -------------------- Asset Request Status --------------------
    public void sendRequestStatusNotification(AssetRequest request, String status) {
        if (!isEmailConfigured()) return;
        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper =
                    new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, false, "UTF-8");

            helper.setFrom(getFromAddress());
            helper.setTo(request.getUser().getEmail());
            helper.setSubject("Asset Request " + status + " - #" + request.getId());

            String bannerColor = switch (status.toUpperCase()) {
                case "APPROVED" -> "#28a745";
                case "REJECTED" -> "#dc3545";
                default -> "#007bff";
            };

            // HTML Template
            String htmlContent = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Request Status</title>
                <style>
                    body { font-family: Arial; background:#f4f4f4; margin:0; padding:0; }
                    .container { max-width:600px; margin:50px auto; background:#fff; padding:30px; border-radius:8px; }
                    h2 { color:#333; }
                    .badge { padding:6px 10px; color:#fff; background-color:%s; border-radius:4px; }
                    table { width:100%%; border-collapse:collapse; margin-top:15px; }
                    td { padding:8px 10px; border-bottom:1px solid #eee; }
                    td.label { font-weight:bold; width:35%%; color:#555; }
                </style>
                </head>
                <body>
                <div class="container">
                    <h2>Asset Request <span class="badge">%s</span></h2>
                    <p>Dear %s,</p>
                    <p>Your asset request status has been updated.</p>
                    <table>
                        <tr><td class="label">Request ID</td><td>%d</td></tr>
                        <tr><td class="label">Asset Type</td><td>%s</td></tr>
                        <tr><td class="label">Priority</td><td>%s</td></tr>
                        <tr><td class="label">Justification</td><td>%s</td></tr>
                    </table>
                    <p>Best regards,<br/>Asset Management System</p>
                </div>
                </body>
                </html>
                """.formatted(bannerColor, status.toUpperCase(), request.getUser().getName(),
                    request.getId(), request.getAssetType(), request.getPriority(),
                    request.getJustification());

            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);

            log.info("✅ Request status email sent to {}", request.getUser().getEmail());

        } catch (Exception e) {
            log.error("Failed to send request status email", e);
        }
    }

    // -------------------- Password Reset --------------------
    public void sendPasswordResetLink(User user, String resetLink) {
        if (!isEmailConfigured()) return;
        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper =
                    new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, false, "UTF-8");

            helper.setFrom(getFromAddress());
            helper.setTo(user.getEmail());
            helper.setSubject("Password Reset Request");

            String htmlContent = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
                <style>
                    body { font-family: Arial; background:#f4f4f4; margin:0; padding:0; }
                    .container { max-width:600px; margin:50px auto; background:#fff; padding:30px; border-radius:8px; }
                    h2 { color:#333; }
                    a.button { padding:12px 20px; color:#fff; background:#007bff; text-decoration:none; border-radius:5px; }
                    a.button:hover { background:#0056b3; }
                </style>
                </head>
                <body>
                <div class="container">
                    <h2>Password Reset Request</h2>
                    <p>Dear %s,</p>
                    <p>Click the button below to reset your password:</p>
                    <a class="button" href="%s">Reset Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
                </body>
                </html>
                """.formatted(user.getName(), resetLink);

            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);

            log.info("✅ Password reset email sent to {}", user.getEmail());

        } catch (Exception e) {
            log.error("Failed to send password reset email", e);
        }
    }

    public void notifyAdminOnLogin(User user) {
    }

    public void sendPasswordResetNotification(User user) {
    }

    public void testEmailConfiguration() {
        log.info("=== Email Configuration Test ===");
        log.info("SMTP Host: smtp.gmail.com");
        log.info("SMTP Port: 587");
        log.info("SMTP Username: {}", smtpUsername != null && !smtpUsername.isBlank() ? smtpUsername : "NOT SET");
        log.info("SMTP Password: {}", smtpPassword != null && !smtpPassword.isBlank() ? "SET (hidden)" : "NOT SET");
        log.info("From Email: {}", getFromAddress());
        log.info("Admin Email: {}", adminEmail != null && !adminEmail.isBlank() ? adminEmail : "NOT SET");
        log.info("Email Configured: {}", isEmailConfigured() ? "✅ YES" : "❌ NO");
        log.info("================================");
    }

    public void sendSimpleTestEmail(String to) {
        if (!isEmailConfigured()) {
            log.warn("Email not configured. Skipping test email to {}", to);
            return;
        }
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(getFromAddress());
            message.setTo(to);
            message.setSubject("Test Email from Asset Management System");
            message.setText("This is a test email to verify email configuration is working properly.\n\n" +
                          "If you received this email, the email service is configured correctly.\n\n" +
                          "Best regards,\nAsset Management System");
            
            mailSender.send(message);
            log.info("✅ Test email sent successfully to {}", to);
            
        } catch (Exception e) {
            log.error("❌ Failed to send test email to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send test email: " + e.getMessage());
        }
    }
}
