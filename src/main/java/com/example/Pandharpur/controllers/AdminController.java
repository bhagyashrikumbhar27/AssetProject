package com.example.Pandharpur.controllers;

import com.example.Pandharpur.Entity.AssetIssue;
import com.example.Pandharpur.Entity.Department;
import com.example.Pandharpur.Entity.Role;
import com.example.Pandharpur.Entity.User;
import com.example.Pandharpur.dto.UserDto;
import com.example.Pandharpur.repository.DepartmentRepo;
import com.example.Pandharpur.services.AssetIssueService;
import com.example.Pandharpur.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final UserService us;
    private final AssetIssueService iss;
    private final DepartmentRepo deptRepo;
    @PostMapping("/user")
    public ResponseEntity<User> addUser(@RequestBody UserDto dto) {
        return ResponseEntity.ok(us.create(dto, Role.USER));
    }

    @PostMapping("/department")
    public Department addDepartment(@RequestBody Department d) {
        return deptRepo.save(d);
    }


    @PostMapping("/approve/{id}")
    public ResponseEntity<AssetIssue> approve(@PathVariable Long id) {
        return ResponseEntity.ok(iss.approve(id));
    }
}
