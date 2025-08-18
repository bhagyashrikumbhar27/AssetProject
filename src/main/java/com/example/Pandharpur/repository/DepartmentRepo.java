package com.example.Pandharpur.repository;

import com.example.Pandharpur.Entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DepartmentRepo extends JpaRepository<Department, Long> {
    Optional<Department> findByName(String name);

}