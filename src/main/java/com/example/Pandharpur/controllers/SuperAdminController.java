package com.example.Pandharpur.controllers;

import com.example.Pandharpur.Entity.Department;
import com.example.Pandharpur.Entity.Location;
import com.example.Pandharpur.Entity.Role;
import com.example.Pandharpur.Entity.User;
import com.example.Pandharpur.dto.UserDto;
import com.example.Pandharpur.repository.DepartmentRepo;
import com.example.Pandharpur.repository.LocationRepo;
import com.example.Pandharpur.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/super")
@RequiredArgsConstructor
public class SuperAdminController {

    private final UserService us;
    private final LocationRepo locRepo;
    private final DepartmentRepo deptRepo;

    @PostMapping("/location")
    public Location addLocation(@RequestBody Location l) { return locRepo.save(l); }

    @PostMapping("/department")
    public Department addDepartment(@RequestBody Department d) { return deptRepo.save(d); }

    @PostMapping("/admin")
    public User createAdmin(@RequestBody UserDto dto) { return us.create(dto, Role.ADMIN); }

    @PostMapping("/store-manager")
    public User createStoreManager(@RequestBody UserDto dto) { return us.create(dto, Role.STORE_MANAGER); }


}
