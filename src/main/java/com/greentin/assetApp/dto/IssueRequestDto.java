package com.greentin.assetApp.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueRequestDto {
    private Long assetId;
    private Long employeeId;
    private Integer quantity;
    private LocalDate issueDate;
    private String notes;
}
