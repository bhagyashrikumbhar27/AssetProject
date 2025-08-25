package com.greentin.assetApp.service;

import com.greentin.assetApp.dto.UserDto;
import com.greentin.assetApp.dto.RoleDto;
import com.greentin.assetApp.dto.DepartmentDto;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.entity.Role;
import com.greentin.assetApp.entity.Department;
import com.greentin.assetApp.entity.Location;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.repository.RoleRepository;
import com.greentin.assetApp.repository.DepartmentRepository;
import com.greentin.assetApp.repository.LocationRepository;
import com.greentin.assetApp.service.SuperAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SuperAdminServiceImpl implements SuperAdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final LocationRepository locationRepository;
    private final EmailService emailService;

    // 🔹 Users
    @Override
    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserDto::new)
                .collect(Collectors.toList());
    }

    @Override
    public UserDto createUser(UserDto userDto) {
        // Ensure email is normalized and role uppercased by entity setter
        String email = userDto.getEmail() == null ? null : userDto.getEmail().trim().toLowerCase();

        // Save user with password provided by Super Admin (kept as-is because encoder is plain)
        User user = User.builder()
                .name(userDto.getName())
                .email(email)
                .role(userDto.getRole())
                .department(userDto.getDepartment())
                .password(userDto.getPassword())
                .build();

        User saved = userRepository.save(user);
        // Send welcome email to the newly created user (HTML template)
        try {
            emailService.sendRegistrationNotification(saved);
        } catch (Exception ex) {
            // Log-only: do not block user creation if email fails
            org.slf4j.LoggerFactory.getLogger(SuperAdminServiceImpl.class)
                    .warn("Failed to send registration email to {}", saved.getEmail(), ex);
        }
        return new UserDto(saved);
    }

    @Override
    public UserDto updateUser(Long id, UserDto userDto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(userDto.getName());
        user.setEmail(userDto.getEmail());
        user.setRole(userDto.getRole());

        return new UserDto(userRepository.save(user));
    }

    @Override
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    // 🔹 Roles
    @Override
    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll()
                .stream()
                .map(RoleDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public RoleDto createRole(RoleDto roleDto) {
        Role role = Role.builder()
                .name(roleDto.getName())
                .description(roleDto.getDescription())
                .build();
        return RoleDto.fromEntity(roleRepository.save(role));
    }

    @Override
    public RoleDto updateRole(Long id, RoleDto roleDto) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        role.setName(roleDto.getName());
        role.setDescription(roleDto.getDescription());

        return RoleDto.fromEntity(roleRepository.save(role));
    }

    @Override
    public void deleteRole(Long id) {
        roleRepository.deleteById(id);
    }

    // 🔹 Departments
    @Override
    public List<DepartmentDto> getAllDepartments() {
        return departmentRepository.findAll()
                .stream()
                .map(DepartmentDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public DepartmentDto createDepartment(DepartmentDto departmentDto) {
        Department dept = Department.builder()
                .name(departmentDto.getName())
                .description(departmentDto.getDescription())
                .build();
        return DepartmentDto.fromEntity(departmentRepository.save(dept));
    }

    @Override
    public DepartmentDto updateDepartment(Long id, DepartmentDto departmentDto) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found"));

        dept.setName(departmentDto.getName());
        dept.setDescription(departmentDto.getDescription());

        return DepartmentDto.fromEntity(departmentRepository.save(dept));
    }

    @Override
    public void deleteDepartment(Long id) {
        departmentRepository.deleteById(id);
    }

    // 🔹 Locations (for Super Admin dashboard)
    @Override
    public java.util.List<Location> getAllLocations() {
        return locationRepository.findAll();
    }
}
