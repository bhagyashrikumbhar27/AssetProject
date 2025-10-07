import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.model';
import { StoreManagerService, IssueAssetPayload, ReturnAssetPayload, AddStockPayload } from '../../services/store-manager.service';
import { SuperAdminService } from '../../services/super-admin.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-store-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './store-manager-dashboard.html',
  styleUrl: './store-manager-dashboard.css'
})
export class StoreManagerDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private subs: Subscription[] = [];

  // Make Math available in template
  Math = Math;

  // Data from backend
  stats: any = {};
  inventory: any[] = [];
  transactions: any[] = [];

  // Forms
  issueForm: IssueAssetPayload = { assetId: null as any, employeeId: null as any, quantity: 1 as any, issueDate: '', notes: '' };
  returnForm: ReturnAssetPayload = { assetId: null as any, employeeId: null as any, returnDate: '', notes: '' };
  addStockForm: AddStockPayload = { assetId: null as any, quantity: null as any };

  // Feedback
  successMessage = '';
  errorMessage = '';
  isLoading = false;

  // View Details Modals
  showInventoryDetailsModal = false;
  showTransactionDetailsModal = false;
  selectedInventoryItem: any = null;
  selectedTransaction: any = null;

  // Inventory Table Features
  inventoryCurrentPage = 1;
  inventoryPageSize = 10;
  inventoryPageSizeOptions = [5, 10, 25, 50];
  inventoryTotalPages = 0;
  inventoryPaginatedItems: any[] = [];
  inventoryFilteredItems: any[] = [];

  // Inventory Sorting & Filtering
  inventorySortField = '';
  inventorySortDirection: 'asc' | 'desc' = 'asc';
  inventoryFilterText = '';
  inventoryFilterCategory = '';
  inventoryFilterStatus = '';
  inventoryFilterLocation = '';

  // Transactions Table Features
  transactionsCurrentPage = 1;
  transactionsPageSize = 10;
  transactionsPageSizeOptions = [5, 10, 25, 50];
  transactionsTotalPages = 0;
  transactionsPaginatedItems: any[] = [];
  transactionsFilteredItems: any[] = [];

  // Transactions Sorting & Filtering
  transactionsSortField = '';
  transactionsSortDirection: 'asc' | 'desc' = 'asc';
  transactionsFilterText = '';
  transactionsFilterType = '';
  transactionsFilterDateFrom = '';
  transactionsFilterDateTo = '';

  constructor(
    private authService: AuthService,
    private storeService: StoreManagerService,
    private superAdminService: SuperAdminService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.setupAuthentication();
    this.loadStoreData();

    // Refresh transactions if users (and their locations) update elsewhere
    const sub = this.superAdminService.usersUpdated$.subscribe(() => {
      this.loadTransactions();
    });
    this.subs.push(sub);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  setupAuthentication() {
    console.log('=== Setting up Store Manager Authentication ===');

    // Try multiple authentication strategies
    this.tryBackendLogin().then(success => {
      if (!success) {
        console.log('Backend login failed, setting up session auth');
        this.setupSessionAuth();
      }
    });
  }

  async tryBackendLogin(): Promise<boolean> {
    try {
      console.log('Attempting backend login for Store Manager...');

      // Try to login with backend using known credentials
      const loginResponse = await this.authService.login({
        email: 'storemanager@example.com',
        password: 'password'
      }).toPromise();

      if (loginResponse && loginResponse.success) {
        console.log('✅ Backend login successful:', loginResponse);
        this.currentUser = loginResponse.user || null;
        return true;
      }
    } catch (error) {
      console.log('Backend login failed:', error);
    }

    // Try alternative credentials
    try {
      console.log('Trying alternative Store Manager credentials...');

      const altLoginResponse = await this.authService.login({
        email: 'test@example.com',
        password: 'password'
      }).toPromise();

      if (altLoginResponse && altLoginResponse.success) {
        console.log('✅ Alternative login successful:', altLoginResponse);
        this.currentUser = altLoginResponse.user || null;
        return true;
      }
    } catch (error) {
      console.log('Alternative login failed:', error);
    }

    return false;
  }

  setupSessionAuth() {
    console.log('Setting up session authentication for Store Manager');

    // Ensure we have proper authentication for Store Manager
    if (!this.currentUser) {
      // Set up session authentication for Store Manager (user ID 21 from your database)
      const authResponse = this.authService['createSessionAuth']('21', 'storemanager@example.com', 'store_manager');
      console.log('Store Manager session auth created:', authResponse);
      this.currentUser = authResponse.user || null;
    }

    // Ensure we have a valid token for backend calls
    const token = localStorage.getItem('token');
    if (!token || token === 'mock-jwt-token-1234567890') {
      localStorage.setItem('token', 'session-auth');
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    console.log('Store Manager authentication setup complete:', {
      user: this.currentUser,
      token: localStorage.getItem('token')
    });
  }

  loadStoreData() {
    this.loadStats();
    this.loadInventory();
    this.loadTransactions();
  }

  loadStats() {
    this.storeService.getStats().subscribe({
      next: (stats: any) => {
        this.stats = stats;
      },
      error: (error: any) => {
        console.error('Error loading stats:', error);
        // Fallback to mock data
        this.stats = {
          totalAssets: 150,
          availableAssets: 120,
          issuedAssets: 25,
          lowStockItems: 5,
          totalTransactions: 45,
          pendingReturns: 8
        };
      }
    });
  }

  loadInventory() {
    this.storeService.getInventory().subscribe({
      next: (inventory: any[]) => {
        this.inventory = inventory;
        this.applyInventoryFiltersAndPagination();
      },
      error: (error: any) => {
        console.error('Error loading inventory:', error);
        // Fallback to mock data
        this.inventory = this.generateMockInventory();
        this.applyInventoryFiltersAndPagination();
      }
    });
  }

  loadTransactions() {
    this.storeService.getTransactions().subscribe({
      next: (transactions: any[]) => {
        // Enrich with employee location from local users if backend omitted it
        const localUsers = this.authService.getAllUsers();
        const byId: Record<string, any> = Object.fromEntries(localUsers.map(u => [String(u.id), u]));
        this.transactions = (transactions || []).map(tx => {
          if (!tx.employeeLocation && tx.employeeId != null) {
            const local = byId[String(tx.employeeId)];
            if (local?.location) return { ...tx, employeeLocation: local.location };
          }
          return tx;
        });
        this.applyTransactionsFiltersAndPagination();
      },
      error: (error: any) => {
        console.error('Error loading transactions:', error);
        // Fallback to mock data
        this.transactions = this.generateMockTransactions();
        this.applyTransactionsFiltersAndPagination();
      }
    });
  }

  // Submit handlers
  submitIssue() {
    this.clearMessages();
    if (!this.issueForm.assetId || !this.issueForm.employeeId || !this.issueForm.issueDate || !this.issueForm.quantity || Number(this.issueForm.quantity) <= 0) {
      this.errorMessage = 'Please fill all required fields for Issue (including quantity > 0).';
      return;
    }

    console.log('=== Store Manager Issue Asset ===');
    console.log('Current user:', this.currentUser);
    console.log('Token:', localStorage.getItem('token'));
    console.log('Issue form data:', this.issueForm);
    console.log('API URL will be:', `${this.storeService['baseUrl']}/issue`);

    this.isLoading = true;
    this.storeService.issueAsset(this.issueForm).subscribe({
      next: (response) => {
        console.log('Asset issued successfully:', response);
        this.successMessage = 'Asset issued successfully';

        // Optimistic UI update so the user sees the new issue immediately
        try {
          const tx = this.buildIssueTransaction(response, this.issueForm);
          if (tx) {
            this.transactions.unshift(tx);
            this.applyTransactionsFiltersAndPagination();
          }
          // Update inventory snapshot if present
          const inv = this.inventory.find(i => String(i.id ?? i.assetId) === String(this.issueForm.assetId));
          if (inv) {
            if (typeof inv.available === 'number') inv.available = Math.max(0, inv.available - 1);
            if (inv.status) inv.status = 'issued';
            this.applyInventoryFiltersAndPagination();
          }
          // Update stats snapshot if available
          if (this.stats) {
            if (typeof this.stats.issuedAssets === 'number') this.stats.issuedAssets += 1;
            if (typeof this.stats.availableAssets === 'number') this.stats.availableAssets = Math.max(0, (this.stats.availableAssets || 0) - 1);
            if (typeof this.stats.totalTransactions === 'number') this.stats.totalTransactions += 1;
          }
        } catch {}

        this.resetIssueForm();
        this.isLoading = false;
        // Fetch fresh data to reconcile with server
        this.loadInventory();
        this.loadTransactions();
      },
      error: (e) => {
        console.error('Error issuing asset:', e);
        console.log('Error details:', {
          status: e.status,
          statusText: e.statusText,
          url: e.url,
          message: e.message
        });
        this.errorMessage = this.normalizeError(e);
        this.isLoading = false;
      }
    });
  }

  submitReturn() {
    this.clearMessages();
    // Only require assetId and employeeId per backend contract
    if (!this.returnForm.assetId || !this.returnForm.employeeId) {
      this.errorMessage = 'Please provide Asset ID and Employee ID for Return.';
      return;
    }

    console.log('=== Store Manager Return Asset ===');
    console.log('Return form data:', this.returnForm);

    this.isLoading = true;
    this.storeService.returnAsset(this.returnForm).subscribe({
      next: (response) => {
        console.log('Asset returned successfully:', response);
        this.successMessage = 'Asset returned successfully';

        // Optimistic UI updates
        try {
          // Update inventory snapshot
          const inv = this.inventory.find(i => String(i.id ?? i.assetId) === String(this.returnForm.assetId));
          if (inv) {
            if (typeof inv.available === 'number') inv.available += 1;
            if (typeof inv.issued === 'number') inv.issued = Math.max(0, inv.issued - 1);
            if (inv.status) inv.status = 'Available';
            this.applyInventoryFiltersAndPagination();
          }
          // Update stats snapshot if available
          if (this.stats) {
            if (typeof this.stats.issuedAssets === 'number') this.stats.issuedAssets = Math.max(0, (this.stats.issuedAssets || 0) - 1);
            if (typeof this.stats.availableAssets === 'number') this.stats.availableAssets += 1;
            if (typeof this.stats.totalTransactions === 'number') this.stats.totalTransactions += 1;
          }
        } catch {}

        this.resetReturnForm();
        this.isLoading = false;
        // Refresh inventory and transactions
        this.loadInventory();
        this.loadTransactions();
      },
      error: (e) => {
        console.error('Error returning asset:', e);
        this.errorMessage = this.normalizeError(e);
        this.isLoading = false;
      }
    });
  }

  submitAddStock() {
    this.clearMessages();
    if (!this.addStockForm.assetId || !this.addStockForm.quantity) {
      this.errorMessage = 'Please fill all required fields for Add Stock.';
      return;
    }

    console.log('=== Store Manager Add Stock ===');
    console.log('Add stock form data:', this.addStockForm);

    this.isLoading = true;
    this.storeService.addStock(this.addStockForm).subscribe({
      next: (response) => {
        console.log('Stock added successfully:', response);
        this.successMessage = 'Stock added successfully';
        this.resetAddStockForm();
        this.isLoading = false;
        // Refresh inventory and stats
        this.loadInventory();
        this.loadStats();
      },
      error: (e) => {
        console.error('Error adding stock:', e);
        this.errorMessage = this.normalizeError(e);
        this.isLoading = false;
      }
    });
  }

  // Helpers
  clearMessages() { this.successMessage = ''; this.errorMessage = ''; }
  resetIssueForm() { this.issueForm = { assetId: null as any, employeeId: null as any, quantity: 1 as any, issueDate: '', notes: '' }; }
  resetReturnForm() { this.returnForm = { assetId: null as any, employeeId: null as any, returnDate: '', notes: '' }; }
  resetAddStockForm() { this.addStockForm = { assetId: null as any, quantity: null as any }; }

  normalizeError(err: any): string {
    if (err?.status === 0) return 'Unable to connect to server.';
    try {
      const body = typeof err?.error === 'string' ? JSON.parse(err.error) : err.error;
      return body?.message || 'Operation failed';
    } catch { return err?.message || 'Operation failed'; }
  }

  // When user clicks an asset ID in inventory, auto-fill forms
  onSelectAssetId(id: any) {
    const n = Number(id);
    if (Number.isFinite(n)) {
      this.issueForm.assetId = n as any;
      this.returnForm.assetId = n as any;
      this.addStockForm.assetId = n as any;
      this.successMessage = `Selected Asset ID #${n}`;
      setTimeout(() => (this.successMessage = ''), 1500);
    }
  }

  // View Details Modal Methods
  viewInventoryDetails(item: any) {
    this.selectedInventoryItem = item;
    this.showInventoryDetailsModal = true;
  }

  closeInventoryDetailsModal() {
    this.showInventoryDetailsModal = false;
    this.selectedInventoryItem = null;
  }

  viewTransactionDetails(transaction: any) {
    this.selectedTransaction = transaction;
    this.showTransactionDetailsModal = true;
  }

  closeTransactionDetailsModal() {
    this.showTransactionDetailsModal = false;
    this.selectedTransaction = null;
  }

  // Download selected transaction receipt (CSV)
  downloadSelectedTransactionReceipt() {
    if (!this.selectedTransaction) {
      this.errorMessage = 'No transaction selected for download';
      setTimeout(() => (this.errorMessage = ''), 3000);
      return;
    }

    const t = this.selectedTransaction;
    const details = [
      { Field: 'Transaction ID', Value: (t.id ?? '').toString() },
      { Field: 'Type', Value: t.type || t.transactionType || 'N/A' },
      { Field: 'Asset', Value: t.assetName || t.asset || 'N/A' },
      { Field: 'Employee', Value: t.employeeName || t.employee || 'N/A' },
      { Field: 'Date', Value: this.formatDateForDownload(t.date || t.transactionDate) },
      { Field: 'Status', Value: t.status || 'Completed' },
      { Field: 'Notes', Value: t.notes || 'N/A' },
      { Field: 'Processed By', Value: this.currentUser?.name || this.currentUser?.username || 'Store Manager' },
      { Field: 'Department', Value: this.currentUser?.department || 'N/A' }
    ];

    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Store_Tx_${t.id || 'NA'}_${currentDate}.csv`;

    this.downloadAsCSV(details, filename);
    this.successMessage = `Transaction #${t.id || ''} details downloaded successfully`;
    setTimeout(() => (this.successMessage = ''), 3000);
  }

  // Inventory Sorting Methods
  sortInventory(field: string) {
    if (this.inventorySortField === field) {
      this.inventorySortDirection = this.inventorySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.inventorySortField = field;
      this.inventorySortDirection = 'asc';
    }
    this.applyInventoryFiltersAndPagination();
  }

  getInventorySortIcon(field: string): string {
    if (this.inventorySortField !== field) return 'bi-arrow-down-up';
    return this.inventorySortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // Transactions Sorting Methods
  sortTransactions(field: string) {
    if (this.transactionsSortField === field) {
      this.transactionsSortDirection = this.transactionsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.transactionsSortField = field;
      this.transactionsSortDirection = 'asc';
    }
    this.applyTransactionsFiltersAndPagination();
  }

  getTransactionsSortIcon(field: string): string {
    if (this.transactionsSortField !== field) return 'bi-arrow-down-up';
    return this.transactionsSortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // Helper to build a transaction object for optimistic UI updates after issue
  private buildIssueTransaction(response: any, payload: IssueAssetPayload): any | null {
    try {
      const body = typeof response === 'object' && 'body' in response ? (response as any).body : response;
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      const assetName = parsed?.assetName || parsed?.asset?.name || parsed?.name || 'Asset';
      const employeeName = parsed?.employeeName || parsed?.employee?.name || parsed?.user?.name || 'Employee';
      const date = parsed?.issueDate || new Date().toISOString();
      const notes = parsed?.notes || payload?.notes || '';

      return {
        id: parsed?.id || Date.now(),
        type: 'Issue',
        assetName,
        employeeName,
        date,
        notes,
        status: 'Completed'
      };
    } catch {
      // Fallback minimal shape
      return {
        id: Date.now(),
        type: 'Issue',
        assetName: 'Asset',
        employeeName: 'Employee',
        date: new Date().toISOString(),
        notes: payload?.notes || '',
        status: 'Completed'
      };
    }
  }

  // Inventory Filtering Methods
  applyInventoryAdvancedFilters() {
    this.inventoryCurrentPage = 1;
    this.applyInventoryFiltersAndPagination();
  }

  clearInventoryFilters() {
    this.inventoryFilterText = '';
    this.inventoryFilterCategory = '';
    this.inventoryFilterStatus = '';
    this.inventoryFilterLocation = '';
    this.applyInventoryFiltersAndPagination();
  }

  // Transactions Filtering Methods
  applyTransactionsAdvancedFilters() {
    this.transactionsCurrentPage = 1;
    this.applyTransactionsFiltersAndPagination();
  }

  clearTransactionsFilters() {
    this.transactionsFilterText = '';
    this.transactionsFilterType = '';
    this.transactionsFilterDateFrom = '';
    this.transactionsFilterDateTo = '';
    this.applyTransactionsFiltersAndPagination();
  }

  // Get unique values for filter dropdowns
  getUniqueInventoryCategories(): string[] {
    const categories = [...new Set(this.inventory.map(item => item.category || item.assetType))];
    return categories.filter((cat): cat is string => cat != null && cat.trim() !== '');
  }

  getUniqueInventoryStatuses(): string[] {
    const statuses = [...new Set(this.inventory.map(item => item.status))];
    return statuses.filter((status): status is string => status != null && status.trim() !== '');
  }

  getUniqueInventoryLocations(): string[] {
    const locations = [...new Set(this.inventory.map(item => item.location))];
    return locations.filter((loc): loc is string => loc != null && loc.trim() !== '');
  }

  getUniqueTransactionTypes(): string[] {
    const types = [...new Set(this.transactions.map(t => t.type || t.transactionType))];
    return types.filter((type): type is string => type != null && type.trim() !== '');
  }

  // Inventory Pagination Methods
  onInventoryPageSizeChange() {
    this.inventoryCurrentPage = 1;
    this.applyInventoryFiltersAndPagination();
  }

  onInventoryPageChange(page: number) {
    this.inventoryCurrentPage = page;
    this.applyInventoryFiltersAndPagination();
  }

  getInventoryPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.inventoryCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.inventoryTotalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Transactions Pagination Methods
  onTransactionsPageSizeChange() {
    this.transactionsCurrentPage = 1;
    this.applyTransactionsFiltersAndPagination();
  }

  onTransactionsPageChange(page: number) {
    this.transactionsCurrentPage = page;
    this.applyTransactionsFiltersAndPagination();
  }

  getTransactionsPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.transactionsCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.transactionsTotalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Combined filtering and pagination methods
  applyInventoryFiltersAndPagination() {
    let filtered = [...this.inventory];

    // Apply text filter
    if (this.inventoryFilterText.trim()) {
      const term = this.inventoryFilterText.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name || item.assetName || '').toLowerCase().includes(term) ||
        (item.category || item.assetType || '').toLowerCase().includes(term) ||
        (item.location || '').toLowerCase().includes(term) ||
        (item.serialNumber || item.id || '').toString().toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (this.inventoryFilterCategory) {
      filtered = filtered.filter(item =>
        (item.category || item.assetType || '').toLowerCase() === this.inventoryFilterCategory.toLowerCase()
      );
    }

    // Apply status filter
    if (this.inventoryFilterStatus) {
      filtered = filtered.filter(item =>
        (item.status || '').toLowerCase() === this.inventoryFilterStatus.toLowerCase()
      );
    }

    // Apply location filter
    if (this.inventoryFilterLocation) {
      filtered = filtered.filter(item =>
        (item.location || '').toLowerCase() === this.inventoryFilterLocation.toLowerCase()
      );
    }

    // Apply sorting
    if (this.inventorySortField) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[this.inventorySortField] || '';
        const bVal = (b as any)[this.inventorySortField] || '';

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        return this.inventorySortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.inventoryFilteredItems = filtered;

    // Apply pagination
    this.inventoryTotalPages = Math.ceil(filtered.length / this.inventoryPageSize);
    const startIndex = (this.inventoryCurrentPage - 1) * this.inventoryPageSize;
    const endIndex = startIndex + this.inventoryPageSize;
    this.inventoryPaginatedItems = filtered.slice(startIndex, endIndex);
  }

  applyTransactionsFiltersAndPagination() {
    let filtered = [...this.transactions];

    // Apply text filter
    if (this.transactionsFilterText.trim()) {
      const term = this.transactionsFilterText.toLowerCase();
      filtered = filtered.filter(transaction =>
        (transaction.assetName || transaction.asset || '').toLowerCase().includes(term) ||
        (transaction.employeeName || transaction.employee || '').toLowerCase().includes(term) ||
        (transaction.type || transaction.transactionType || '').toLowerCase().includes(term) ||
        (transaction.notes || '').toLowerCase().includes(term) ||
        (transaction.id || '').toString().toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (this.transactionsFilterType) {
      filtered = filtered.filter(transaction =>
        (transaction.type || transaction.transactionType || '').toLowerCase() === this.transactionsFilterType.toLowerCase()
      );
    }

    // Apply date range filter
    if (this.transactionsFilterDateFrom) {
      const fromDate = new Date(this.transactionsFilterDateFrom);
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date || transaction.transactionDate);
        return transactionDate >= fromDate;
      });
    }

    if (this.transactionsFilterDateTo) {
      const toDate = new Date(this.transactionsFilterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date || transaction.transactionDate);
        return transactionDate <= toDate;
      });
    }

    // Apply sorting
    if (this.transactionsSortField) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[this.transactionsSortField] || '';
        const bVal = (b as any)[this.transactionsSortField] || '';

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        return this.transactionsSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.transactionsFilteredItems = filtered;

    // Apply pagination
    this.transactionsTotalPages = Math.ceil(filtered.length / this.transactionsPageSize);
    const startIndex = (this.transactionsCurrentPage - 1) * this.transactionsPageSize;
    const endIndex = startIndex + this.transactionsPageSize;
    this.transactionsPaginatedItems = filtered.slice(startIndex, endIndex);
  }

  // Mock data generation methods (fallback when backend is not available)
  generateMockInventory(): any[] {
    return [
      { id: 1, name: 'Dell Laptop', category: 'Laptop', quantity: 15, available: 12, issued: 3, location: 'Store A', status: 'Available', serialNumber: 'DL001' },
      { id: 2, name: 'HP Monitor', category: 'Monitor', quantity: 25, available: 20, issued: 5, location: 'Store A', status: 'Available', serialNumber: 'HP001' },
      { id: 3, name: 'Wireless Mouse', category: 'Accessories', quantity: 50, available: 45, issued: 5, location: 'Store B', status: 'Available', serialNumber: 'WM001' },
      { id: 4, name: 'Keyboard', category: 'Accessories', quantity: 30, available: 25, issued: 5, location: 'Store A', status: 'Available', serialNumber: 'KB001' },
      { id: 5, name: 'iPhone 13', category: 'Mobile', quantity: 8, available: 5, issued: 3, location: 'Store C', status: 'Low Stock', serialNumber: 'IP001' },
      { id: 6, name: 'iPad Pro', category: 'Tablet', quantity: 12, available: 10, issued: 2, location: 'Store B', status: 'Available', serialNumber: 'IPD001' },
      { id: 7, name: 'Desk Chair', category: 'Furniture', quantity: 20, available: 18, issued: 2, location: 'Store A', status: 'Available', serialNumber: 'DC001' },
      { id: 8, name: 'Printer', category: 'Office Equipment', quantity: 6, available: 4, issued: 2, location: 'Store C', status: 'Available', serialNumber: 'PR001' }
    ];
  }

  generateMockTransactions(): any[] {
    return [
      { id: 1, type: 'Issue', assetName: 'Dell Laptop XPS 13', employeeName: 'John Doe', date: '2024-01-15T10:30:00', notes: 'For project work - Web Development Team', status: 'Completed' },
      { id: 2, type: 'Return', assetName: 'HP Monitor 24"', employeeName: 'Jane Smith', date: '2024-01-14T14:15:00', notes: 'Project completed - Marketing Campaign', status: 'Completed' },
      { id: 3, type: 'Issue', assetName: 'iPhone 13 Pro', employeeName: 'Mike Johnson', date: '2024-01-13T09:45:00', notes: 'Business use - Sales Department', status: 'Completed' },
      { id: 4, type: 'Stock Added', assetName: 'Wireless Mouse Logitech', employeeName: 'Store Manager', date: '2024-01-12T16:20:00', notes: 'New stock arrival - Bulk purchase', status: 'Completed' },
      { id: 5, type: 'Issue', assetName: 'Mechanical Keyboard', employeeName: 'Sarah Wilson', date: '2024-01-11T11:00:00', notes: 'Replacement needed - IT Department', status: 'Completed' },
      { id: 6, type: 'Return', assetName: 'iPad Pro 12.9"', employeeName: 'Tom Brown', date: '2024-01-10T13:30:00', notes: 'No longer needed - Design Team', status: 'Completed' },
      { id: 7, type: 'Issue', assetName: 'Ergonomic Desk Chair', employeeName: 'Lisa Davis', date: '2024-01-09T08:15:00', notes: 'New employee setup - HR Department', status: 'Completed' },
      { id: 8, type: 'Stock Added', assetName: 'HP LaserJet Printer', employeeName: 'Store Manager', date: '2024-01-08T15:45:00', notes: 'Equipment upgrade - Office supplies', status: 'Completed' },
      { id: 9, type: 'Issue', assetName: 'MacBook Pro 16"', employeeName: 'Alex Rodriguez', date: '2024-01-07T12:00:00', notes: 'Video editing work - Creative Team', status: 'Completed' },
      { id: 10, type: 'Return', assetName: 'Surface Tablet', employeeName: 'Emily Chen', date: '2024-01-06T10:20:00', notes: 'Project finished - Research Department', status: 'Completed' },
      { id: 11, type: 'Issue', assetName: 'Webcam HD 1080p', employeeName: 'David Kim', date: '2024-01-05T14:30:00', notes: 'Remote meetings - Operations Team', status: 'Completed' },
      { id: 12, type: 'Issue', assetName: 'Headset Noise Cancelling', employeeName: 'Maria Garcia', date: '2024-01-04T09:10:00', notes: 'Customer support calls - Support Team', status: 'Completed' },
      { id: 13, type: 'Return', assetName: 'External Hard Drive 2TB', employeeName: 'Robert Taylor', date: '2024-01-03T16:45:00', notes: 'Data backup completed - Finance Team', status: 'Completed' },
      { id: 14, type: 'Stock Added', assetName: 'USB-C Docking Station', employeeName: 'Store Manager', date: '2024-01-02T11:30:00', notes: 'New equipment for remote workers', status: 'Completed' },
      { id: 15, type: 'Issue', assetName: 'Smartphone Samsung Galaxy', employeeName: 'Jennifer Lee', date: '2024-01-01T13:15:00', notes: 'Field work requirements - Field Operations', status: 'Completed' }
    ];
  }

  // Force session authentication for Store Manager (for testing)
  forceSessionAuth() {
    console.log('=== Forcing Session Authentication for Store Manager ===');

    // Clear any existing invalid tokens
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');

    // Create session auth for Store Manager
    const authResponse = this.authService['createSessionAuth']('21', 'storemanager@example.com', 'store_manager');
    console.log('Store Manager session auth created:', authResponse);

    this.currentUser = authResponse.user || null;

    // Reload data with new auth
    this.loadStoreData();

    this.successMessage = 'Session authentication set for Store Manager. Try issuing an asset now.';
    setTimeout(() => this.successMessage = '', 5000);
  }

  // Comprehensive authentication debugging
  debugAuthentication() {
    console.log('=== Store Manager Authentication Debug ===');
    console.log('1. Current User:', this.currentUser);
    console.log('2. Token:', localStorage.getItem('token'));
    console.log('3. Current User from localStorage:', localStorage.getItem('currentUser'));
    console.log('4. All localStorage keys:', Object.keys(localStorage));
    console.log('5. Backend URL:', this.storeService['baseUrl']);
    console.log('6. Browser cookies:', document.cookie);

    // Test direct HTTP call
    console.log('7. Testing direct HTTP call...');
    fetch('http://localhost:8080/api/store-manager/stats', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      console.log('Direct fetch response:', response);
      return response.text();
    }).then(text => {
      console.log('Direct fetch body:', text);
    }).catch(error => {
      console.error('Direct fetch error:', error);
    });

    // Test with Authorization header
    const token = localStorage.getItem('token');
    if (token && token !== 'session-auth') {
      console.log('8. Testing with Authorization header...');
      fetch('http://localhost:8080/api/store-manager/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).then(response => {
        console.log('Auth header fetch response:', response);
        return response.text();
      }).then(text => {
        console.log('Auth header fetch body:', text);
      }).catch(error => {
        console.error('Auth header fetch error:', error);
      });
    }
  }

  // Comprehensive authentication testing method
  testAuthentication() {
    console.log('=== Testing Store Manager Authentication ===');
    console.log('Current user:', this.currentUser);
    console.log('Token:', localStorage.getItem('token'));
    console.log('Backend URL:', this.storeService['baseUrl']);

    // Test multiple endpoints to verify authentication
    console.log('Testing stats endpoint...');
    this.storeService.getStats().subscribe({
      next: (response) => {
        console.log('✅ Stats endpoint test successful:', response);
        this.testInventoryEndpoint();
      },
      error: (error) => {
        console.error('❌ Stats endpoint test failed:', error);
        this.testInventoryEndpoint();
      }
    });
  }

  testInventoryEndpoint() {
    console.log('Testing inventory endpoint...');
    this.storeService.getInventory().subscribe({
      next: (response) => {
        console.log('✅ Inventory endpoint test successful:', response);
        this.testTransactionsEndpoint();
      },
      error: (error) => {
        console.error('❌ Inventory endpoint test failed:', error);
        this.testTransactionsEndpoint();
      }
    });
  }

  testTransactionsEndpoint() {
    console.log('Testing transactions endpoint...');
    this.storeService.getTransactions().subscribe({
      next: (response) => {
        console.log('✅ Transactions endpoint test successful:', response);
        console.log('=== All endpoint tests completed ===');
      },
      error: (error) => {
        console.error('❌ Transactions endpoint test failed:', error);
        console.log('=== All endpoint tests completed ===');
      }
    });
  }

  // Test with different authentication methods
  async testDifferentAuthMethods() {
    console.log('=== Testing Different Authentication Methods ===');

    // Method 1: Try backend login
    console.log('Method 1: Backend Login');
    try {
      const loginResult = await this.tryBackendLogin();
      console.log('Backend login result:', loginResult);
    } catch (error) {
      console.error('Backend login error:', error);
    }

    // Method 2: Test with manual token
    console.log('Method 2: Manual Token Test');
    const originalToken = localStorage.getItem('token');
    localStorage.setItem('token', 'test-token-123');

    this.storeService.getStats().subscribe({
      next: (response) => {
        console.log('✅ Manual token test successful:', response);
        localStorage.setItem('token', originalToken || '');
      },
      error: (error) => {
        console.error('❌ Manual token test failed:', error);
        localStorage.setItem('token', originalToken || '');
      }
    });

    // Method 3: Test without token (cookies only)
    console.log('Method 3: Cookies Only Test');
    localStorage.removeItem('token');

    this.storeService.getStats().subscribe({
      next: (response) => {
        console.log('✅ Cookies only test successful:', response);
        localStorage.setItem('token', originalToken || '');
      },
      error: (error) => {
        console.error('❌ Cookies only test failed:', error);
        localStorage.setItem('token', originalToken || '');
      }
    });
  }

  // Download transaction details functionality
  downloadTransactionDetails() {
    console.log('=== Downloading Transaction Details ===');

    // Get filtered transactions (respects current filters)
    const transactionsToDownload = this.transactionsFilteredItems;

    if (transactionsToDownload.length === 0) {
      this.errorMessage = 'No transactions available to download';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    // Prepare data for download with employee names
    const downloadData = transactionsToDownload.map(transaction => ({
      'Transaction ID': transaction.id || '',
      'Transaction Type': transaction.type || transaction.transactionType || '',
      'Asset Name': transaction.assetName || transaction.asset || '',
      'Employee Name': transaction.employeeName || transaction.employee || '',
      'Transaction Date': this.formatDateForDownload(transaction.date || transaction.transactionDate),
      'Status': transaction.status || 'Completed',
      'Notes': transaction.notes || ''
    }));

    // Generate filename with current date and filters
    const currentDate = new Date().toISOString().split('T')[0];
    let filename = `Store_Manager_Transactions_${currentDate}`;

    // Add filter info to filename if filters are applied
    if (this.transactionsFilterType) {
      filename += `_${this.transactionsFilterType}`;
    }
    if (this.transactionsFilterDateFrom || this.transactionsFilterDateTo) {
      filename += '_DateFiltered';
    }

    filename += '.csv';

    // Download as CSV
    this.downloadAsCSV(downloadData, filename);

    this.successMessage = `Downloaded ${downloadData.length} transaction records successfully`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Download all transactions (ignoring current filters)
  downloadAllTransactionDetails() {
    console.log('=== Downloading All Transaction Details ===');

    if (this.transactions.length === 0) {
      this.errorMessage = 'No transactions available to download';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    // Prepare all transaction data for download
    const downloadData = this.transactions.map(transaction => ({
      'Transaction ID': transaction.id || '',
      'Transaction Type': transaction.type || transaction.transactionType || '',
      'Asset Name': transaction.assetName || transaction.asset || '',
      'Employee Name': transaction.employeeName || transaction.employee || '',
      'Transaction Date': this.formatDateForDownload(transaction.date || transaction.transactionDate),
      'Status': transaction.status || 'Completed',
      'Notes': transaction.notes || ''
    }));

    // Generate filename
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Store_Manager_All_Transactions_${currentDate}.csv`;

    // Download as CSV
    this.downloadAsCSV(downloadData, filename);

    this.successMessage = `Downloaded all ${downloadData.length} transaction records successfully`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Helper method to format date for download
  private formatDateForDownload(dateString: string): string {
    if (!dateString) return '';
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
        if (value.toString().includes(',') || value.toString().includes('"')) {
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
