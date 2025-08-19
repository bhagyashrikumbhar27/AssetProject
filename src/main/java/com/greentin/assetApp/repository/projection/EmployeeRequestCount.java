package com.greentin.assetApp.repository.projection;

public class EmployeeRequestCount {
    private Long userId;
    private String userName;
    private Long requestCount;

    public EmployeeRequestCount(Long userId, String userName, Long requestCount) {
        this.userId = userId;
        this.userName = userName;
        this.requestCount = requestCount;
    }

    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public Long getRequestCount() { return requestCount; }
}
