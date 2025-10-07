package com.greentin.assetApp.service;

import com.greentin.assetApp.entity.Department;
import java.util.List;

public interface DepartmentService {
    Department createDepartment(Department department);
    List<Department> getAllDepartments();
    Department getDepartmentById(Long id);
    Department updateDepartment(Long id, Department department);
    boolean deleteDepartment(Long id);
}
