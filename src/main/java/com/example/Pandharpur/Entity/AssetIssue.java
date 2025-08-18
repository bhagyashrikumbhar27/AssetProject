package com.example.Pandharpur.Entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
public class AssetIssue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    @Column(length = 2000)
    private String description;

    // PENDING, APPROVED, IN_PROGRESS, RESOLVED, etc.
    private String status = "PENDING";

    @ManyToOne
    private User requester;

    @ManyToOne
    private User approver;   // Admin

    @ManyToOne
    private User resolver;   // Store Manager

    private Integer estimatedDays;
}
