package com.example.Pandharpur.services;

import com.example.Pandharpur.Entity.*;
import com.example.Pandharpur.dto.UserDto;
import com.example.Pandharpur.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepo repo;
    private final PasswordEncoder enc;
    private final MailService mail;
    private final DepartmentRepo departmentRepo;
    private final LocationRepo locationRepo;

    public User create(UserDto dto, Role role){
        User u = new User();
        BeanUtils.copyProperties(dto, u);

        // Manual mapping for relations
        if (dto.getDepartmentId() != null) {
            departmentRepo.findById(dto.getDepartmentId()).ifPresent(u::setDepartment);
        }
        if (dto.getLocationId() != null) {
            locationRepo.findById(dto.getLocationId()).ifPresent(u::setLocation);
        }

        u.setPassword(enc.encode(dto.getPassword()));
        u.setRole(role);

        User saved = repo.save(u);
        mail.sendCredentials(saved.getEmail(), dto.getPassword());
        return saved;
    }
}
