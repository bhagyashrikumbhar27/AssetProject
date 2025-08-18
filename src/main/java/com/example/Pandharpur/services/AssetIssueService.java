package com.example.Pandharpur.services;

import com.example.Pandharpur.Entity.AssetIssue;
import com.example.Pandharpur.Entity.User;
import com.example.Pandharpur.dto.IssueDto;
import com.example.Pandharpur.repository.AssetIssueRepo;
import com.example.Pandharpur.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetIssueService {
    private final AssetIssueRepo repo;
    private final UserRepo users;
    private final MailService mail;

    public AssetIssue create(IssueDto d){
        User requester = users.findByEmail(d.requesterEmail()).orElseThrow();
        AssetIssue ai = new AssetIssue();
        ai.setTitle(d.title());
        ai.setDescription(d.description());
        ai.setStatus("PENDING");
        ai.setRequester(requester);
        return repo.save(ai);
    }

    public AssetIssue approve(Long id){
        AssetIssue ai = repo.findById(id).orElseThrow();
        ai.setStatus("APPROVED");
        ai.setApprover(currentUser());
        return repo.save(ai);
    }

    public AssetIssue resolveAndNotify(Long id, Integer days){
        AssetIssue ai = repo.findById(id).orElseThrow();
        ai.setStatus("IN_PROGRESS");
        ai.setResolver(currentUser());
        ai.setEstimatedDays(days);
        mail.notifyEta(ai);
        return repo.save(ai);
    }

    private User currentUser(){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return users.findByEmail(email).orElseThrow();
    }

    public List<AssetIssue> forUser(String email){
        return repo.findAll().stream()
                .filter(i -> i.getRequester().getEmail().equals(email))
                .toList();
    }
}
