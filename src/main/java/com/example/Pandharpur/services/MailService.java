package com.example.Pandharpur.services;

import com.example.Pandharpur.Entity.AssetIssue;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender sender;

    @Value("${spring.mail.username}")
    private String from;

    public void sendCredentials(String to, String rawPwd){
        SimpleMailMessage m = new SimpleMailMessage();
        m.setFrom(from); m.setTo(to);
        m.setSubject("Your account credentials");
        m.setText("Welcome! \nUsername: "+to+"\nPassword: "+rawPwd);
        sender.send(m);
    }

    public void notifyEta(AssetIssue ai){
        SimpleMailMessage m = new SimpleMailMessage();
        m.setFrom(from); m.setTo(ai.getRequester().getEmail());
        m.setSubject("Asset issue ETA");
        m.setText("Your ticket '"+ai.getTitle()+"' will be resolved in "+ai.getEstimatedDays()+" day(s).");
        sender.send(m);
    }
}
