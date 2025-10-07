package com.greentin.assetApp.dto;

import com.greentin.assetApp.entity.Department;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentDto {
    private Long id;
    private String name;
    private String description;

    // ✅ Constructor to map entity → DTO
    public DepartmentDto(Department department) {
        this.id = department.getId();
        this.name = department.getName();
        this.description = department.getDescription();
    }

    // ✅ Static mapper
    public static DepartmentDto fromEntity(Department department) {
        return new DepartmentDto(department);
    }
}
