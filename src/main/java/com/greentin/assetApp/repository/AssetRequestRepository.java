package com.greentin.assetApp.repository;

import com.greentin.assetApp.entity.AssetRequest;
import com.greentin.assetApp.entity.User;
import com.greentin.assetApp.repository.projection.EmployeeRequestCount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

import java.util.List;

public interface AssetRequestRepository extends JpaRepository<AssetRequest, Long> {

    // Get all requests by user
    List<AssetRequest> findByUserId(Long userId);

    // Get all requests by department
    @Query("SELECT r FROM AssetRequest r JOIN FETCH r.user u WHERE u.department = :department")
    List<AssetRequest> findByUserDepartment(String department);

    // Get requests by department + status
    @Query("SELECT r FROM AssetRequest r JOIN FETCH r.user u WHERE u.department = :department AND r.status = :status")
    List<AssetRequest> findByUserDepartmentAndStatus(String department, AssetRequest.Status status);

    // Get requests by department + user
    @Query("SELECT r FROM AssetRequest r JOIN FETCH r.user u WHERE u.department = :department AND u.id = :userId")
    List<AssetRequest> findByUserDepartmentAndUserId(String department, Long userId);

    // Get requests by department + status + user
    @Query("SELECT r FROM AssetRequest r JOIN FETCH r.user u WHERE u.department = :department AND r.status = :status AND u.id = :userId")
    List<AssetRequest> findByUserDepartmentAndStatusAndUserId(String department, AssetRequest.Status status, Long userId);

    // Count requests per employee in a department (for dashboard)
    @Query("SELECT new com.greentin.assetApp.repository.projection.EmployeeRequestCount(a.user.id, a.user.name, COUNT(a)) " +
            "FROM AssetRequest a WHERE a.user.department = :department GROUP BY a.user.id, a.user.name")
    List<EmployeeRequestCount> countByEmployeeInDepartment(String department);

    // Pagination support
    Page<AssetRequest> findByUserDepartment(String department, Pageable pageable);

    Page<AssetRequest> findByUserDepartmentAndStatus(String department, AssetRequest.Status status, Pageable pageable);

    Page<AssetRequest> findByUserIdAndUserDepartment(Long userId, String department, Pageable pageable);

    Page<AssetRequest> findByUserIdAndUserDepartmentAndStatus(Long userId, String department, AssetRequest.Status status, Pageable pageable);

    List<AssetRequest> findByUser(User user);

    long countByUserId(Long employeeUserId);

    // Custom query to ensure user is fetched with the request
    @Query("SELECT r FROM AssetRequest r JOIN FETCH r.user WHERE r.id = :requestId")
    Optional<AssetRequest> findByIdWithUser(Long requestId);
}
