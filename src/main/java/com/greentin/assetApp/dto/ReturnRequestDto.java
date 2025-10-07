package com.greentin.assetApp.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequestDto {
    private Long assetId;
    private Long employeeId;
    private LocalDate returnDate;
    private String notes;
}
