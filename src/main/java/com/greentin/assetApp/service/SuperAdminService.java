package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.UserDto;
import com.greentin.assetApp.dto.RoleDto;
import com.greentin.assetApp.dto.DepartmentDto;

import java.util.List;

public interface SuperAdminService {
    // 🔹 Users
    List<UserDto> getAllUsers();
    UserDto createUser(UserDto userDto);
    UserDto updateUser(Long id, UserDto userDto);
    void deleteUser(Long id);

    // 🔹 Roles
    List<RoleDto> getAllRoles();
    RoleDto createRole(RoleDto roleDto);
    RoleDto updateRole(Long id, RoleDto roleDto);
    void deleteRole(Long id);

    // 🔹 Departments
    List<DepartmentDto> getAllDepartments();
    DepartmentDto createDepartment(DepartmentDto departmentDto);
    DepartmentDto updateDepartment(Long id, DepartmentDto departmentDto);
    void deleteDepartment(Long id);
}
