package com.greentin.assetApp.dto;

import com.greentin.assetApp.entity.User;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String department; // optional for creation
    private String password;   // initial password set by Super Admin

    // Location fields for display and assignment
    private Long locationId;    // assigned location id
    private String locationName; // assigned location name

    public UserDto(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.department = user.getDepartment();
        // Intentionally NOT exposing password
        if (user.getAssignedLocation() != null) {
            this.locationId = user.getAssignedLocation().getId();
            this.locationName = user.getAssignedLocation().getName();
        }
    }
}