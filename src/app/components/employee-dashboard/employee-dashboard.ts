import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AssetRequestService } from '../../services/asset-request.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.model';
import { AssetRequest, CreateAssetRequest, AssetType, AssetRequestPriority, AssetRequestStatus } from '../../models/asset-request.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  assetRequests: AssetRequest[] = [];
  filteredRequests: AssetRequest[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Filter state
  selectedStatusFilter = 'all';
  
  // New request form
  newRequest: CreateAssetRequest = {
    assetType: '',
    priority: '',
    justification: ''
  };
  
  // Enums for template
  AssetType = AssetType;
  AssetRequestPriority = AssetRequestPriority;
  AssetRequestStatus = AssetRequestStatus;

  // Statistics
  stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  // Single source of truth for which employeeId we load/persist under
  resolvedEmployeeId: number | null = null;

  // Real-time update subscriptions
  private statusUpdateSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  private pollingInterval?: any;

  // View details modal
  showDetailsModal = false;
  selectedRequest: AssetRequest | null = null;

  // Enhanced Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 0;
  paginatedRequests: AssetRequest[] = [];

  // Enhanced Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Advanced Filtering
  filterText = '';
  filterPriority = '';
  filterAssetType = '';
  filterStatus = '';
  filterDateFrom = '';
  filterDateTo = '';

  constructor(
    private authService: AuthService, 
    private assetRequestService: AssetRequestService,
    private router: Router
  ) {}

  // ===== Persistence helpers (per-employee cache) =====
  private getStorageKey(userId: number) {
    return `employee_requests_${userId}`;
  }

  // Department cache key to keep department admin dashboard in sync
  private getDeptKey(dept: string | undefined) {
    return `department_requests_${dept || 'Unknown'}`;
  }

  private getCachedRequests(userId: number): AssetRequest[] | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AssetRequest[]) : null;
    } catch {
      return null;
    }
  }

  private setCachedRequests(userId: number, requests: AssetRequest[]) {
    localStorage.setItem(this.getStorageKey(userId), JSON.stringify(requests));
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      console.log('Current user on dashboard init:', this.currentUser);
      console.log('Token in localStorage:', localStorage.getItem('token'));
      console.log('User logged in status:', this.authService.isLoggedIn());

      // Resolve a consistent employeeId used across cache and API
      const parsedId = Number(this.currentUser.id);
      this.resolvedEmployeeId = Number.isFinite(parsedId) ? parsedId : 1; // fallback to 1 for testing only

      // Ensure proper authentication setup
      this.setupAuthentication();

      // Load asset requests from backend
      this.loadAssetRequests();

      // Set up real-time status update listeners
      this.setupRealTimeUpdates();

      // Set up polling as backup (every 30 seconds)
      this.setupPolling();
    } else {
      this.errorMessage = 'No user found. Please log in again.';
      this.router.navigate(['/login']);
    }
  }

  // Setup proper authentication for backend API calls
  setupAuthentication() {
    console.log('=== Setting up Employee Authentication ===');

    if (!this.currentUser) {
      console.error('No current user found');
      this.router.navigate(['/login']);
      return;
    }

    // Ensure we have a valid token for backend calls
    const token = localStorage.getItem('token');
    if (!token || token === 'mock-jwt-token-1234567890') {
      console.log('Setting up session authentication for employee');

      // Try to create session auth for the current user
      try {
        const authResponse = this.authService['createSessionAuth'](
          this.currentUser.id,
          this.currentUser.email || 'employee@example.com',
          'employee'
        );
        console.log('Employee session auth created:', authResponse);

        localStorage.setItem('token', 'session-auth');
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      } catch (error) {
        console.warn('Could not create session auth, using existing token');
        localStorage.setItem('token', 'session-auth');
      }
    }

    console.log('Employee authentication setup complete:', {
      user: this.currentUser,
      userId: this.resolvedEmployeeId,
      token: localStorage.getItem('token'),
      isLoggedIn: this.authService.isLoggedIn()
    });
  }

  // Ensure authentication is ready before making API calls
  ensureAuthentication() {
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('currentUser');

    if (!token || !currentUser) {
      console.log('Missing authentication data, setting up...');
      this.setupAuthentication();
    }

    // Verify the user data is consistent
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        if (userData.id !== this.currentUser?.id) {
          console.log('User data mismatch, updating...');
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
      } catch (error) {
        console.warn('Invalid user data in localStorage, fixing...');
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }
    }
  }

  // Retry submitting request with fresh authentication
  retrySubmitRequest() {
    console.log('=== Retrying Request Submission ===');

    // Clear any existing error messages
    this.errorMessage = '';

    // Refresh authentication
    this.setupAuthentication();

    // Wait a moment for auth to settle, then retry
    setTimeout(() => {
      this.submitNewRequest();
    }, 500);
  }



  // Remove hardcoded testing method – use resolvedEmployeeId consistently
  testApiWithHardcodedId() {
    // Kept for compatibility, but delegate to loadAssetRequests using resolvedEmployeeId
    this.loadAssetRequests();
  }

  loadAssetRequests() {
    if (!this.currentUser) return;

    this.isLoading = true;
    this.errorMessage = '';

    const employeeId = this.resolvedEmployeeId ?? Number(this.currentUser.id);

    // Debug logging
    console.log('Current user:', this.currentUser);
    console.log('Resolved Employee ID:', employeeId);

    if (!Number.isFinite(employeeId)) {
      this.errorMessage = 'Invalid user ID. Please log in again.';
      this.isLoading = false;
      return;
    }

    // 1) Hydrate from cache first for immediate UI consistency
    const cached = this.getCachedRequests(employeeId);
    if (cached) {
      this.assetRequests = cached.map(r => ({
        ...r,
        status: this.normalizeStatus((r as any).status || r.status),
        requestDate: (r as any).requestDate || (r as any).request_date || (r as any).date || new Date().toISOString()
      }));
      this.calculateStats();
      this.applyFiltersAndPagination();
    }

    // 2) Fetch from API
    this.assetRequestService.getEmployeeRequests(employeeId).subscribe({
      next: (requests) => {
        this.assetRequests = (requests || []).map(r => ({
          ...r,
          status: this.normalizeStatus(r.status || (r as any).status),
          requestDate: r.requestDate || (r as any).request_date || (r as any).date || new Date().toISOString()
        }));
        this.calculateStats();
        this.applyFiltersAndPagination();
        // 3) Save fresh data to cache
        this.setCachedRequests(employeeId, this.assetRequests);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        const serverMsg = this.extractServerMessage(error);

        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Authentication failed. Please log in again.';
          this.router.navigate(['/login']);
          return;
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to backend server. Please check your connection.';
        } else if (error.status === 404) {
          if (!cached) {
            this.assetRequests = [];
            this.filteredRequests = [];
            this.calculateStats();
            this.applyFiltersAndPagination();
          }
          this.errorMessage = serverMsg || 'No requests found or API endpoint not available.';
        } else if (error.status === 500) {
          this.errorMessage = serverMsg || 'Server error while loading requests. Please try again later.';
        } else {
          if (!cached) {
            this.assetRequests = [];
            this.filteredRequests = [];
            this.calculateStats();
            this.applyFiltersAndPagination();
          }
          this.errorMessage = '';
        }

        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.stats.total = this.assetRequests.length;
    this.stats.pending = this.assetRequests.filter(r => this.normalizeStatus(r.status).toLowerCase() === 'pending').length;
    this.stats.approved = this.assetRequests.filter(r => this.normalizeStatus(r.status).toLowerCase() === 'approved').length;
    this.stats.rejected = this.assetRequests.filter(r => this.normalizeStatus(r.status).toLowerCase() === 'rejected').length;
  }

  applyStatusFilter() {
    this.applyFiltersAndPagination();
  }

  onStatusFilterChange(status: string) {
    this.selectedStatusFilter = status;
    this.applyStatusFilter();
  }

  submitNewRequest() {
    if (!this.currentUser || !this.newRequest.assetType || !this.newRequest.priority || !this.newRequest.justification.trim()) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    let employeeId = parseInt(this.currentUser.id);

    // Use hardcoded ID for testing if current user ID is invalid
    if (isNaN(employeeId)) {
      console.warn('Invalid user ID, using hardcoded ID 1 for testing');
      employeeId = 1;
    }

    console.log('=== Submitting Asset Request ===');
    console.log('Employee ID:', employeeId);
    console.log('Current User:', this.currentUser);
    console.log('Token available:', !!localStorage.getItem('token'));
    console.log('Token value:', localStorage.getItem('token'));
    console.log('User logged in status:', this.authService.isLoggedIn());
    console.log('Request payload:', this.newRequest);

    // Ensure authentication is properly set up before submitting
    this.ensureAuthentication();

    this.assetRequestService.createAssetRequest(employeeId, this.newRequest).subscribe({
      next: (newRequest) => {
        this.successMessage = 'Asset request submitted successfully!';
        this.assetRequests.unshift({
          ...newRequest,
          status: this.normalizeStatus((newRequest as any).status || newRequest.status),
          requestDate: (newRequest as any).requestDate || (newRequest as any).request_date || (newRequest as any).date || new Date().toISOString()
        } as AssetRequest);
        this.calculateStats();
        this.applyStatusFilter();
        // Save updated list to cache
        this.setCachedRequests(employeeId, this.assetRequests);
        
        // Also update department cache so department admin dashboard stays in sync
        try {
          const deptKey = this.getDeptKey(this.currentUser?.department);
          console.log('Updating department cache with key:', deptKey);
          console.log('New request data:', newRequest);

          const prevRaw = localStorage.getItem(deptKey);
          let arr: AssetRequest[] = [];
          if (prevRaw) {
            try { arr = JSON.parse(prevRaw) || []; } catch { arr = []; }
          }

          // Ensure the request has proper format for department admin
          const formattedRequest = {
            ...newRequest,
            user: {
              id: employeeId,
              name: this.currentUser?.name || this.currentUser?.username || 'Unknown',
              email: this.currentUser?.email || 'unknown@example.com',
              role: 'employee',
              department: this.currentUser?.department || 'Unknown'
            },
            requestDate: (newRequest as any).requestDate || (newRequest as any).request_date || new Date().toISOString(),
            status: this.normalizeStatus((newRequest as any).status || newRequest.status || 'Pending')
          };

          arr.unshift(formattedRequest as AssetRequest);
          localStorage.setItem(deptKey, JSON.stringify(arr));

          console.log('Department cache updated successfully');
          console.log('Cache now contains:', arr.length, 'requests');

          // Trigger a custom event to notify department admin dashboard
          window.dispatchEvent(new CustomEvent('departmentRequestsUpdated', {
            detail: { department: this.currentUser?.department, newRequest: formattedRequest }
          }));

        } catch (error) {
          console.error('Error updating department cache:', error);
        }

        this.resetForm();
        this.isLoading = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error creating request:', error);

        // Enhanced debugging for authentication errors
        console.log('Request payload that failed:', this.newRequest);
        console.log('Employee ID used:', employeeId);
        console.log('Current token:', localStorage.getItem('token'));
        console.log('API URL being called:', `${this.assetRequestService['employeeBase']}/requests`);

        // Handle authentication and connection errors properly
        if (error.status === 401 || error.status === 403) {
          console.warn('Authentication error, trying to refresh authentication');

          // Try to refresh authentication before giving up
          this.setupAuthentication();

          this.errorMessage = 'Authentication issue detected. Please try submitting again, or refresh the page if the problem persists.';

          // Only redirect to login after multiple failures or if no user
          if (!this.currentUser) {
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to backend server. Please check your connection and try again.';
        } else if (error.status === 400) {
          this.errorMessage = 'Invalid request data. Please check all fields.';
        } else if (error.status === 404) {
          this.errorMessage = 'API endpoint not found. Please contact support.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error. Please try again later.';
        } else {
          // Quiet fallback for other statuses
          this.errorMessage = '';
        }
        
        this.isLoading = false;
      }
    });
  }

  resetForm() {
    this.newRequest = {
      assetType: '',
      priority: '',
      justification: ''
    };
  }

  getAssetIcon(assetType: string): string {
    switch (assetType.toLowerCase()) {
      case 'laptop': return 'bi-laptop';
      case 'monitor': return 'bi-display';
      case 'keyboard': return 'bi-keyboard';
      case 'mouse': return 'bi-mouse';
      case 'headset': return 'bi-headphones';
      case 'printer': return 'bi-printer';
      case 'phone': return 'bi-phone';
      case 'tablet': return 'bi-tablet';
      default: return 'bi-gear';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'low': return 'badge bg-success';
      case 'medium': return 'badge bg-warning text-dark';
      case 'high': return 'badge bg-danger';
      case 'urgent': return 'badge bg-dark';
      default: return 'badge bg-secondary';
    }
  }

  getStatusBadgeClass(status: string): string {
    const s = this.normalizeStatus(status).toLowerCase();
    switch (s) {
      case 'pending': return 'badge bg-warning text-dark';
      case 'approved': return 'badge bg-success';
      case 'rejected': return 'badge bg-danger';
      case 'in progress': return 'badge bg-info';
      case 'completed': return 'badge bg-primary';
      default: return 'badge bg-secondary';
    }
  }

  // Normalize backend status variants (e.g., PENDING, Pending)
  private normalizeStatus(status: string | undefined | null): string {
    const s = (status || '').toString().trim().toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'approved') return 'Approved';
    if (s === 'rejected') return 'Rejected';
    if (s === 'in progress' || s === 'in_progress' || s === 'inprogress') return 'In Progress';
    if (s === 'completed' || s === 'complete') return 'Completed';
    return status || 'Pending';
  }

  // Extract meaningful server error message from HttpErrorResponse and suppress generic ones
  private extractServerMessage(error: any): string | null {
    const isGeneric = (msg: string | undefined | null) => {
      const m = (msg || '').toString().trim();
      return m === 'Something went wrong. Please try again.';
    };

    try {
      if (typeof (error?.error) === 'string') {
        // Try parse string body
        const parsed = JSON.parse(error.error);
        const msg = (parsed?.message || parsed?.error || null) as string | null;
        return isGeneric(msg) ? null : msg;
      }
      if (typeof (error?.error) === 'object' && error.error) {
        const msg = (error.error.message || error.error.error || null) as string | null;
        return isGeneric(msg) ? null : msg;
      }
      if (typeof error === 'string') {
        const parsed = JSON.parse(error);
        const msg = (parsed?.message || parsed?.error || null) as string | null;
        return isGeneric(msg) ? null : msg;
      }
    } catch {}
    return null;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  trackByRequestId(_index: number, request: AssetRequest): number {
    return request.id;
  }

  viewRequestDetails(requestId: number) {
    console.log('View details for request:', requestId);

    // Find the request in the current list
    const request = this.assetRequests.find(r => r.id === requestId);

    if (request) {
      this.selectedRequest = request;
      this.showDetailsModal = true;
      console.log('Showing details for request:', request);
    } else {
      console.warn('Request not found:', requestId);
      this.errorMessage = 'Request not found. Please refresh the page and try again.';
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }

  // Close the details modal
  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedRequest = null;
  }

  // Download particular transaction detail in table format
  downloadTransactionDetail(request: AssetRequest) {
    if (!request) {
      this.errorMessage = 'No transaction selected for download';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    console.log('=== Downloading Transaction Detail ===');
    console.log('Request:', request);

    // Create detailed transaction data in table format
    const transactionDetails = [
      { Field: 'Request ID', Value: request.id?.toString() || 'N/A' },
      { Field: 'Employee Name', Value: this.currentUser?.name || this.currentUser?.username || 'Unknown' },
      { Field: 'Employee ID', Value: this.currentUser?.id || 'N/A' },
      { Field: 'Department', Value: this.currentUser?.department || 'N/A' },
      { Field: 'Employee Email', Value: this.currentUser?.email || 'N/A' },
      { Field: 'Asset Type', Value: request.assetType || 'N/A' },
      { Field: 'Priority', Value: request.priority || 'N/A' },
      { Field: 'Status', Value: request.status || 'N/A' },
      { Field: 'Request Date', Value: this.formatDateForDownload(request.requestDate) },
      { Field: 'Justification', Value: request.justification || 'N/A' },
      { Field: 'User Info - Name', Value: request.user?.name || 'N/A' },
      { Field: 'User Info - Email', Value: request.user?.email || 'N/A' },
      { Field: 'User Info - Department', Value: request.user?.department || 'N/A' },
      { Field: 'User Info - Role', Value: request.user?.role || 'N/A' }
    ];

    // Generate filename with request ID and current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Transaction_Detail_${request.id}_${currentDate}.csv`;

    // Download as CSV in table format
    this.downloadAsCSV(transactionDetails, filename);

    this.successMessage = `Transaction detail for Request #${request.id} downloaded successfully`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Download all employee's transactions in table format
  downloadAllMyTransactions() {
    if (this.assetRequests.length === 0) {
      this.errorMessage = 'No transactions available to download';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    console.log('=== Downloading All My Transactions ===');

    // Create comprehensive transaction data
    const allTransactionsData = this.assetRequests.map((request, index) => ({
      'S.No': index + 1,
      'Request ID': request.id?.toString() || 'N/A',
      'Employee Name': this.currentUser?.name || this.currentUser?.username || 'Unknown',
      'Employee ID': this.currentUser?.id || 'N/A',
      'Department': this.currentUser?.department || 'N/A',
      'Employee Email': this.currentUser?.email || 'N/A',
      'Asset Type': request.assetType || 'N/A',
      'Priority': request.priority || 'N/A',
      'Status': request.status || 'N/A',
      'Request Date': this.formatDateForDownload(request.requestDate),
      'Justification': request.justification || 'N/A',
      'User Info - Name': request.user?.name || 'N/A',
      'User Info - Email': request.user?.email || 'N/A',
      'User Info - Department': request.user?.department || 'N/A',
      'User Info - Role': request.user?.role || 'N/A'
    }));

    // Generate filename
    const currentDate = new Date().toISOString().split('T')[0];
    const employeeName = (this.currentUser?.name || this.currentUser?.username || 'Employee').replace(/\s+/g, '_');
    const filename = `All_Transactions_${employeeName}_${currentDate}.csv`;

    // Download as CSV
    this.downloadAsCSV(allTransactionsData, filename);

    this.successMessage = `All ${this.assetRequests.length} transactions downloaded successfully`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Helper method to format date for download
  private formatDateForDownload(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  // Helper method to convert data to CSV and download
  private downloadAsCSV(data: any[], filename: string) {
    if (data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV
        if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += values.join(',') + '\n';
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
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
    this.filterPriority = '';
    this.filterAssetType = '';
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.selectedStatusFilter = 'all';
    this.applyFiltersAndPagination();
  }

  // Get unique values for filter dropdowns
  getUniqueAssetTypes(): string[] {
    const types = [...new Set(this.assetRequests.map(r => r.assetType))];
    return types.filter((type): type is string => type != null && type.trim() !== '');
  }

  getUniquePriorities(): string[] {
    const priorities = [...new Set(this.assetRequests.map(r => r.priority))];
    return priorities.filter((priority): priority is string => priority != null && priority.trim() !== '');
  }

  // Enhanced Pagination methods
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

  // Enhanced combined method for applying filters, search, sorting, and pagination
  applyFiltersAndPagination() {
    let filtered = [...this.assetRequests];

    // Apply status filter
    if (this.selectedStatusFilter !== 'all') {
      filtered = filtered.filter(r => this.normalizeStatus(r.status).toLowerCase() === this.selectedStatusFilter.toLowerCase());
    }

    // Apply advanced text filter
    if (this.filterText.trim()) {
      const term = this.filterText.toLowerCase();
      filtered = filtered.filter(r =>
        (r.assetType || '').toLowerCase().includes(term) ||
        (r.priority || '').toLowerCase().includes(term) ||
        (r.status || '').toLowerCase().includes(term) ||
        (r.justification || '').toLowerCase().includes(term) ||
        (r.id?.toString() || '').toLowerCase().includes(term)
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

    // Apply status filter (additional)
    if (this.filterStatus) {
      filtered = filtered.filter(r => this.normalizeStatus(r.status).toLowerCase() === this.filterStatus.toLowerCase());
    }

    // Apply date range filter
    if (this.filterDateFrom) {
      const fromDate = new Date(this.filterDateFrom);
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.requestDate);
        return requestDate >= fromDate;
      });
    }

    if (this.filterDateTo) {
      const toDate = new Date(this.filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(r => {
        const requestDate = new Date(r.requestDate);
        return requestDate <= toDate;
      });
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

    this.filteredRequests = filtered;

    // Apply pagination
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRequests = filtered.slice(startIndex, endIndex);
  }



  editRequest(requestId: number) {
    // TODO: Implement edit functionality
    console.log('Edit request:', requestId);
  }

  resubmitRequest(requestId: number) {
    console.log('Resubmit request:', requestId);
    this.setStatus(requestId, 'PENDING');
  }

  cancelRequest(requestId: number) {
    console.log('Cancel request:', requestId);
    // TODO: Implement cancel functionality with backend
    this.errorMessage = 'Cancel functionality will be implemented soon.';
    setTimeout(() => this.errorMessage = '', 3000);
  }

  // Employee is not allowed to change status; backend returns only PENDING for employee view
  setStatus(_requestId: number, _status: 'APPROVED'|'REJECTED'|'PENDING') {
    this.errorMessage = '';
    this.successMessage = '';
  }









  // Set up real-time status update listeners
  private setupRealTimeUpdates() {
    // Listen for status updates from department admin
    this.statusUpdateSubscription = this.assetRequestService.requestStatusUpdated$.subscribe(
      (updateData) => {
        console.log('Received status update notification:', updateData);
        this.handleStatusUpdate(updateData);
      }
    );

    // Listen for refresh requests
    this.refreshSubscription = this.assetRequestService.requestsRefreshNeeded$.subscribe(
      (needsRefresh) => {
        if (needsRefresh) {
          console.log('Refreshing requests due to external update');
          this.loadAssetRequests();
          this.assetRequestService.clearRefreshFlag();
        }
      }
    );
  }





  // Test authentication flow - call this from browser console if needed
  testAuthentication(): void {
    console.log('=== Testing Authentication Flow ===');
    this.authService.testLogin().subscribe({
      next: (response) => {
        console.log('Authentication test successful:', response);
      },
      error: (error) => {
        console.error('Authentication test failed:', error);
      }
    });
  }

  // Force session-based authentication for user 21 (from your database)
  forceSessionAuth(): void {
    console.log('=== Forcing Session Authentication for User 21 ===');

    // Clear any existing invalid tokens
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');

    // Create session auth for user 21 (matches your database)
    const authResponse = this.authService['createSessionAuth']('21', 'test@example.com', 'employee');
    console.log('Session auth created:', authResponse);

    // Reload requests with new auth
    this.loadAssetRequests();

    this.successMessage = 'Session authentication set for User 21. Try creating a request now.';
    setTimeout(() => this.successMessage = '', 5000);
  }

  // Set up polling as backup for real-time updates
  private setupPolling() {
    // Poll every 30 seconds to check for status updates
    this.pollingInterval = setInterval(() => {
      if (this.resolvedEmployeeId) {
        console.log('Polling for request updates...');
        this.loadAssetRequests();
      }
    }, 30000); // 30 seconds
  }

  // Handle individual status updates
  private handleStatusUpdate(updateData: {requestId: number, status: string, updatedBy: string}) {
    const request = this.assetRequests.find(r => r.id === updateData.requestId);
    if (request) {
      const oldStatus = request.status;
      request.status = updateData.status;

      // Update filtered and paginated views
      this.calculateStats();
      this.applyStatusFilter();

      // Show notification to user
      const updatedByText = updateData.updatedBy.includes('local') ? 'Department Admin (Local)' : 'Department Admin';
      this.successMessage = `Request #${updateData.requestId} status updated to "${updateData.status}" by ${updatedByText}`;
      setTimeout(() => this.successMessage = '', 4000);

      console.log(`Request ${updateData.requestId} status changed from "${oldStatus}" to "${updateData.status}"`);
    }
  }

  ngOnDestroy() {
    // Clean up subscriptions
    if (this.statusUpdateSubscription) {
      this.statusUpdateSubscription.unsubscribe();
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    // Clean up polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}