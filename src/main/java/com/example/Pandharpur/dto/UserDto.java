package com.example.Pandharpur.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserDto {
    @Email @NotBlank
    private String email;
    @NotBlank
    private String password;

    private String firstName;
    private String lastName;

    private Long departmentId;
    private Long locationId;
}
