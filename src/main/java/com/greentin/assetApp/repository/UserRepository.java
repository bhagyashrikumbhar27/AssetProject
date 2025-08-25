package com.greentin.assetApp.repository;

import com.greentin.assetApp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findByDepartment(String department);
    List<User> findByDepartmentAndRoleIgnoreCase(String department, String role);
}
