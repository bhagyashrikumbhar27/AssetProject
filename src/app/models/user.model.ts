export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  location?: string; // optional: assigned office/location (e.g., Pune)
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export enum UserRole {
  EMPLOYEE = 'employee',
  ADMIN = 'admin',
  DEPARTMENT_ADMIN = 'department-admin',
  SUPER_ADMIN = 'super-admin',
  STORE_MANAGER = 'store-manager'
}

export enum Department {
  IT = 'IT',
  HR = 'HR',
  FINANCE = 'Finance',
  MARKETING = 'Marketing',
  OPERATIONS = 'Operations',
  SALES = 'Sales'
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}