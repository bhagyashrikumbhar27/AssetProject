package com.greentin.assetApp.dto;

import com.greentin.assetApp.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleDto {
    private Long id;
    private String name;
    private String description;

    // ✅ Constructor to map entity → DTO
    public RoleDto(Role role) {
        this.id = role.getId();
        this.name = role.getName();
        this.description = role.getDescription();
    }

    // ✅ Static mapper
    public static RoleDto fromEntity(Role role) {
        return new RoleDto(role);
    }
}
