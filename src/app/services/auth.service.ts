import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map, catchError, of, throwError, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UserRole, Department, LoginCredentials, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  // User update notification system
  private userUpdatedSubject = new Subject<{action: 'created' | 'updated' | 'deleted', user: User}>();
  public userUpdated$ = this.userUpdatedSubject.asObservable();
  
  // Mock users database - in real app, this would come from backend
  private users: User[] = [
    {
      id: '1',
      username: 'superadmin',
      name: 'Super Administrator',
      email: 'superadmin@company.com',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      username: 'admin',
      name: 'System Administrator',
      email: 'admin@company.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '3',
      username: 'it-admin',
      name: 'IT Department Admin',
      email: 'it-admin@company.com',
      role: UserRole.DEPARTMENT_ADMIN,
      department: Department.IT,
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '4',
      username: 'hr-admin',
      name: 'HR Department Admin',
      email: 'hr-admin@company.com',
      role: UserRole.DEPARTMENT_ADMIN,
      department: Department.HR,
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '5',
      username: 'employee',
      name: 'John Employee',
      email: 'employee@company.com',
      role: UserRole.EMPLOYEE,
      department: Department.IT,
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '6',
      username: 'store',
      name: 'Store Manager',
      email: 'store@company.com',
      role: UserRole.STORE_MANAGER,
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '7',
      username: 'jane.doe',
      name: 'Jane Doe',
      email: 'jane.doe@company.com',
      role: UserRole.EMPLOYEE,
      department: Department.IT,
      isActive: true,
      createdAt: new Date('2024-01-02')
    },
    {
      id: '8',
      username: 'mike.smith',
      name: 'Mike Smith',
      email: 'mike.smith@company.com',
      role: UserRole.EMPLOYEE,
      department: Department.IT,
      isActive: true,
      createdAt: new Date('2024-01-03')
    },
    {
      id: '9',
      username: 'sarah.wilson',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      role: UserRole.EMPLOYEE,
      department: Department.HR,
      isActive: true,
      createdAt: new Date('2024-01-04')
    },
    {
      id: '10',
      username: 'david.brown',
      name: 'David Brown',
      email: 'david.brown@company.com',
      role: UserRole.EMPLOYEE,
      department: Department.HR,
      isActive: true,
      createdAt: new Date('2024-01-05')
    }
  ];

  // Mock passwords - in real app, passwords would be hashed and stored securely
  private passwords: { [username: string]: string } = {
    'superadmin': 'superadmin123',
    'admin': 'admin',
    'it-admin': 'itadmin123',
    'hr-admin': 'hradmin123',
    'employee': 'employee',
    'store': 'store',
    'jane.doe': 'jane123',
    'mike.smith': 'mike123',
    'sarah.wilson': 'sarah123',
    'david.brown': 'david123'
  };

  private readonly usersStorageKey = 'app_users';

  constructor(private http: HttpClient) {
    // Load users from localStorage if present, otherwise keep defaults
    try {
      const raw = localStorage.getItem(this.usersStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Rehydrate dates
          this.users = parsed.map((u: any) => ({
            ...u,
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
          }));
        }
      }
    } catch {}
  }

  private saveUsersToStorage() {
    try {
      localStorage.setItem(this.usersStorageKey, JSON.stringify(this.users));
    } catch {}
  }

  // Call backend API for real authentication (matches Spring Boot /api/auth/login)
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Accept typical Spring Boot responses: JSON with user/token or wrapper with success/data
    const payload: any = {
      email: credentials.email,
      password: credentials.password,
      // Some backends expect 'username' instead of 'email'
      username: (credentials.email || '').split('@')[0]
    };

    console.log('Attempting backend authentication with payload:', payload);

    return this.http.post(`${environment.apiUrl}/auth/login`, payload, {
      withCredentials: true,
      responseType: 'text',
      observe: 'response' // Get full response including headers
    }).pipe(
      map((response: any) => {
        console.log('Backend auth response:', response);
        const raw = response.body;

        // Check for authentication token in headers (common Spring Boot pattern)
        const authHeader = response.headers.get('Authorization') || response.headers.get('X-Auth-Token');
        if (authHeader) {
          console.log('Found auth token in headers:', authHeader);
        }

        // Accept plain text success or JSON
        let parsedResponse: any = raw;
        try {
          parsedResponse = JSON.parse(raw);
          console.log('Parsed login response:', parsedResponse);
        } catch {
          console.log('Login response is plain text:', raw);
        }

        // Extract token from headers or response body
        let token = authHeader;
        if (!token && parsedResponse && typeof parsedResponse === 'object') {
          token = parsedResponse.token || parsedResponse.accessToken || parsedResponse.jwt || parsedResponse.authToken;
        }

        console.log('Extracted token:', token);

        // Validate token format
        if (token && !this.isValidJwtFormat(token)) {
          console.warn('Token does not appear to be a valid JWT:', token);
        }

        // If backend returns a plain 'success' or similar
        if (typeof parsedResponse === 'string') {
          console.log('Backend returned string response, creating session auth');
          return this.createSessionAuth('21', credentials.email, 'employee');
        }

        // Case A: Wrapper { success, data, token, message }
        if (parsedResponse && (parsedResponse.success === true || parsedResponse.success === 'true')) {
          const data = parsedResponse.data ?? {};
          const isEmptyData = data && Object.keys(data).length === 0;
          const employee = data;
          const userIdRaw = employee.id ?? employee.empId ?? employee.userId;
          const userId = userIdRaw ?? (isEmptyData && credentials.email?.toLowerCase() === 'rahul.sharma@example.com' ? 13 : '21');
          const user: User = {
            id: String(userId),
            username: employee.username ?? employee.email ?? credentials.email.split('@')[0],
            name: employee.name ?? credentials.email.split('@')[0],
            email: employee.email ?? credentials.email,
            role: this.mapBackendRoleToUserRole(employee.role),
            department: employee.department ?? null,
            isActive: true,
            createdAt: new Date()
          };
          const finalToken: string = token || parsedResponse.token || this.generateMockToken();
          this.currentUser = user;
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('token', finalToken);
          console.log('Stored auth token (case A):', finalToken);
          // Best-effort login notification
          try { this.sendLoginNotification(user).subscribe(() => {}); } catch {}
          return { success: true, user, token: finalToken } as AuthResponse;
        }

        // Case B: Direct payload { user, token } or { email, role, ... }
        const maybeUser = parsedResponse?.user ? parsedResponse.user : parsedResponse;
        if (maybeUser?.email || maybeUser?.username) {
          const user: User = {
            id: String(maybeUser.id ?? maybeUser.empId ?? maybeUser.userId ?? '1'),
            username: maybeUser.username ?? maybeUser.email ?? credentials.email.split('@')[0],
            name: maybeUser.name ?? credentials.email.split('@')[0],
            email: maybeUser.email ?? credentials.email,
            role: this.mapBackendRoleToUserRole(maybeUser.role),
            department: maybeUser.department ?? null,
            isActive: true,
            createdAt: new Date()
          };
          const finalToken: string = token || parsedResponse?.token || this.generateMockToken();
          this.currentUser = user;
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('token', finalToken);
          console.log('Stored auth token (case B):', finalToken);
          // Best-effort login notification
          try { this.sendLoginNotification(user).subscribe(() => {}); } catch {}
          return { success: true, user, token: finalToken } as AuthResponse;
        }

        // Case C: Explicit failure
        return { success: false, message: parsedResponse?.message || 'Login failed' } as AuthResponse;
      }),
      catchError((error) => {
        console.error('Backend authentication failed:', error);
        console.log('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });

        // Don't fall back to mock authentication - let the error propagate
        // This ensures we don't create invalid mock tokens
        return throwError(() => error);
      })
    );
  }

  private mapBackendRoleToUserRole(role: string | undefined): UserRole {
    if (!role) return UserRole.EMPLOYEE;

    // Normalize common backend formats: 'department-admin', 'DEPARTMENT_ADMIN', 'Department Admin'
    const r = String(role)
      .trim()
      .toLowerCase()
      .replace(/_/g, '-')      // underscores -> hyphens
      .replace(/\s+/g, '-');   // spaces -> hyphens

    switch (r) {
      case 'super-admin':
      case 'superadmin':
        return UserRole.SUPER_ADMIN;

      case 'admin':
        return UserRole.ADMIN;

      case 'department-admin':
      case 'departmentadmin':
      case 'dept-admin':
        return UserRole.DEPARTMENT_ADMIN;

      case 'store-manager':
      case 'storemanager':
        return UserRole.STORE_MANAGER;

      case 'employee':
      default:
        return UserRole.EMPLOYEE;
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  }

  // Register new user via backend API
  register(registrationData: {
    name: string;
    email: string;
    role: string;
    department?: string;
    password: string;
    confirmPassword: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, registrationData, { responseType: 'text' }).pipe(
      map(raw => {
        try {
          return JSON.parse(raw);
        } catch {
          // If backend returns plain text success message
          return { success: true, message: raw };
        }
      })
    );
  }

  // Trigger welcome/registration email to the registering user with template support
  // Preferred backend endpoint should render a Bootstrap-styled template
  sendRegistrationEmailToUser(userId: number | string) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    const body: any = {
      templateName: 'registration',
      theme: 'bootstrap'
    };

    const urls = [
      `${environment.apiUrl}/mail/test-registration/${userId}`
    ];

    return new Observable<{ success: boolean; error?: any }>(subscriber => {
      const tryNext = (i: number) => {
        if (i >= urls.length) { subscriber.next({ success: false }); subscriber.complete(); return; }
        const url = urls[i];
        this.http.post(url, body, { responseType: 'text', withCredentials: false, headers }).subscribe({
          next: () => { subscriber.next({ success: true }); subscriber.complete(); },
          error: (err) => { if (err?.status && err.status !== 404) console.warn('Registration email attempt failed on', url, err); tryNext(i + 1); }
        });
      };
      tryNext(0);
    });
  }

  // Notify admins about a new registration (best-effort, multiple endpoints tried)
  sendRegistrationEmailToAdmins(userId: number | string) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    const body: any = {
      templateName: 'registration-admin',
      theme: 'bootstrap'
    };
    const urls = [
      `${environment.apiUrl}/mail/registration/admins/${userId}`,
      `${environment.apiUrl}/mail/send-registration-admins/${userId}`,
      `${environment.apiUrl}/superadmin/notify-registration/${userId}`
    ];
    return new Observable<{ success: boolean; error?: any }>(subscriber => {
      const tryNext = (i: number) => {
        if (i >= urls.length) { subscriber.next({ success: false }); subscriber.complete(); return; }
        const url = urls[i];
        this.http.post(url, body, { responseType: 'text', withCredentials: false, headers }).subscribe({
          next: () => { subscriber.next({ success: true }); subscriber.complete(); },
          error: (err) => { if (err?.status && err.status !== 404) console.warn('Registration admin email attempt failed on', url, err); tryNext(i + 1); }
        });
      };
      tryNext(0);
    });
  }

  // Notify on successful login (user and/or admins) best-effort
  sendLoginNotification(user: User): Observable<boolean> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    const userId = user.id || '';
    const body: any = {
      userId,
      email: user.email,
      role: user.role,
      department: user.department,
      templateName: 'login-notice',
      theme: 'bootstrap'
    };
    const urls = [
      `${environment.apiUrl}/mail/login-notification/${userId}`,
      `${environment.apiUrl}/mail/send-login/${userId}`,
      `${environment.apiUrl}/auth/login/notify/${userId}`,
      `${environment.apiUrl}/audit/login`
    ];
    return new Observable<boolean>(subscriber => {
      const tryNext = (i: number) => {
        if (i >= urls.length) { subscriber.next(false); subscriber.complete(); return; }
        const url = urls[i];
        this.http.post(url, body, { headers, responseType: 'text', withCredentials: false }).subscribe({
          next: () => { subscriber.next(true); subscriber.complete(); },
          error: () => tryNext(i + 1)
        });
      };
      tryNext(0);
    });
  }

  // Request password reset via email (server sends email with reset link)
  requestPasswordReset(email: string) {
    return this.http.post(`${environment.apiUrl}/mail/send-password-reset`, { email }, { responseType: 'text' });
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    }
    return this.currentUser;
  }

  getUserRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  getUserDepartment(): string | null {
    const user = this.getCurrentUser();
    return user ? user.department || null : null;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  isSuperAdmin(): boolean {
    return this.getUserRole() === UserRole.SUPER_ADMIN;
  }

  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

  isDepartmentAdmin(): boolean {
    return this.getUserRole() === UserRole.DEPARTMENT_ADMIN;
  }

  isStoreManager(): boolean {
    return this.getUserRole() === UserRole.STORE_MANAGER;
  }

  isEmployee(): boolean {
    return this.getUserRole() === UserRole.EMPLOYEE;
  }

  // User registration method (public registration)
  registerUser(userData: Partial<User>, password: string): boolean {
    // Check if username or email already exists
    const existingUser = this.users.find(u => 
      u.username === userData.username || u.email === userData.email
    );
    
    if (existingUser) {
      return false; // User already exists
    }

    const newUser: User = {
      id: (this.users.length + 1).toString(),
      username: userData.username!,
      name: userData.name!,
      email: userData.email!,
      role: userData.role!,
      department: userData.department,
      isActive: true,
      createdAt: new Date()
    };

    this.users.push(newUser);
    this.passwords[newUser.username] = password;
    return true;
  }

  // User management methods (for super admin)
  getAllUsers(): User[] {
    return this.users.filter(user => user.isActive);
  }

  getUsersByDepartment(department: string): User[] {
    const target = (department || '').toString().trim().toLowerCase();
    return this.users.filter(user => (user.department || '').toString().trim().toLowerCase() === target && user.isActive);
  }

  createUser(userData: Partial<User>, password: string): boolean {
    if (!this.isSuperAdmin()) {
      return false;
    }

    const newUser: User = {
      id: (this.users.length + 1).toString(),
      username: userData.username!,
      name: userData.name!,
      email: userData.email!,
      role: userData.role!,
      department: userData.department,
      isActive: true,
      createdAt: new Date()
    };

    this.users.push(newUser);
    this.passwords[newUser.username] = password;
    this.saveUsersToStorage();

    // Notify other components about the new user
    this.userUpdatedSubject.next({action: 'created', user: newUser});

    return true;
  }

  updateUser(userId: string, userData: Partial<User>): boolean {
    if (!this.isSuperAdmin()) {
      return false;
    }

    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...userData };
      this.saveUsersToStorage();

      // Notify other components about the updated user
      this.userUpdatedSubject.next({action: 'updated', user: this.users[userIndex]});

      return true;
    }
    return false;
  }

  deactivateUser(userId: string): boolean {
    if (!this.isSuperAdmin()) {
      return false;
    }

    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.isActive = false;
      this.saveUsersToStorage();

      // Notify other components about the deactivated user
      this.userUpdatedSubject.next({action: 'updated', user: user});

      return true;
    }
    return false;
  }

  // Helper to find user by username or email
  private findUserByUsernameOrEmail(identifier: string): User | undefined {
    return this.users.find(
      u => u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase()
    );
  }

  // Recover username by email address
  recoverUsernameByEmail(email: string): string | null {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? user.username : null;
  }

  // Reset password using username or email
  resetPassword(identifier: string, newPassword: string): { success: boolean; message: string } {
    const user = this.findUserByUsernameOrEmail(identifier);
    if (!user) {
      return { success: false, message: 'No user found for the provided username or email' };
    }
    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long' };
    }
    this.passwords[user.username] = newPassword;
    return { success: true, message: 'Password has been reset successfully' };
  }

  private generateMockToken(): string {
    return 'mock-jwt-token-' + Date.now();
  }

  // Validate JWT token format
  private isValidJwtFormat(token: string): boolean {
    if (!token) return false;
    const trimmed = token.trim();

    // Remove 'Bearer ' prefix if present
    const cleanToken = trimmed.startsWith('Bearer ') ? trimmed.substring(7) : trimmed;

    // JWT should have 3 parts separated by dots
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return false;

    // JWT header should start with eyJ (base64 encoded JSON starting with {)
    return parts[0].startsWith('eyJ');
  }

  // Create a session-based authentication for backends that don't use JWT
  createSessionAuth(userId: string, email: string, role: string = 'employee'): AuthResponse {
    console.log('Creating session-based authentication');

    const user: User = {
      id: userId,
      username: email.split('@')[0],
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      role: this.mapBackendRoleToUserRole(role),
      department: undefined,
      isActive: true,
      createdAt: new Date()
    };

    // For session-based auth, we don't need a JWT token
    // The browser will handle cookies automatically
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('token', 'session-auth'); // Placeholder token

    console.log('Session authentication created for user:', user);
    return { success: true, user, token: 'session-auth' } as AuthResponse;
  }

  // Test login with specific credentials to debug authentication
  testLogin(email: string = 'test@example.com', password: string = 'password'): Observable<any> {
    console.log('=== Testing Backend Login ===');
    console.log('Testing with credentials:', { email, password });
    console.log('Backend URL:', `${environment.apiUrl}/auth/login`);

    const payload = {
      email: email,
      password: password,
      username: email.split('@')[0]
    };

    return this.http.post(`${environment.apiUrl}/auth/login`, payload, {
      withCredentials: true,
      responseType: 'text',
      observe: 'response'
    }).pipe(
      map((response: any) => {
        console.log('Login test response:', response);
        console.log('Response headers:', response.headers.keys());
        console.log('Response body:', response.body);
        return response;
      }),
      catchError((error) => {
        console.error('Login test failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Test if current token is valid by making a test API call
  validateToken(): Observable<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found for validation');
      return of(false);
    }

    console.log('Validating token:', token);

    // Test token with a simple API call
    return this.http.get(`${environment.apiUrl}/employee/requests`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      map(() => {
        console.log('Token validation successful');
        return true;
      }),
      catchError((error) => {
        console.warn('Token validation failed:', error.status, error.message);
        // Don't clear token immediately - let the user try to use it
        return of(false);
      })
    );
  }

  // Test backend connectivity
  testBackendConnectivity(): Observable<boolean> {
    console.log('Testing backend connectivity to:', environment.apiUrl);
    return this.http.get(`${environment.apiUrl}/health`, {
      responseType: 'text' as 'text'
    }).pipe(
      map(() => {
        console.log('Backend connectivity test successful');
        return true;
      }),
      catchError((error) => {
        console.warn('Backend connectivity test failed:', error);
        return of(false);
      })
    );
  }

  // Set a manual token for testing (when you have a valid token from Postman)
  setManualToken(token: string, userId: string = '21'): void {
    console.log('Setting manual token for testing:', token);

    // Create a user based on the token
    const user: User = {
      id: userId,
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.EMPLOYEE,
      department: undefined,
      isActive: true,
      createdAt: new Date()
    };

    // Store user and token
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('token', token);

    console.log('Manual token set successfully');
  }

  // Mock login for development when backend is not available
  private mockLogin(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Using mock authentication for development');

    // Create a mock user based on email
    const user: User = {
      id: '1',
      username: credentials.email.split('@')[0],
      name: credentials.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: credentials.email,
      role: UserRole.EMPLOYEE,
      department: undefined,
      isActive: true,
      createdAt: new Date()
    };

    // Generate a mock token
    const mockToken = this.generateMockToken();

    // Store user and token
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('token', mockToken);

    return of({ success: true, user, token: mockToken } as AuthResponse);
  }
}
