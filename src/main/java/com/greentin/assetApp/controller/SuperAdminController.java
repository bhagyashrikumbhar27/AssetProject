package com.greentin.assetApp.controller;

import com.greentin.assetApp.dto.UserDto;
import com.greentin.assetApp.dto.RoleDto;
import com.greentin.assetApp.dto.DepartmentDto;
import com.greentin.assetApp.service.SuperAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    // 🔹 User Management
    @GetMapping("/users")
    public List<UserDto> getAllUsers() {
        return superAdminService.getAllUsers();
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

    // 🔹 Locations (visible in Super Admin dashboard)
    @GetMapping("/locations")
    public List<com.greentin.assetApp.entity.Location> getAllLocations() {
        return superAdminService.getAllLocations();
    }
}
