package com.greentin.assetApp.service;

import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.Location;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.AssetRepository;
import com.greentin.assetApp.repository.AssetRequestRepository;
import com.greentin.assetApp.repository.LocationRepository;
import com.greentin.assetApp.repository.UserRepository;
import com.greentin.assetApp.repository.projection.EmployeeRequestCount;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentAdminService {

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final AssetRepository assetRepository;
    private final AssetRequestRepository assetRequestRepository;
    private final com.greentin.assetApp.service.EmailService emailService;

    private User currentAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        String email = auth.getName();
        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Admin not found"));
        if (!"DEPARTMENT_ADMIN".equalsIgnoreCase(admin.getRole()) &&
                !"SUPER_ADMIN".equalsIgnoreCase(admin.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient role");
        }
        return admin;
    }

    private String currentAdminDepartment() {
        User admin = currentAdminUser();
        return admin.getDepartment();
    }

    // --- Employees in current department ---
    @Transactional(readOnly = true)
    public List<User> listDepartmentEmployees() {
        return userRepository.findByDepartment(currentAdminDepartment());
    }

    // --- Assign employee location (within same department) ---
    @Transactional
    public com.greentin.assetApp.dto.UserDto assignEmployeeLocation(Long employeeUserId, Long locationId) {
        String dept = currentAdminDepartment();
        User employee = userRepository.findById(employeeUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        if (employee.getDepartment() == null || !dept.equals(employee.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employee is not in your department");
        }
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found"));
        if (location.getDepartment() == null || !dept.equals(location.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Location not in your department");
        }
        employee.setAssignedLocation(location);
        User saved = userRepository.save(employee);
        // Build DTO inside transaction to avoid LazyInitialization issues
        return new com.greentin.assetApp.dto.UserDto(saved);
    }

    // --- Pending requests in current department ---
    public List<AssetRequest> listPendingRequests() {
        return assetRequestRepository.findByUserDepartmentAndStatus(
                currentAdminDepartment(), AssetRequest.Status.PENDING);
    }

    // --- Request history ---
    public List<AssetRequest> listHistory() {
        return assetRequestRepository.findByUserDepartment(currentAdminDepartment())
                .stream()
                .filter(r -> r.getStatus() != AssetRequest.Status.PENDING)
                .toList();
    }

    // --- Count requests from an employee ---
    public long countRequestsFromEmployee(Long employeeUserId) {
        User employee = userRepository.findById(employeeUserId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        if (!currentAdminDepartment().equals(employee.getDepartment())) {
            throw new RuntimeException("Employee is not in your department");
        }
        return assetRequestRepository.countByUserId(employeeUserId);
    }

    // --- Approve request ---
    public void approve(Long requestId) {
        AssetRequest request = assetRequestRepository.findByIdWithUser(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (!request.getUser().getDepartment().equals(currentAdminDepartment())) {
            throw new RuntimeException("Cross-department access denied");
        }
        request.setStatus(AssetRequest.Status.APPROVED);
        AssetRequest savedRequest = assetRequestRepository.save(request);

        // Send approval notification to employee
        emailService.sendRequestStatusNotification(savedRequest, "APPROVED");
    }

    // --- Reject request ---
    public void reject(Long requestId) {
        AssetRequest request = assetRequestRepository.findByIdWithUser(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (!request.getUser().getDepartment().equals(currentAdminDepartment())) {
            throw new RuntimeException("Cross-department access denied");
        }
        request.setStatus(AssetRequest.Status.REJECTED);
        AssetRequest savedRequest = assetRequestRepository.save(request);

        // Send rejection notification to employee
        emailService.sendRequestStatusNotification(savedRequest, "REJECTED");
    }

    // --- Notify employee manually ---
    public void notifyEmployee(Long requestId, String status) {
        AssetRequest request = assetRequestRepository.findByIdWithUser(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (!request.getUser().getDepartment().equals(currentAdminDepartment())) {
            throw new RuntimeException("Cross-department access denied");
        }
        String effectiveStatus = (status == null || status.isBlank())
                ? (request.getStatus() == null ? "UPDATED" : request.getStatus().name())
                : status.toUpperCase();
        emailService.sendRequestStatusNotification(request, effectiveStatus);
    }

    // --- Locations ---
    public List<Location> listLocations() {
        return locationRepository.findByDepartment(currentAdminDepartment());
    }

    public Location addLocation(Location location) {
        location.setId(null);
        location.setDepartment(currentAdminDepartment());
        return locationRepository.save(location);
    }

    public Location updateLocation(Long id, Location incoming) {
        Location db = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found"));
        if (!db.getDepartment().equals(currentAdminDepartment())) {
            throw new RuntimeException("Cross-department access denied");
        }
        db.setName(incoming.getName());
        return locationRepository.save(db);
    }

    public void deleteLocation(Long id) {
        Location db = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found"));
        if (!db.getDepartment().equals(currentAdminDepartment())) {
            throw new RuntimeException("Cross-department access denied");
        }
        locationRepository.delete(db);
    }

    // --- Department assets ---
    public List<?> listDepartmentAssets() {
        return assetRepository.findByDepartment(currentAdminDepartment());
    }

    // --- Department requests with optional filters ---
    public List<AssetRequest> listDepartmentRequests(String status, Long employeeUserId, String department) {
        String dept = (department != null && !department.isBlank()) ? department : currentAdminDepartment();
        if (status != null && employeeUserId != null) {
            return assetRequestRepository.findByUserDepartmentAndStatusAndUserId(
                    dept, AssetRequest.Status.valueOf(status.toUpperCase()), employeeUserId);
        } else if (status != null) {
            return assetRequestRepository.findByUserDepartmentAndStatus(
                    dept, AssetRequest.Status.valueOf(status.toUpperCase()));
        } else if (employeeUserId != null) {
            return assetRequestRepository.findByUserDepartmentAndUserId(dept, employeeUserId);
        } else {
            return assetRequestRepository.findByUserDepartment(dept);
        }
    }

    // --- Employee-wise request counts ---
    public List<EmployeeRequestCount> employeeRequestCounts() {
        return assetRequestRepository.countByEmployeeInDepartment(currentAdminDepartment());
    }
}
