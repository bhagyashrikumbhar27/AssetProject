import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

export interface UserDto {
  id?: number;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  password?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleDto {
  id?: number;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface DepartmentDto {
  id?: number;
  name: string;
  description?: string;
  managerId?: number;
  location?: string;
}

// Exact backend payload for creating a user via /api/superadmin/users
export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;       // Backend expects uppercase values like "EMPLOYEE"
  department: string; // e.g., "IT"
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class SuperAdminService {
  private readonly baseUrl = `${environment.apiUrl}/superadmin`;
  
  // Subjects for real-time updates
  private usersUpdated = new BehaviorSubject<boolean>(false);
  private rolesUpdated = new BehaviorSubject<boolean>(false);
  private departmentsUpdated = new BehaviorSubject<boolean>(false);
  
  // Observables for components to subscribe to
  public usersUpdated$ = this.usersUpdated.asObservable();
  public rolesUpdated$ = this.rolesUpdated.asObservable();
  public departmentsUpdated$ = this.departmentsUpdated.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // 🔹 User Management
  getAllUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.baseUrl}/users`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  createUser(userDto: UserDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.baseUrl}/users`, userDto, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // Minimal payload create matching backend contract exactly
  createUserMinimal(payload: CreateUserPayload): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.baseUrl}/users`, payload, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  updateUser(id: number, userDto: UserDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.baseUrl}/users/${id}`, userDto, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // 🔹 Role Management
  getAllRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.baseUrl}/roles`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  createRole(roleDto: RoleDto): Observable<RoleDto> {
    return this.http.post<RoleDto>(`${this.baseUrl}/roles`, roleDto, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  updateRole(id: number, roleDto: RoleDto): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${this.baseUrl}/roles/${id}`, roleDto, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/roles/${id}`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // 🔹 Department Management
  getAllDepartments(): Observable<DepartmentDto[]> {
    return this.http.get<DepartmentDto[]>(`${this.baseUrl}/departments`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  createDepartment(departmentDto: DepartmentDto): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(`${this.baseUrl}/departments`, departmentDto, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  updateDepartment(id: number, departmentDto: DepartmentDto): Observable<DepartmentDto> {
    return this.http.put<DepartmentDto>(`${this.baseUrl}/departments/${id}`, departmentDto, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/departments/${id}`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // 🔹 Utility Methods
  triggerUsersUpdate() {
    this.usersUpdated.next(true);
  }

  triggerRolesUpdate() {
    this.rolesUpdated.next(true);
  }

  triggerDepartmentsUpdate() {
    this.departmentsUpdated.next(true);
  }

  // Convert UserDto to User model
  convertToUser(userDto: UserDto): User {
    return {
      id: userDto.id?.toString() || '',
      username: userDto.username,
      name: userDto.name,
      email: userDto.email,
      role: userDto.role as any,
      department: userDto.department,
      location: (userDto as any).location, // pass-through if backend provides it
      isActive: userDto.isActive ?? true,
      createdAt: userDto.createdAt ? new Date(userDto.createdAt) : new Date()
    };
  }

  // Convert User model to UserDto
  convertToUserDto(user: User): UserDto {
    return {
      id: user.id ? parseInt(user.id) : undefined,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      isActive: user.isActive,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: new Date().toISOString(),
      ...(user as any).location ? { location: (user as any).location } as any : {}
    } as any;
  }
}
