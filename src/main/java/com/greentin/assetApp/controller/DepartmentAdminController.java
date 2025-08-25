package com.greentin.assetApp.controller;

import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.Location;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.service.DepartmentAdminService;
import com.greentin.assetApp.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/department-admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class DepartmentAdminController {

    private final DepartmentAdminService departmentAdminService;

    // --- List employees in department ---
    @GetMapping("/employees")
    public ResponseEntity<List<User>> getDepartmentEmployees() {
        return ResponseEntity.ok(departmentAdminService.listDepartmentEmployees());
    }

    // --- List pending requests ---
    @GetMapping("/requests/pending")
    public ResponseEntity<List<AssetRequest>> getPendingRequests() {
        return ResponseEntity.ok(departmentAdminService.listPendingRequests());
    }

    // --- List request history ---
    @GetMapping("/requests/history")
    public ResponseEntity<List<AssetRequest>> getRequestHistory() {
        return ResponseEntity.ok(departmentAdminService.listHistory());
    }

    // --- Approve a request ---
    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<ApiResponse> approveRequest(@PathVariable Long requestId) {
        departmentAdminService.approve(requestId);
        return ResponseEntity.ok(new ApiResponse(true, "Request approved", null));
    }

    // --- Reject a request ---
    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<ApiResponse> rejectRequest(@PathVariable Long requestId) {
        departmentAdminService.reject(requestId);
        return ResponseEntity.ok(new ApiResponse(true, "Request rejected", null));
    }

    // --- Notify employee about a request status (manual trigger) ---
    @PostMapping("/requests/{requestId}/notify")
    public ResponseEntity<ApiResponse> notifyEmployee(@PathVariable Long requestId,
                                                      @RequestParam(required = false) String status) {
        departmentAdminService.notifyEmployee(requestId, status);
        return ResponseEntity.ok(new ApiResponse(true, "Notification sent", null));
    }

    // --- Department locations ---
    @GetMapping("/locations")
    public ResponseEntity<List<Location>> getLocations() {
        return ResponseEntity.ok(departmentAdminService.listLocations());
    }

    @PostMapping("/locations")
    public ResponseEntity<Location> addLocation(@RequestBody Location location) {
        return ResponseEntity.status(201).body(departmentAdminService.addLocation(location));
    }

    @PutMapping("/locations/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable Long id, @RequestBody Location location) {
        return ResponseEntity.ok(departmentAdminService.updateLocation(id, location));
    }

    @DeleteMapping("/locations/{id}")
    public ResponseEntity<ApiResponse> deleteLocation(@PathVariable Long id) {
        departmentAdminService.deleteLocation(id);
        return ResponseEntity.ok(new ApiResponse(true, "Location deleted", null));
    }

    // --- Count requests from an employee ---
    @GetMapping("/employees/{userId}/requests/count")
    public ResponseEntity<ApiResponse> countRequestsFromEmployee(@PathVariable Long userId) {
        long count = departmentAdminService.countRequestsFromEmployee(userId);
        return ResponseEntity.ok(ApiResponse.success("Count fetched", count));
    }

    // --- List all department requests ---
    @GetMapping("/requests")
    public ResponseEntity<ApiResponse> listDepartmentRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String department
    ) {
        var result = departmentAdminService.listDepartmentRequests(status, userId, department);
        return ResponseEntity.ok(ApiResponse.success("Requests fetched", result));
    }

    // --- Employee-wise request counts ---
    @GetMapping("/requests/summary/employees")
    public ResponseEntity<ApiResponse> employeeRequestCounts() {
        var summary = departmentAdminService.employeeRequestCounts();
        return ResponseEntity.ok(ApiResponse.success("Summary fetched", summary));
    }
}
