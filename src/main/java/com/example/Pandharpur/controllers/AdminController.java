package com.example.Pandharpur.controllers;

import com.example.Pandharpur.Entity.AssetIssue;
import com.example.Pandharpur.Entity.Department;
import com.example.Pandharpur.Entity.Role;
import com.example.Pandharpur.Entity.User;
import com.example.Pandharpur.dto.UserDto;
import com.example.Pandharpur.repository.DepartmentRepo;
import com.example.Pandharpur.repository.UserRepo;
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
    private final UserRepo userRepo;
    @PostMapping("/user")
    public ResponseEntity<User> addUser(@RequestBody UserDto dto) {
        return ResponseEntity.ok(us.create(dto, Role.USER));
    }

    @DeleteMapping("/user/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/department")
    public Department addDepartment(@RequestBody Department d) {
        return deptRepo.save(d);
    }


    @DeleteMapping("/department/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        if (!deptRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        deptRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }



    @PostMapping("/approve/{id}")
    public ResponseEntity<AssetIssue> approve(@PathVariable Long id) {
        return ResponseEntity.ok(iss.approve(id));
    }
}
