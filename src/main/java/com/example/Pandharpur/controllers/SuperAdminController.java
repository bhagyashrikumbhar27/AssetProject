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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/super")
@RequiredArgsConstructor
public class SuperAdminController {

    private final UserService us;
    private final LocationRepo locRepo;
    private final DepartmentRepo deptRepo;

    @PostMapping("/location")
    public Location addLocation(@RequestBody Location l) { return locRepo.save(l); }

    @DeleteMapping("/location/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        if (!locRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        locRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/department")
    public Department addDepartment(@RequestBody Department d) { return deptRepo.save(d); }

    @DeleteMapping("/department/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        if (!deptRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        deptRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }




    @PostMapping("/admin")
    public User createAdmin(@RequestBody UserDto dto) { return us.create(dto, Role.ADMIN); }

    @DeleteMapping(value = "/admin", params = "email")
    public ResponseEntity<Void> deleteAdminByEmail(@RequestParam String email) {
        Optional<User> userOpt = us.findByEmail(email);
        if (userOpt.isEmpty() || userOpt.get().getRole() != Role.ADMIN) {
            return ResponseEntity.notFound().build();
        }
        us.delete(userOpt.get());
        return ResponseEntity.noContent().build();
    }



    @PostMapping("/store-manager")
    public User createStoreManager(@RequestBody UserDto dto) { return us.create(dto, Role.STORE_MANAGER); }

    @DeleteMapping(value = "/store-manager", params = "email")
    public ResponseEntity<Void> deleteStoreManagerByEmail(@RequestParam String email) {
        Optional<User> userOpt = us.findByEmail(email);
        if (userOpt.isEmpty() || userOpt.get().getRole() != Role.STORE_MANAGER) {
            return ResponseEntity.notFound().build();
        }
        us.delete(userOpt.get());
        return ResponseEntity.noContent().build();
    }


}
