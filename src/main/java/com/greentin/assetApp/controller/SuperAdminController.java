package com.greentin.assetApp.controller;

import com.greentin.assetApp.dto.DepartmentDto;
import com.greentin.assetApp.dto.RoleDto;
import com.greentin.assetApp.dto.StatusUpdateDto;
import com.greentin.assetApp.dto.UserDto;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.service.EmailService;
import com.greentin.assetApp.service.SuperAdminService;
import com.greentin.assetApp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final UserService userService;
    private final EmailService emailService;

    // 🔹 User Management
    @GetMapping("/users")
    public List<UserDto> getAllUsers() {
        return superAdminService.getAllUsers();
    }

    @PostMapping("/users/{id}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestBody StatusUpdateDto statusUpdate) {
        // In a real app, the admin email would come from the security context
        String adminEmail = "admin@example.com"; // Placeholder
        try {
            User updatedUser = userService.updateUserStatus(id, statusUpdate.getStatus(), adminEmail);
            // Notify user
            String subject = "Your account status has been updated";
            String body = "Your account has been " + statusUpdate.getStatus().toLowerCase() + ".";
            emailService.sendEmail(updatedUser.getEmail(), subject, body);
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @PostMapping("/users")
    public UserDto createUser(@RequestBody UserDto userDto) {
        return superAdminService.createUser(userDto);
    }

    @PutMapping("/users/{id}")
    public UserDto updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        return superAdminService.updateUser(id, userDto);
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        superAdminService.deleteUser(id);
    }

    // 🔹 Role Management
    @GetMapping("/roles")
    public List<RoleDto> getAllRoles() {
        return superAdminService.getAllRoles();
    }

    @PostMapping("/roles")
    public RoleDto createRole(@RequestBody RoleDto roleDto) {
        return superAdminService.createRole(roleDto);
    }

    @PutMapping("/roles/{id}")
    public RoleDto updateRole(@PathVariable Long id, @RequestBody RoleDto roleDto) {
        return superAdminService.updateRole(id, roleDto);
    }

    @DeleteMapping("/roles/{id}")
    public void deleteRole(@PathVariable Long id) {
        superAdminService.deleteRole(id);
    }

    // 🔹 Department Management
    @GetMapping("/departments")
    public List<DepartmentDto> getAllDepartments() {
        return superAdminService.getAllDepartments();
    }

    @PostMapping("/departments")
    public DepartmentDto createDepartment(@RequestBody DepartmentDto departmentDto) {
        return superAdminService.createDepartment(departmentDto);
    }

    @PutMapping("/departments/{id}")
    public DepartmentDto updateDepartment(@PathVariable Long id, @RequestBody DepartmentDto departmentDto) {
        return superAdminService.updateDepartment(id, departmentDto);
    }

    @DeleteMapping("/departments/{id}")
    public void deleteDepartment(@PathVariable Long id) {
        superAdminService.deleteDepartment(id);
    }
}
