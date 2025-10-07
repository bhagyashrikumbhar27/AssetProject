import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, UserRole, Department } from '../../models/user.model';
import { AssetRequestService } from '../../services/asset-request.service';
import { SuperAdminService, UserDto, RoleDto, DepartmentDto } from '../../services/super-admin.service';
import { AssetRequest } from '../../models/asset-request.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.html',
  styleUrl: './super-admin-dashboard.css'
})
export class SuperAdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  users: User[] = [];
  userDtos: UserDto[] = [];
  roles: RoleDto[] = [];
  departments: DepartmentDto[] = [];
  allRequests: AssetRequest[] = [];
  showUserModal = false;
  selectedUser: User | null = null;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  // Form data for new/edit user
  userForm = {
    username: '',
    name: '',
    email: '',
    role: UserRole.EMPLOYEE,
    department: '',
    password: ''
  };

  // Enums for template
  UserRole = UserRole;
  Department = Department;
  
  // Stats
  stats = {
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    departmentAdmins: 0,
    employees: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalDepartments: 0,
    totalRoles: 0
  };

  // Request counts per user (by user.id string)
  requestCounts: Record<string, number> = {};

  // Department stats
  departmentStats: Record<string, {
    users: number;
    requests: number;
    pendingRequests: number;
  }> = {};

  // Make Math and Object available in template
  Math = Math;
  Object = Object;

  // View Details Modal
  showDetailsModal = false;
  selectedUserDetails: User | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 0;
  paginatedUsers: User[] = [];
  filteredUsers: User[] = [];

  // Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Advanced Filtering
  filterText = '';
  filterRole = '';
  filterDepartment = '';
  filterStatus = '';

  constructor(
    private authService: AuthService,
    private assetRequestService: AssetRequestService,
    private superAdminService: SuperAdminService,
    private router: Router
  ) {}

  // Recent Transactions (from Store Manager)
  transactions: any[] = [];

  loadRecentTransactions() {
    // Lazy import to avoid circular deps: use fetch via store-manager service endpoint
    fetch(`${(window as any).environment?.apiUrl || 'http://localhost:8080/api'}/store-manager/transactions`, {
      credentials: 'include'
    })
      .then(r => r.text())
      .then(raw => {
        try {
          const parsed = JSON.parse(raw);
          const rows = Array.isArray(parsed) ? parsed : Array.isArray((parsed as any).data) ? (parsed as any).data : [];
          this.transactions = rows.map((t: any) => ({
            id: t.id,
            type: t.txn_type || t.type || 'Issue',
            employeeName: t.employee_name || t.employeeName || (t.employeeId ? `Emp #${t.employeeId}` : ''),
            assetName: t.asset_name || t.assetName || (t.assetId ? `Asset #${t.assetId}` : ''),
            location: t.employee_location || t.employeeLocation || t.location || '-',
            date: t.txn_date || t.issueDate || t.date || t.transactionDate,
            resolvedDate: t.resolved_date || t.resolvedDate || t.fix_date || t.fixedDate || t.closure_date || t.closureDate || null
          })).slice(0, 5);
        } catch {
          this.transactions = [];
        }
      })
      .catch(() => (this.transactions = []));
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadAllData();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setupSubscriptions() {
    // Subscribe to real-time updates
    const usersSub = this.superAdminService.usersUpdated$.subscribe(() => {
      this.loadUsers();
      this.loadRecentTransactions();
    });

    const rolesSub = this.superAdminService.rolesUpdated$.subscribe(() => {
      this.loadRoles();
    });

    const deptsSub = this.superAdminService.departmentsUpdated$.subscribe(() => {
      this.loadDepartments();
    });

    this.subscriptions.push(usersSub, rolesSub, deptsSub);

    // Refresh requests and counts when request status updates elsewhere
    const statusSub = this.assetRequestService.requestStatusUpdated$.subscribe(() => {
      this.loadAllRequests();
    });
    const refreshFlagSub = this.assetRequestService.requestsRefreshNeeded$.subscribe((needs) => {
      if (needs) {
        this.loadAllRequests();
        this.assetRequestService.clearRefreshFlag();
      }
    });
    this.subscriptions.push(statusSub, refreshFlagSub);
  }

  loadAllData() {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('=== SuperAdmin Dashboard Loading All Data ===');

    // Load data sequentially to avoid subscription issues
    this.loadUsers();
    this.loadRoles();
    this.loadDepartments();
    this.loadAllRequests();
    this.loadRecentTransactions();

    // Calculate stats after a short delay to ensure data is loaded
    setTimeout(() => {
      this.calculateStats();
      this.calculateDepartmentStats();
      this.isLoading = false;
    }, 1000);
  }

  loadUsers() {
    this.superAdminService.getAllUsers().pipe(
      catchError((error) => {
        console.warn('Failed to load users from backend, using fallback:', error);
        // Fallback to AuthService users if backend fails
        this.users = this.authService.getAllUsers();
        this.userDtos = this.users.map(user => this.superAdminService.convertToUserDto(user));
        return of(this.userDtos);
      })
    ).subscribe({
      next: (userDtos) => {
        this.userDtos = userDtos;
        // Merge backend DTOs with local storage for fields like location if backend doesn't return them
        const localUsers = this.authService.getAllUsers();
        const localById: Record<string, any> = Object.fromEntries(localUsers.map(u => [String(u.id), u]));
        this.users = userDtos.map(dto => {
          const u = this.superAdminService.convertToUser(dto);
          const local = localById[String(u.id)];
          return local ? { ...u, location: (u as any).location ?? (local as any).location } : u;
        });
        this.applyFiltersAndPagination();
        console.log('Users loaded:', this.users.length);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Failed to load users';
      }
    });
  }

  loadRoles() {
    this.superAdminService.getAllRoles().pipe(
      catchError((error) => {
        console.warn('Failed to load roles from backend:', error);
        return of([]);
      })
    ).subscribe({
      next: (roles) => {
        this.roles = roles;
        console.log('Roles loaded:', this.roles.length);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  loadDepartments() {
    this.superAdminService.getAllDepartments().pipe(
      catchError((error) => {
        console.warn('Failed to load departments from backend:', error);
        return of([]);
      })
    ).subscribe({
      next: (departments) => {
        this.departments = departments;
        console.log('Departments loaded:', this.departments.length);
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  loadAllRequests() {
    // Load requests from all departments
    const departmentNames = ['IT', 'HR', 'FINANCE', 'MARKETING', 'OPERATIONS', 'SALES'];
    const requestPromises = departmentNames.map(dept =>
      this.assetRequestService.getDepartmentRequests(dept).pipe(
        catchError(() => of([]))
      )
    );

    forkJoin(requestPromises).subscribe({
      next: (departmentRequests) => {
        this.allRequests = departmentRequests.flat();
        this.loadRequestCounts();
        console.log('All requests loaded:', this.allRequests.length);
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.allRequests = [];
      }
    });
  }

  calculateStats() {
    // User statistics
    this.stats.totalUsers = this.users.length;
    this.stats.activeUsers = this.users.filter(u => u.isActive).length;
    this.stats.adminUsers = this.users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length;
    this.stats.departmentAdmins = this.users.filter(u => u.role === UserRole.DEPARTMENT_ADMIN).length;
    this.stats.employees = this.users.filter(u => u.role === UserRole.EMPLOYEE).length;

    // Request statistics
    this.stats.totalRequests = this.allRequests.length;
    this.stats.pendingRequests = this.allRequests.filter(r => r.status?.toLowerCase() === 'pending').length;
    this.stats.approvedRequests = this.allRequests.filter(r => r.status?.toLowerCase() === 'approved').length;
    this.stats.rejectedRequests = this.allRequests.filter(r => r.status?.toLowerCase() === 'rejected').length;

    // Department and role statistics
    this.stats.totalDepartments = this.departments.length;
    this.stats.totalRoles = this.roles.length;
  }

  calculateDepartmentStats() {
    this.departmentStats = {};

    // Get unique departments from users
    const departments = [...new Set(this.users.map(u => u.department))];

    departments.forEach(dept => {
      if (dept) {
        const deptUsers = this.users.filter(u => u.department === dept);
        const deptRequests = this.allRequests.filter(r => r.user?.department === dept);
        const pendingRequests = deptRequests.filter(r => r.status?.toLowerCase() === 'pending');

        this.departmentStats[dept] = {
          users: deptUsers.length,
          requests: deptRequests.length,
          pendingRequests: pendingRequests.length
        };
      }
    });
  }

  // Try to read cached requests saved by Employee Dashboard
  private tryGetCachedRequestCount(userId: number): number | null {
    try {
      const raw = localStorage.getItem(`employee_requests_${userId}`);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : null;
    } catch {
      return null;
    }
  }

  // Load request counts for each user via API, fallback to local cache
  loadRequestCounts() {
    if (!this.users || this.users.length === 0) return;

    this.users.forEach(user => {
      const idNum = Number(user.id);
      if (!Number.isFinite(idNum)) {
        this.requestCounts[user.id] = 0;
        return;
      }

      // Initialize with cached value if present for instant UI
      const cached = this.tryGetCachedRequestCount(idNum);
      if (cached !== null) {
        this.requestCounts[user.id] = cached;
      }

      // Fetch live count
      this.assetRequestService.getEmployeeRequests(idNum).subscribe({
        next: (requests) => {
          this.requestCounts[user.id] = (requests || []).length;
        },
        error: () => {
          // Keep cached if available; otherwise default to 0
          if (cached === null) this.requestCounts[user.id] = 0;
        }
      });
    });
  }

  openUserModal(user?: User) {
    this.showUserModal = true;
    if (user) {
      this.isEditMode = true;
      this.selectedUser = user;
      this.userForm = {
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        password: ''
      };
    } else {
      this.isEditMode = false;
      this.selectedUser = null;
      this.resetUserForm();
    }
  }

  closeUserModal() {
    this.showUserModal = false;
    this.selectedUser = null;
    this.resetUserForm();
  }

  resetUserForm() {
    this.userForm = {
      username: '',
      name: '',
      email: '',
      role: UserRole.EMPLOYEE,
      department: '',
      password: ''
    };
  }

  saveUser() {
    if (this.isEditMode && this.selectedUser) {
      // Update existing user (local store only)
      const success = this.authService.updateUser(this.selectedUser.id, {
        username: this.userForm.username,
        name: this.userForm.name,
        email: this.userForm.email,
        role: this.userForm.role,
        department: this.userForm.department || undefined
      });
      
      if (success) {
        this.loadUsers();
        this.calculateStats();
        this.closeUserModal();
        this.loadRequestCounts();
      }
    } else {
      // Create new user via backend /api/superadmin/users
      const payload = {
        name: this.userForm.name,
        email: this.userForm.email,
        role: String(this.userForm.role).toUpperCase(),
        department: this.userForm.department || 'IT',
        password: this.userForm.password
      } as const;

      this.superAdminService.createUserMinimal(payload).subscribe({
        next: () => {
          // Show success message without mapping backend response
          this.successMessage = 'Added successfully.';

          // Refresh lists and close
          this.loadUsers();
          this.calculateStats();
          this.closeUserModal();
          this.loadRequestCounts();
          this.superAdminService.triggerUsersUpdate();

          // Auto-hide success after 3s
          setTimeout(() => (this.successMessage = ''), 3000);
        },
        error: (err) => {
          console.error('Create user failed', err);
          this.errorMessage = 'Failed to create user on server. Using local storage for demo.';

          // Fallback to local create to avoid blocking UI in demo/testing
          const success = this.authService.createUser({
            username: this.userForm.username,
            name: this.userForm.name,
            email: this.userForm.email,
            role: this.userForm.role,
            department: this.userForm.department || undefined
          }, this.userForm.password);
          if (success) {
            this.loadUsers();
            this.calculateStats();
            this.closeUserModal();
            this.loadRequestCounts();
            setTimeout(() => (this.errorMessage = ''), 3000);
          }
        }
      });
    }
  }

  deactivateUser(user: User) {
    if (confirm(`Are you sure you want to deactivate ${user.name} (${user.username})?`)) {
      const success = this.authService.deactivateUser(user.id);
      if (success) {
        this.loadUsers();
        this.calculateStats();
        this.loadRequestCounts();
      }
    }
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-danger';
      case UserRole.ADMIN:
        return 'bg-primary';
      case UserRole.DEPARTMENT_ADMIN:
        return 'bg-warning';
      case UserRole.STORE_MANAGER:
        return 'bg-info';
      case UserRole.EMPLOYEE:
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getDepartmentOptions(): string[] {
    // Limit department dropdown to only IT when creating a new user (per requirement)
    if (!this.isEditMode) {
      return ['IT'];
    }
    // When editing, keep all departments available
    return Object.values(Department);
  }

  getRoleOptions(): UserRole[] {
    return Object.values(UserRole);
  }

  // View Details Modal Methods
  viewUserDetails(user: User) {
    this.selectedUserDetails = user;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedUserDetails = null;
  }

  // Enhanced Sorting Methods
  sort(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndPagination();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // Enhanced Filtering Methods
  applyAdvancedFilters() {
    this.currentPage = 1; // Reset to first page when filtering
    this.applyFiltersAndPagination();
  }

  clearAllFilters() {
    this.filterText = '';
    this.filterRole = '';
    this.filterDepartment = '';
    this.filterStatus = '';
    this.applyFiltersAndPagination();
  }

  // Get unique values for filter dropdowns
  getUniqueRoles(): string[] {
    const roles = [...new Set(this.users.map(u => u.role))];
    return roles.filter(role => role != null).map(role => role.toString());
  }

  getUniqueDepartments(): string[] {
    const departments = [...new Set(this.users.map(u => u.department))];
    return departments.filter((dept): dept is string => dept != null && dept.trim() !== '');
  }

  // Pagination methods
  onPageSizeChange() {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFiltersAndPagination();
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Combined method for applying filters, search, sorting, and pagination
  applyFiltersAndPagination() {
    let filtered = [...this.users];

    // Apply text filter
    if (this.filterText.trim()) {
      const term = this.filterText.toLowerCase();
      filtered = filtered.filter(u =>
        (u.name || '').toLowerCase().includes(term) ||
        (u.username || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.department || '').toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term) ||
        (u.id || '').toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (this.filterRole) {
      filtered = filtered.filter(u => u.role === this.filterRole);
    }

    // Apply department filter
    if (this.filterDepartment) {
      filtered = filtered.filter(u => u.department === this.filterDepartment);
    }

    // Apply status filter
    if (this.filterStatus) {
      const isActive = this.filterStatus === 'active';
      filtered = filtered.filter(u => u.isActive === isActive);
    }

    // Apply sorting
    if (this.sortField) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[this.sortField] || '';
        const bVal = (b as any)[this.sortField] || '';

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredUsers = filtered;

    // Apply pagination
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = filtered.slice(startIndex, endIndex);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}