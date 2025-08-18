package com.example.Pandharpur.repository;

import com.example.Pandharpur.Entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepo extends JpaRepository<Department, Long> {}