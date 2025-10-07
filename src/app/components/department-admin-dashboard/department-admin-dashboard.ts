import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, UserRole } from '../../models/user.model';
import { AssetRequestService } from '../../services/asset-request.service';
import { AssetRequest } from '../../models/asset-request.model';
import { LocationService } from '../../services/location.service';
import { LocationResponse } from '../../models/location.model';
import { SuperAdminService, UserDto, RoleDto, DepartmentDto } from '../../services/super-admin.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-department-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './department-admin-dashboard.html',
  styleUrl: './department-admin-dashboard.css'
})
export class DepartmentAdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;

  // Make Math available in template
  Math = Math;

  // Subscription for user updates
  private userUpdateSubscription?: Subscription;
  departmentUsers: User[] = [];
  departmentName: string = '';
  departmentAdminId: string = '';
  departmentAdminName: string = '';
  
  // Locations for the department
  locations: { id?: string | number; name?: string; department?: string; approvals?: number; pending?: number; approvedEmployees?: string[]; approvedEmployeeIds?: (string | number)[] }[] = [];
  newLocationName: string = '';
  // Location assignment state
  selectedEmployeeId: number | null = null;
  selectedLocationId: string | number | null = null;
  assignSuccess: string = '';
  assignError: string = '';

  // Per-employee input for direct location ID assignment
  locationIdForEmployee: Record<string, string | number> = {};

  // Last location created (to show ID for direct assignment)
  lastCreatedLocation: LocationResponse | null = null;

  // Quick assign inputs
  quickAssignEmployeeId: number | null = null;
  quickAssignLocationId: number | null = null;



  // Stats for the department
  stats = {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    departmentUsers: 0,
    activeUsers: 0
  };

  // Global stats (all departments)
  globalStats = {
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

  // Global collections for computation
  allUsers: User[] = [];
  allRequests: AssetRequest[] = [];
  allDepartments: DepartmentDto[] = [];
  allRoles: RoleDto[] = [];
  isGlobalLoading = false;

  // Totals for the department (requests from employees + registered users)
  departmentRequestCount = 0;
  departmentRegistrationCount = 0;

  // Aggregated department asset requests (from cache/API)
  assetRequests: { id: string; employeeId: number | string; employeeName: string; assetType: string; priority: string; status: string; date: string; justification: string; rawId?: number; userEmail?: string }[] = [];
  // View-model after filters and pagination
  filteredRequests: { id: string; employeeId: number | string; employeeName: string; assetType: string; priority: string; status: string; date: string; justification: string; rawId?: number; userEmail?: string }[] = [];
  paginatedRequests: { id: string; employeeId: number | string; employeeName: string; assetType: string; priority: string; status: string; date: string; justification: string; rawId?: number; userEmail?: string }[] = [];
  
  // Status filter state (default to 'pending' to focus on actionable items)
  selectedStatusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 0;

  // Advanced Filtering (additional filters)
  filterText = '';
  filterPriority = '';
  filterAssetType = '';
  filterDateFrom = '';
  filterDateTo = '';

  // Sorting
  sortColumn = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Search
  searchTerm = '';

  // Per-employee request counts for the current department
  employeeRequestCounts: Record<string, number> = {};

  // UI state for approve/reject operations
  updating: Record<string, boolean> = {};
  updateError: string = '';
  updateSuccess: string = '';
  isRefreshing = false;

  // Edit modal state
  showEditModal = false;
  savingEdit = false;
  editError = '';
  editSuccess = '';
  editModel: { id: string; employeeId: number | string; priority: string; justification: string; status?: string; assetType?: string; date?: string } | null = null;

  // View Details modal state
  showDetailsModal = false;
  detailsModel: { id: string; employeeId: number | string; employeeName: string; assetType: string; priority: string; status: string; date: string; justification: string; workflowStatus?: string } | null = null;

  // Modal methods
  openEdit(request: { id: string; employeeId: number | string; priority: string; justification: string; status?: string; assetType?: string; date?: string }) {
    this.editError = '';
    this.editSuccess = '';
    this.editModel = {
      id: request.id,
      employeeId: request.employeeId,
      priority: request.priority,
      justification: request.justification,
      status: request.status,
      assetType: request.assetType,
      date: request.date
    };
    this.showEditModal = true;
  }

  closeEdit() {
    this.showEditModal = false;
    this.savingEdit = false;
    this.editModel = null;
  }

  openDetails(request: { id: string; employeeId: number | string; employeeName: string; assetType: string; priority: string; status: string; date: string; justification: string }) {
    this.detailsModel = {
      ...request,
      workflowStatus: this.getWorkflowStatus(request.status)
    };
    this.showDetailsModal = true;
  }

  closeDetails() {
    this.showDetailsModal = false;
    this.detailsModel = null;
  }

  getWorkflowStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'Awaiting Review';
      case 'approved': return 'Approved - Ready for Processing';
      case 'rejected': return 'Request Declined';
      default: return 'Unknown Status';
    }
  }

  // Enhanced Sorting Methods
  sort(field: string) {
    if (this.sortColumn === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndPagination();
  }



  // Enhanced Filtering Methods
  applyAdvancedFilters() {
    this.currentPage = 1; // Reset to first page when filtering
    this.applyFiltersAndPagination();
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.filterText = '';
    this.filterPriority = '';
    this.filterAssetType = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.selectedStatusFilter = 'all';
    this.applyFiltersAndPagination();
  }

  // Get unique values for filter dropdowns
  getUniqueAssetTypes(): string[] {
    const types = [...new Set(this.assetRequests.map(r => r.assetType))];
    return types.filter(type => type && type.trim() !== '');
  }

  getUniquePriorities(): string[] {
    const priorities = [...new Set(this.assetRequests.map(r => r.priority))];
    return priorities.filter(priority => priority && priority.trim() !== '');
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

  // Sorting methods
  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndPagination();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  // Search and filter methods
  onSearchChange() {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearchChange();
  }

  // Refresh functionality
  refreshData() {
    this.isRefreshing = true;
    this.updateError = '';
    this.updateSuccess = '';
    
    // Clear cache to force fresh data
    const deptKey = this.getDeptKey(this.departmentName);
    localStorage.removeItem(deptKey);
    
    this.loadDepartmentRequests();
    this.loadDepartmentTotals();
    
    setTimeout(() => {
      this.isRefreshing = false;
      this.updateSuccess = 'Data refreshed successfully';
      setTimeout(() => this.updateSuccess = '', 2000);
    }, 1000);
  }

  saveEdit() {
    if (!this.editModel) return;

    // Snapshot values to avoid nullability issues in async callbacks
    const { id, employeeId: empId, priority, justification } = this.editModel;
    const numericId = this.parseNumericId(id);
    const employeeId = Number(empId);
    if (!numericId || !Number.isFinite(employeeId)) {
      this.editError = 'Invalid request or employee ID.';
      return;
    }

    this.savingEdit = true;
    this.assetRequestService.updateAssetRequest(
      numericId,
      { priority, justification },
      employeeId
    ).subscribe({
      next: (updated) => {
        // Update local table row
        const row = this.assetRequests.find(r => r.id === id);
        if (row) {
          row.priority = updated?.priority ?? priority;
          row.justification = updated?.justification ?? justification;
        }
        this.editSuccess = 'Request updated successfully';
        setTimeout(() => { this.editSuccess = ''; this.closeEdit(); }, 1200);
      },
      error: (err) => {
        console.error('Failed to update request', err);
        this.editError = 'Failed to update request. Please try again.';
      },
      complete: () => {
        this.savingEdit = false;
      }
    });
  }

  constructor(
    private authService: AuthService,
    private assetRequestService: AssetRequestService,
    private locationService: LocationService,
    private superAdminService: SuperAdminService,
    private router: Router
  ) {}

  // Normalize and infer department name when missing or differently cased
  private resolveDepartmentName(dept?: string | null): string {
    const d = (dept || '').toString().trim();
    if (d) {
      // Map common variants to canonical values
      const norm = d.toLowerCase();
      if (norm === 'it' || norm === 'i.t.' || norm === 'information technology') return 'IT';
      if (norm === 'hr' || norm === 'human resources') return 'HR';
      if (norm === 'finance' || norm === 'accounts') return 'Finance';
      if (norm === 'marketing') return 'Marketing';
      if (norm === 'operations' || norm === 'ops') return 'Operations';
      if (norm === 'sales' || norm === 'business development' || norm === 'bd') return 'Sales';
      // Fallback to original casing
      return d;
    }

    // If missing, try inferring from admin username/email patterns
    const u = this.currentUser;
    const hint = (u?.username || u?.email || '').toLowerCase();
    if (hint.includes('it-')) return 'IT';
    if (hint.includes('hr-')) return 'HR';
    if (hint.includes('fin') || hint.includes('finance')) return 'Finance';
    if (hint.includes('mkt') || hint.includes('marketing')) return 'Marketing';
    if (hint.includes('ops') || hint.includes('operations')) return 'Operations';
    if (hint.includes('sales')) return 'Sales';

    return '';
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.departmentName = this.resolveDepartmentName(this.currentUser?.department);
    this.departmentAdminId = this.currentUser?.id || '';
    this.departmentAdminName = this.currentUser?.name || this.currentUser?.username || 'Unknown';
    this.loadDepartmentUsers();
    this.applyFiltersAndPagination(); // initialize filtered view with pagination
    this.calculateStats();
    this.loadDepartmentTotals();
    this.loadDepartmentRequests();
    this.loadLocations(); // ensure department locations are shown
    this.loadLocationApprovalStats(); // compute approval metrics per location

    // Load global overview (backend with fallback)
    this.loadGlobalOverview();

    // Subscribe to user updates from Super Admin
    this.userUpdateSubscription = this.authService.userUpdated$.subscribe(update => {
      console.log('Department Admin received user update:', update);
      if (update.action === 'created' || update.action === 'updated') {
        // Refresh department users if the updated user belongs to this department
        if (update.user.department === this.departmentName) {
          console.log('Refreshing department users due to user update');
          this.loadDepartmentUsers();
          this.calculateStats();
        }
      }
    });

    // Listen for new requests from employees in this department
    this.setupRequestUpdateListener();
  }

  // Setup listener for new requests from employees
  setupRequestUpdateListener() {
    // Listen for custom events from employee dashboard
    window.addEventListener('departmentRequestsUpdated', (event: any) => {
      const detail = event.detail;
      console.log('Department Admin received request update:', detail);

      // Only refresh if the request is for this department
      if (detail.department === this.departmentName) {
        console.log('Refreshing department requests due to new employee request');
        this.loadDepartmentRequests();
      }
    });
  }

  // Manual refresh method for the refresh button
  refreshRequests() {
    console.log('=== Manual Refresh Triggered ===');
    console.log('Current department:', this.departmentName);

    // Clear any cached data to force fresh load
    const deptKey = this.getDeptKey(this.departmentName);
    console.log('Clearing cache for key:', deptKey);
    localStorage.removeItem(deptKey);

    // Reload requests
    this.loadDepartmentRequests();

    // Show feedback
    this.updateSuccess = 'Requests refreshed successfully';
    setTimeout(() => this.updateSuccess = '', 3000);
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.userUpdateSubscription) {
      this.userUpdateSubscription.unsubscribe();
    }

    // Clean up event listener
    window.removeEventListener('departmentRequestsUpdated', this.setupRequestUpdateListener);
  }

  // Combine locations with approval stats for the department
  loadLocationApprovalStats() {
    try {
      // Use cached department requests if available; otherwise compute from current view
      const deptKey = this.getDeptKey(this.departmentName);
      const raw = localStorage.getItem(deptKey);
      const requests: any[] = raw ? JSON.parse(raw) : (this.assetRequests || []);
      const byLoc: Record<string, { approvals: number; pending: number; employees: Set<string>; employeeIds: Set<string | number> }> = {};
      for (const r of requests) {
        const status = (r.status || '').toLowerCase();
        // Try to read location name from multiple shapes
        const locName = (
          r.employeeLocation ||
          r.user?.locationName ||
          (typeof r.user?.location === 'string' ? r.user?.location : r.user?.location?.name) ||
          ''
        ).toString();
        if (!locName) continue;
        if (!byLoc[locName]) byLoc[locName] = { approvals: 0, pending: 0, employees: new Set<string>(), employeeIds: new Set<string | number>() };
        const empId = r.employeeId || r.user?.id;
        const display = (r.employeeName || r.user?.name || (empId ? `#${empId}` : '')).toString();
        if (status === 'approved') {
          byLoc[locName].approvals++;
          if (display.trim()) byLoc[locName].employees.add(display);
          if (empId != null) byLoc[locName].employeeIds.add(empId);
        } else if (status === 'pending') {
          byLoc[locName].pending++;
        }
      }
      // Merge into current locations model
      this.locations = (this.locations || []).map(loc => {
        const key = (loc.name || '').toString();
        const stats = byLoc[key] || { approvals: 0, pending: 0, employees: new Set<string>(), employeeIds: new Set<string | number>() };
        return { ...loc, approvals: stats.approvals, pending: stats.pending, approvedEmployees: Array.from(stats.employees), approvedEmployeeIds: Array.from(stats.employeeIds) };
      });
    } catch {}
  }

  loadDepartmentUsers() {
    if (this.departmentName) {
      // Ensure case-insensitive match and robust department normalization
      const dept = this.resolveDepartmentName(this.departmentName);
      this.departmentUsers = this.authService.getUsersByDepartment(dept);
    } else {
      this.departmentUsers = [];
    }
  }



  // Persist per-department key
  private getDeptKey(dept: string) { return `department_requests_${dept}`; }

  // Load totals: requests per all users in department + registrations count
  loadDepartmentTotals() {
    // Registrations: treat as current number of users in this department
    this.departmentRegistrationCount = this.departmentUsers.length;

    // Requests: hydrate from dept cache first for instant UI
    const deptKey = this.getDeptKey(this.departmentName);
    try {
      const raw = localStorage.getItem(deptKey);
      if (raw) {
        const arr: AssetRequest[] = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.departmentRequestCount = arr.length;
        }
      }
    } catch {}

    // Also sum employee caches for fallback
    const ids = this.departmentUsers
      .map(u => Number(u.id))
      .filter(id => Number.isFinite(id)) as number[];
    const cachedSum = ids.reduce((sum, id) => {
      try {
        const raw = localStorage.getItem(`employee_requests_${id}`);
        if (!raw) return sum;
        const arr = JSON.parse(raw);
        return sum + (Array.isArray(arr) ? arr.length : 0);
      } catch { return sum; }
    }, 0);
    if (!this.departmentRequestCount) this.departmentRequestCount = cachedSum;

    // Then request live counts from API and update
    if (ids.length > 0) {
      const calls = ids.map(id => this.assetRequestService
        .getEmployeeRequests(id)
        .pipe(catchError(() => of([])))
      );

      forkJoin(calls).subscribe((results) => {
        const flat = results.flat();
        this.departmentRequestCount = flat.length;
        // Save dept cache for cross-dashboard consistency
        try { localStorage.setItem(deptKey, JSON.stringify(flat)); } catch {}
      });
    }
  }

  // Load and flatten requests for department table (backend filtered)
  loadDepartmentRequests() {
    this.employeeRequestCounts = {};

    const dept = this.departmentName;
    this.assetRequestService.getDepartmentRequests(dept).subscribe({
      next: (list) => {
        const rows = (list || []).map((r: any) => ({
          id: `REQ-${String(r.id).padStart(3,'0')}`,
          employeeId: Number(r.user?.id ?? 0),
          employeeName: r.user?.name || String(r.user?.id ?? ''),
          employeeDepartment: r.user?.department || '',
          employeeLocation: r.user?.locationName || r.user?.location?.name || r.user?.location || '',
          assetType: r.assetType,
          priority: r.priority,
          status: r.status,
          date: r.requestDate,
          justification: r.justification,
          rawId: r.id,
          userEmail: r.user?.email
        }));
        this.assetRequests = rows;
        this.applyFiltersAndPagination();
        this.employeeRequestCounts = rows.reduce((acc: any, r: any) => {
          const key = String(r.employeeId || r.employeeName || '');
          if (!key) return acc;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        this.calculateStats();
        // Recompute per-location approval stats using enriched location field
        this.loadLocationApprovalStats();
      },
      error: (error) => {
        console.error('Failed to load department requests from backend:', error);
        this.assetRequests = [];
        this.applyFiltersAndPagination();
        this.employeeRequestCounts = {};
        this.calculateStats();
      }
    });
  }

  calculateStats() {
    // Department-local stats from current table data
    this.stats.totalRequests = this.assetRequests.length;
    this.stats.pendingRequests = this.assetRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    this.stats.approvedRequests = this.assetRequests.filter(r => (r.status || '').toLowerCase() === 'approved').length;
    this.stats.rejectedRequests = this.assetRequests.filter(r => (r.status || '').toLowerCase() === 'rejected').length;
    this.stats.departmentUsers = this.departmentUsers.length;
    this.stats.activeUsers = this.departmentUsers.filter(u => u.isActive).length;
  }

  // Assign location to employee and refresh views (single unified implementation)
  assignEmployeeLocation(empId: number | string | null, loc: { id?: string | number; name?: string }) {
    this.assignError = '';
    this.assignSuccess = '';

    const employeeId = typeof empId === 'string' ? Number(empId) : (empId as number | null);
    const locationId = loc?.id;

    if (!employeeId || locationId == null || String(locationId).trim() === '') {
      this.assignError = 'Please select a valid employee and enter a Location ID.';
      setTimeout(() => (this.assignError = ''), 3000);
      return;
    }
    this.selectedEmployeeId = null;

    this.locationService.assignLocationToEmployee(employeeId, String(locationId)).subscribe({
      next: () => {
        this.assignSuccess = `Assigned ${loc.name || 'location'} (#${locationId}) to employee #${employeeId}`;
        setTimeout(() => (this.assignSuccess = ''), 2500);
        // Refresh data so other dashboards reflect latest location
        this.loadDepartmentUsers();
        this.loadDepartmentRequests();
        // Optimistic update approved list overlay
        this.loadLocationApprovalStats();
        // Notify Super Admin dashboard to refresh users
        this.superAdminService.triggerUsersUpdate();
      },
      error: (err) => {
        console.error('Failed to assign location:', err);
        const detail = (err?.error && typeof err.error === 'string') ? err.error : (err?.message || '');
        this.assignError = `Failed to assign location${detail ? ': ' + detail : ''}`;
        setTimeout(() => (this.assignError = ''), 4000);
      }
    });
  }

  // Copy to clipboard helper for location ID
  copyLocationIdToClipboard(id: string | number | undefined) {
    if (id == null) return;
    try {
      navigator.clipboard.writeText(String(id));
      this.assignSuccess = `Copied location ID #${id}`;
      setTimeout(() => (this.assignSuccess = ''), 1500);
    } catch {
      // Fallback for environments without clipboard API
      const temp = document.createElement('input');
      temp.value = String(id);
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      this.assignSuccess = `Copied location ID #${id}`;
      setTimeout(() => (this.assignSuccess = ''), 1500);
    }
  }

  // Quick assign handler
  quickAssign() {
    this.assignError = '';
    this.assignSuccess = '';
    if (!this.quickAssignEmployeeId || !this.quickAssignLocationId) {
      this.assignError = 'Enter both Employee ID and Location ID.';
      setTimeout(() => (this.assignError = ''), 2000);
      return;
    }
    this.assignEmployeeLocation(this.quickAssignEmployeeId, { id: this.quickAssignLocationId, name: '' });
  }

  // Global overview: backend with fallback to local/mock
  loadGlobalOverview() {
    this.isGlobalLoading = true;

    // Load users with fallback to AuthService mock/local
    this.superAdminService.getAllUsers().pipe(
      catchError(() => of(this.authService.getAllUsers().map(u => this.superAdminService.convertToUserDto(u))))
    ).subscribe({
      next: (userDtos) => {
        try {
          this.allUsers = userDtos.map(dto => this.superAdminService.convertToUser(dto));
        } catch {
          // If conversion fails, try using AuthService directly
          this.allUsers = this.authService.getAllUsers();
        }
        this.computeGlobalStatsPartial();
      },
      error: () => {
        this.allUsers = this.authService.getAllUsers();
        this.computeGlobalStatsPartial();
      }
    });

    // Load roles (best-effort)
    this.superAdminService.getAllRoles().pipe(catchError(() => of([]))).subscribe(roles => {
      this.allRoles = roles;
      this.computeGlobalStatsPartial();
    });

    // Load departments (best-effort)
    this.superAdminService.getAllDepartments().pipe(catchError(() => of([]))).subscribe(departments => {
      this.allDepartments = departments;
      this.computeGlobalStatsPartial();
    });

    // Load all department requests across known departments (fallback to empty)
    const departmentNames = ['IT', 'HR', 'FINANCE', 'MARKETING', 'OPERATIONS', 'SALES'];
    const requestCalls = departmentNames.map(dept =>
      this.assetRequestService.getDepartmentRequests(dept).pipe(catchError(() => of([])))
    );

    forkJoin(requestCalls).subscribe({
      next: (lists) => {
        this.allRequests = lists.flat();
        this.computeGlobalStatsPartial();
      },
      error: () => {
        this.allRequests = [];
        this.computeGlobalStatsPartial();
      }
    });
  }

  private computeGlobalStatsPartial() {
    // Compute only with what we already have; call multiple times until data settles
    const users = this.allUsers || [];
    const reqs = this.allRequests || [];

    this.globalStats.totalUsers = users.length;
    this.globalStats.activeUsers = users.filter(u => u.isActive).length;
    this.globalStats.adminUsers = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length;
    this.globalStats.departmentAdmins = users.filter(u => u.role === UserRole.DEPARTMENT_ADMIN).length;
    this.globalStats.employees = users.filter(u => u.role === UserRole.EMPLOYEE).length;

    this.globalStats.totalRequests = reqs.length;
    this.globalStats.pendingRequests = reqs.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    this.globalStats.approvedRequests = reqs.filter(r => (r.status || '').toLowerCase() === 'approved').length;
    this.globalStats.rejectedRequests = reqs.filter(r => (r.status || '').toLowerCase() === 'rejected').length;

    this.globalStats.totalDepartments = (this.allDepartments || []).length;
    this.globalStats.totalRoles = (this.allRoles || []).length;

    // Heuristic: stop showing loading once we have users and at least attempted requests
    this.isGlobalLoading = false;
  }

  // Convert display id like REQ-001 to numeric id if possible
  private parseNumericId(displayId: string): number {
    const m = /REQ-(\d+)/i.exec(displayId);
    if (m) return parseInt(m[1], 10);
    const n = parseInt(displayId as any, 10);
    return Number.isFinite(n) ? n : 0;
  }

  approveRequest(requestId: string) {
    this.updateError = '';
    const request = this.assetRequests.find(r => r.id === requestId);
    if (!request) return;

    // Enforce department boundary (prefer explicit employeeDepartment if present)
    const reqDept = (request as any).employeeDepartment || '';
    const isDeptKnown = !!reqDept && !!this.departmentName;
    const inDeptByDept = isDeptKnown && reqDept.toString().trim().toLowerCase() === this.departmentName.toString().trim().toLowerCase();
    const inDeptByMembership = this.departmentUsers.some(u => String(u.id) === String(request.employeeId));
    if (isDeptKnown ? !inDeptByDept : !inDeptByMembership) {
      this.updateError = 'You can only approve/reject requests for your department.';
      setTimeout(() => this.updateError = '', 3000);
      return;
    }

    const numericId =
      Number((request as any).rawId || (request as any).id) ||
      this.parseNumericId(requestId) ||
      this.parseNumericId(String((request as any).rawId || '')) ||
      this.parseNumericId(String((request as any).id || ''));
    if (!numericId) {
      // Optimistically update if we can’t parse id
      request.status = 'Approved';
      this.calculateStats();
      return;
    }

    this.updating[requestId] = true;
    // Apply optimistic update immediately
    request.status = 'Approved';
    this.calculateStats();
    this.applyFiltersAndPagination();

    // Try to update backend using department admin endpoint
    this.assetRequestService.approveDepartmentRequest(numericId, 'Approved by department admin').subscribe({
      next: (_updated) => {
        // Backend update successful - optimistic update already applied
        console.log('Request approved successfully in backend');
        this.updateSuccess = 'Approved successfully';
        setTimeout(() => this.updateSuccess = '', 2500);

        // Send decision email to the employee (best-effort) and notify admins
        const emp = this.departmentUsers.find(u => String(u.id) === String(request.employeeId));
        const email = (request as any).userEmail || emp?.email;
        this.assetRequestService.sendDecisionEmail(numericId, 'APPROVED', email, 'Approved by department admin').subscribe(() => {});
        this.assetRequestService.notifyAdminsOfDecision(numericId, 'APPROVED', this.departmentName).subscribe(() => {});

        // Notify other components about the status change and trigger data refresh
        this.assetRequestService.notifyRequestStatusUpdate(numericId, 'Approved', 'department-admin');
        this.assetRequestService.triggerRequestsRefresh();
        // Refresh this dashboard from backend to reflect canonical data
        this.loadDepartmentRequests();
      },
      error: (err) => {
        console.warn('Backend update failed, keeping optimistic update:', err);

        // Keep the optimistic update but show appropriate message
        this.updateSuccess = 'Approved successfully';
        setTimeout(() => this.updateSuccess = '', 3000);

        // Still notify about the status change (optimistic update)
        this.assetRequestService.notifyRequestStatusUpdate(numericId, 'Approved', 'department-admin-local');
        this.assetRequestService.triggerRequestsRefresh();
      },
      complete: () => {
        this.updating[requestId] = false;
      }
    });
  }

  rejectRequest(requestId: string) {
    this.updateError = '';
    const request = this.assetRequests.find(r => r.id === requestId);
    if (!request) return;

    // Enforce department boundary (prefer explicit employeeDepartment if present)
    const reqDept = (request as any).employeeDepartment || '';
    const isDeptKnown = !!reqDept && !!this.departmentName;
    const inDeptByDept = isDeptKnown && reqDept.toString().trim().toLowerCase() === this.departmentName.toString().trim().toLowerCase();
    const inDeptByMembership = this.departmentUsers.some(u => String(u.id) === String(request.employeeId));
    if (isDeptKnown ? !inDeptByDept : !inDeptByMembership) {
      this.updateError = 'You can only approve/reject requests for your department.';
      setTimeout(() => this.updateError = '', 3000);
      return;
    }

    const numericId =
      Number((request as any).rawId || (request as any).id) ||
      this.parseNumericId(requestId) ||
      this.parseNumericId(String((request as any).rawId || '')) ||
      this.parseNumericId(String((request as any).id || ''));
    if (!numericId) {
      request.status = 'Rejected';
      this.calculateStats();
      return;
    }

    this.updating[requestId] = true;
    // Apply optimistic update immediately
    request.status = 'Rejected';
    this.calculateStats();
    this.applyFiltersAndPagination();

    // Try to update backend using department admin endpoint
    this.assetRequestService.rejectDepartmentRequest(numericId, 'Rejected by department admin').subscribe({
      next: (_updated) => {
        // Backend update successful - optimistic update already applied
        console.log('Request rejected successfully in backend');
        this.updateSuccess = 'Rejected successfully';
        setTimeout(() => this.updateSuccess = '', 2500);

        // Send decision email to the employee (best-effort) and notify admins
        const emp = this.departmentUsers.find(u => String(u.id) === String(request.employeeId));
        const email = (request as any).userEmail || emp?.email;
        this.assetRequestService.sendDecisionEmail(numericId, 'REJECTED', email, 'Rejected by department admin').subscribe(() => {});
        this.assetRequestService.notifyAdminsOfDecision(numericId, 'REJECTED', this.departmentName).subscribe(() => {});

        // Notify other components about the status change and trigger data refresh
        this.assetRequestService.notifyRequestStatusUpdate(numericId, 'Rejected', 'department-admin');
        this.assetRequestService.triggerRequestsRefresh();
        // Refresh this dashboard from backend to reflect canonical data
        this.loadDepartmentRequests();
      },
      error: (err) => {
        console.warn('Backend update failed, keeping optimistic update:', err);

        // Keep the optimistic update but show appropriate message
        this.updateSuccess = 'Rejected successfully';
        setTimeout(() => this.updateSuccess = '', 3000);

        // Still notify about the status change (optimistic update)
        this.assetRequestService.notifyRequestStatusUpdate(numericId, 'Rejected', 'department-admin-local');
        this.assetRequestService.triggerRequestsRefresh();
      },
      complete: () => {
        this.updating[requestId] = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case 'pending':
        return 'bg-warning';
      case 'approved':
        return 'bg-success';
      case 'rejected':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  // Filter helpers to mirror employee dashboard behavior
  onStatusFilterChange(status: 'all'|'pending'|'approved'|'rejected') {
    this.selectedStatusFilter = status;
    this.currentPage = 1; // Reset to first page when filter changes
    this.applyFiltersAndPagination();
  }

  applyStatusFilter() {
    if (this.selectedStatusFilter === 'all') {
      this.filteredRequests = this.assetRequests;
    } else {
      const target = this.selectedStatusFilter;
      this.filteredRequests = this.assetRequests.filter(r => (r.status || '').toLowerCase() === target);
    }
  }

  // Combined method for applying filters, search, sorting, and pagination
  applyFiltersAndPagination() {
    let filtered = [...this.assetRequests];

    // Apply status filter
    if (this.selectedStatusFilter !== 'all') {
      filtered = filtered.filter(r => (r.status || '').toLowerCase() === this.selectedStatusFilter);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        (r.employeeName || '').toLowerCase().includes(term) ||
        (r.assetType || '').toLowerCase().includes(term) ||
        (r.priority || '').toLowerCase().includes(term) ||
        (r.status || '').toLowerCase().includes(term) ||
        (r.justification || '').toLowerCase().includes(term) ||
        (r.id || '').toLowerCase().includes(term)
      );
    }

    // Apply advanced text filter
    if (this.filterText.trim()) {
      const term = this.filterText.toLowerCase();
      filtered = filtered.filter(r =>
        (r.employeeName || '').toLowerCase().includes(term) ||
        (r.assetType || '').toLowerCase().includes(term) ||
        (r.justification || '').toLowerCase().includes(term) ||
        (r.id || '').toLowerCase().includes(term)
      );
    }

    // Apply priority filter
    if (this.filterPriority) {
      filtered = filtered.filter(r => (r.priority || '').toLowerCase() === this.filterPriority.toLowerCase());
    }

    // Apply asset type filter
    if (this.filterAssetType) {
      filtered = filtered.filter(r => (r.assetType || '').toLowerCase() === this.filterAssetType.toLowerCase());
    }

    // Apply date range filter
    if (this.filterDateFrom) {
      const fromDate = new Date(this.filterDateFrom);
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.date);
        return requestDate >= fromDate;
      });
    }

    if (this.filterDateTo) {
      const toDate = new Date(this.filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.date);
        return requestDate <= toDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (this.sortColumn) {
        case 'employeeName':
          aVal = (a.employeeName || '').toLowerCase();
          bVal = (b.employeeName || '').toLowerCase();
          break;
        case 'assetType':
          aVal = (a.assetType || '').toLowerCase();
          bVal = (b.assetType || '').toLowerCase();
          break;
        case 'priority':
          // Custom priority sorting: urgent > high > medium > low
          const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aVal = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
          bVal = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          aVal = (a.status || '').toLowerCase();
          bVal = (b.status || '').toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.date || 0).getTime();
          bVal = new Date(b.date || 0).getTime();
          break;
        default:
          aVal = a.id || '';
          bVal = b.id || '';
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Update filtered requests
    this.filteredRequests = filtered;

    // Calculate pagination
    this.totalPages = Math.ceil(filtered.length / this.pageSize);

    // Ensure current page is valid
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRequests = filtered.slice(startIndex, endIndex);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-danger';
      case 'high':
        return 'bg-warning';
      case 'medium':
        return 'bg-info';
      case 'low':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.DEPARTMENT_ADMIN:
        return 'bg-warning';
      case UserRole.EMPLOYEE:
        return 'bg-secondary';
      case UserRole.STORE_MANAGER:
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  // Load locations for current department
  loadLocations() {
    this.locationService.getLocations(this.departmentName).subscribe({
      next: (list) => {
        // If backend doesn't filter by department, filter on client
        const dept = (this.departmentName || '').toLowerCase();
        this.locations = (list || []).filter(l => (l.department || '').toLowerCase() === dept || !dept);
        // After locations are loaded, recompute approval stats overlay
        this.loadLocationApprovalStats();
      },
      error: (err) => {
        console.error('Failed to load locations', err);
        this.locations = [];
      }
    });
  }

  // Helper to create a Location for current department (e.g., Pune Office in IT)
  createLocationForDepartment(name: string) {
    const payload = { name, department: this.departmentName };
    this.locationService.createLocation(payload).subscribe({
      next: (created) => {
        // Show the created location with its ID for direct assignment
        this.lastCreatedLocation = created || { name: payload.name, department: payload.department };
        this.newLocationName = '';
        this.loadLocations();
      },
      error: (err) => {
        console.error('Failed to create location', err);
      }
    });
  }



  // Check if we should use development mode (backend not available)
  private isBackendUnavailable(error: any): boolean {
    return error.status === 401 || error.status === 403 || error.status === 0;
  }

  // Generate mock department requests for development
  private generateMockDepartmentRequests(): any[] {
    const mockRequests = [
      {
        id: 1,
        assetType: 'Laptop',
        priority: 'High',
        justification: 'Need for development work',
        status: 'Pending',
        requestDate: new Date().toISOString(),
        user: { id: 1, name: 'John Doe', email: 'john.doe@company.com' }
      },
      {
        id: 2,
        assetType: 'Monitor',
        priority: 'Medium',
        justification: 'Additional screen for productivity',
        status: 'Pending',
        requestDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        user: { id: 2, name: 'Jane Smith', email: 'jane.smith@company.com' }
      },
      {
        id: 3,
        assetType: 'Keyboard',
        priority: 'Low',
        justification: 'Current keyboard is broken',
        status: 'Approved',
        requestDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        user: { id: 3, name: 'Bob Johnson', email: 'bob.johnson@company.com' }
      }
    ];

    console.log('Generated mock department requests:', mockRequests);
    return mockRequests;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}