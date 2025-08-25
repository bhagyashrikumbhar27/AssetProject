# Asset Issue Tracker - User Roles and Login Credentials

## Overview
The Asset Issue Tracker now supports multiple user roles with different levels of access and functionality:

## User Roles

### 1. Super Admin
- **Highest level of access**
- Can manage all users across all departments
- Can create, edit, and deactivate users
- Can assign roles and departments
- Has access to system-wide settings and reports
- Can access all other dashboards

### 2. Admin
- Can manage asset requests system-wide
- Can view and approve/reject requests from all departments
- Has access to system reports and analytics
- Cannot manage users (Super Admin only)

### 3. Department Admin
- Can manage asset requests for their specific department only
- Can view and manage users within their department
- Can approve/reject requests from department employees
- Has department-specific analytics and reports

### 4. Store Manager
- Manages inventory and asset distribution
- Can issue assets to approved requests
- Maintains stock records and inventory levels
- Handles physical asset management

### 5. Employee
- Can submit asset requests
- Can track status of their requests
- Can view their request history
- Limited to their own data

## Login Credentials

### Super Admin
- **Username:** `superadmin`
- **Password:** `superadmin123`
- **Access:** Complete system administration
- **Dashboard:** `/super-admin`

### Regular Admin
- **Username:** `admin`
- **Password:** `admin`
- **Access:** Asset request management system-wide
- **Dashboard:** `/admin`

### IT Department Admin
- **Username:** `it-admin`
- **Password:** `itadmin123`
- **Department:** IT
- **Access:** IT department asset requests and users
- **Dashboard:** `/department-admin`

### HR Department Admin
- **Username:** `hr-admin`
- **Password:** `hradmin123`
- **Department:** HR
- **Access:** HR department asset requests and users
- **Dashboard:** `/department-admin`

### Store Manager
- **Username:** `store`
- **Password:** `store`
- **Access:** Inventory and asset distribution
- **Dashboard:** `/store-manager`

### Employee
- **Username:** `employee`
- **Password:** `employee`
- **Department:** IT
- **Access:** Personal asset requests
- **Dashboard:** `/employee`

## Features by Role

### Super Admin Features
- ✅ User Management (Create, Edit, Deactivate)
- ✅ Role Assignment
- ✅ Department Assignment
- ✅ System-wide Analytics
- ✅ Database Management
- ✅ Security Settings
- ✅ Backup & Restore
- ✅ Access to all other dashboards

### Admin Features
- ✅ View all asset requests
- ✅ Approve/Reject requests system-wide
- ✅ System reports and analytics
- ✅ Asset management
- ✅ User activity monitoring

### Department Admin Features
- ✅ View department-specific requests
- ✅ Approve/Reject department requests
- ✅ Manage department users
- ✅ Department analytics
- ✅ Department activity monitoring

### Store Manager Features
- ✅ Inventory management
- ✅ Asset distribution
- ✅ Stock level monitoring
- ✅ Issue assets to approved requests
- ✅ Physical asset tracking

### Employee Features
- ✅ Submit asset requests
- ✅ Track request status
- ✅ View request history
- ✅ Update personal information

## Department Structure

The system supports the following departments:
- **IT** - Information Technology
- **HR** - Human Resources
- **Finance** - Financial Department
- **Marketing** - Marketing Department
- **Operations** - Operations Department
- **Sales** - Sales Department

## Security Features

### Role-Based Access Control
- Each route is protected by authentication guards
- Users can only access features appropriate to their role
- Super Admin has override access to all features

### Session Management
- User sessions are maintained in localStorage
- Automatic logout on session expiry
- Secure token-based authentication (mock implementation)

## Getting Started

1. Start the application
2. Navigate to the login page
3. Use any of the credentials above to test different roles
4. Each role will redirect to their appropriate dashboard

## Development Notes

- User data is currently stored in-memory (mock implementation)
- In production, this should be replaced with a proper backend API
- Passwords should be properly hashed and secured
- JWT tokens should be implemented for real authentication
- Database integration needed for persistent user management

## Testing Different Roles

To test the different roles:

1. **Test Super Admin:**
   - Login with `superadmin` / `superadmin123`
   - Try creating new users
   - Access user management features

2. **Test Department Admin:**
   - Login with `it-admin` / `itadmin123`
   - View IT department specific data
   - Try managing department requests

3. **Test Regular Admin:**
   - Login with `admin` / `admin`
   - View system-wide asset requests
   - Access admin features

4. **Test Employee:**
   - Login with `employee` / `employee`
   - Submit asset requests
   - View personal dashboard

5. **Test Store Manager:**
   - Login with `store` / `store`
   - Manage inventory
   - Issue assets