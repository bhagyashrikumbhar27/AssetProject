package com.greentin.assetApp.entity;

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

    public void setRole(String role) {
        if (role != null) {
            this.role = role.toUpperCase(); // Force uppercase
        }
    }
}