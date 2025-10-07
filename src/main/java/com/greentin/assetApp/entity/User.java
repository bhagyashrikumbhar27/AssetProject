package com.greentin.assetApp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    private String department;

    private String role;

    // The primary assigned location for the employee (optional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_location_id")
    @JsonIgnore // avoid lazy proxy serialization issues on endpoints that return User
    private Location assignedLocation;

    public void setRole(String role) {
        if (role != null) {
            this.role = role.toUpperCase(); // Force uppercase
        }
    }
}