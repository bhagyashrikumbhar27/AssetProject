package com.greentin.assetApp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;   // e.g., "SUPER_ADMIN", "DEPARTMENT_ADMIN"
    private String description;

    // ✅ Centralized role names
    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN";
    public static final String EMPLOYEE = "EMPLOYEE";
}
