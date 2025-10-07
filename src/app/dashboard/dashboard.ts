import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocationService } from '../services/location.service';
import { LocationResponse } from '../models/location.model';

interface SectionItem {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-unified-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class UnifiedDashboardComponent {
  dashboards: { key: string; label: string }[] = [
    { key: 'store-manager', label: 'Store Manager' },
    { key: 'department-admin', label: 'Department Admin' },
    { key: 'super-admin', label: 'Super Admin' }
  ];

  selectedDashboard: string = 'store-manager';

  private sectionMap: Record<string, SectionItem[]> = {
    'store-manager': [
      { key: 'inventory', label: 'Inventory Management', icon: 'bi-boxes' },
      { key: 'asset-return', label: 'Asset Return', icon: 'bi-arrow-left-circle' },
      { key: 'recent-transactions', label: 'Recent Transactions', icon: 'bi-receipt' },
      { key: 'issue-asset', label: 'Issue Asset', icon: 'bi-arrow-right-circle' },
      { key: 'add-stock', label: 'Add Stock', icon: 'bi-plus-circle' },
      { key: 'low-stock', label: 'Low Stock Alerts', icon: 'bi-exclamation-triangle' }
    ],
    'department-admin': [
      { key: 'approvals', label: 'Approvals', icon: 'bi-check2-circle' },
      { key: 'team-requests', label: 'Team Requests', icon: 'bi-list-task' },
      { key: 'dept-inventory', label: 'Department Inventory', icon: 'bi-box2' },
      { key: 'assign-locations', label: 'Assign Locations', icon: 'bi-geo-alt' }
    ],
    'super-admin': [
      { key: 'users', label: 'Users', icon: 'bi-people' },
      { key: 'departments', label: 'Departments', icon: 'bi-diagram-3' },
      { key: 'roles', label: 'Roles/Permissions', icon: 'bi-shield-lock' }
    ]
  };

  get sections(): SectionItem[] { return this.sectionMap[this.selectedDashboard] || []; }

  selected: string = this.sections[0]?.key || 'inventory';

  mobileSidebarOpen = false;

  // Assign Locations state (only used for Department Admin)
  locations: LocationResponse[] = [];
  isLoadingLocations = false;
  assign = { employeeId: '', locationId: '' };
  assignMessage = '';
  assignError = '';

  constructor(private router: Router, private route: ActivatedRoute, private locationService: LocationService) {
    const d = this.route.snapshot.queryParamMap.get('d');
    if (d && this.sectionMap[d]) {
      this.selectedDashboard = d;
    }
    const s = this.route.snapshot.queryParamMap.get('s');
    if (s && this.sections.some(sec => sec.key === s)) {
      this.selected = s;
    } else {
      this.selected = this.sections[0]?.key || '';
    }
  }

  private updateUrl() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { d: this.selectedDashboard, s: this.selected || null },
      replaceUrl: true
    });
  }

  loadLocationsIfNeeded() {
    if (this.selectedDashboard !== 'department-admin' || this.selected !== 'assign-locations') return;
    if (this.locations.length || this.isLoadingLocations) return;
    this.isLoadingLocations = true;
    this.locationService.getLocations().subscribe({
      next: (list) => { this.locations = list || []; this.isLoadingLocations = false; },
      error: () => { this.isLoadingLocations = false; }
    });
  }

  selectDashboard(key: string) {
    if (this.selectedDashboard === key) return;
    this.selectedDashboard = key;
    const nextSections = this.sections;
    this.selected = nextSections.length ? nextSections[0].key : '';
    this.mobileSidebarOpen = false;
    this.updateUrl();
    this.loadLocationsIfNeeded();
  }

  select(key: string) {
    this.selected = key;
    this.mobileSidebarOpen = false;
    this.updateUrl();
    this.loadLocationsIfNeeded();
  }

  toggleSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  get currentDashboardLabel(): string {
    const d = this.dashboards.find(d => d.key === this.selectedDashboard);
    return d?.label ?? '';
  }

  getSectionLabel(key: string): string {
    const found = this.sections.find(s => s.key === key);
    return found?.label ?? key;
  }

  // Submit assignment (Department Admin only)
  submitAssign() {
    this.assignMessage = '';
    this.assignError = '';
    if (!this.assign.employeeId || !this.assign.locationId) {
      this.assignError = 'Please enter employee ID and select a location.';
      return;
    }
    this.locationService.assignLocationToEmployee(this.assign.employeeId, this.assign.locationId).subscribe({
      next: () => { this.assignMessage = 'Location assigned successfully.'; },
      error: () => { this.assignError = 'Failed to assign location.'; }
    });
  }

  inventoryCards = [
    { title: 'Total Assets', value: '--', icon: 'bi-boxes', bg: 'bg-primary bg-opacity-10', text: 'text-primary' },
    { title: 'Available', value: '--', icon: 'bi-check-circle', bg: 'bg-success bg-opacity-10', text: 'text-success' },
    { title: 'Issued', value: '--', icon: 'bi-arrow-right-circle', bg: 'bg-warning bg-opacity-10', text: 'text-warning' },
    { title: 'Low Stock', value: '--', icon: 'bi-exclamation-triangle', bg: 'bg-danger bg-opacity-10', text: 'text-danger' }
  ];

  returnCards = [
    { title: 'Pending Returns', value: '--', icon: 'bi-clock', bg: 'bg-secondary bg-opacity-10', text: 'text-secondary' },
    { title: 'Today Returns', value: '--', icon: 'bi-arrow-left-circle', bg: 'bg-info bg-opacity-10', text: 'text-info' },
    { title: 'Overdue', value: '--', icon: 'bi-exclamation-diamond', bg: 'bg-danger bg-opacity-10', text: 'text-danger' },
    { title: 'Processed', value: '--', icon: 'bi-check2-circle', bg: 'bg-success bg-opacity-10', text: 'text-success' }
  ];

  transactionCards = [
    { title: 'Today', value: '--', icon: 'bi-calendar-day', bg: 'bg-primary bg-opacity-10', text: 'text-primary' },
    { title: 'This Week', value: '--', icon: 'bi-calendar-week', bg: 'bg-warning bg-opacity-10', text: 'text-warning' },
    { title: 'This Month', value: '--', icon: 'bi-calendar-month', bg: 'bg-info bg-opacity-10', text: 'text-info' },
    { title: 'Total', value: '--', icon: 'bi-bar-chart', bg: 'bg-secondary bg-opacity-10', text: 'text-secondary' }
  ];

  genericCards = [
    { title: 'Metric A', value: '--', icon: 'bi-graph-up', bg: 'bg-primary bg-opacity-10', text: 'text-primary' },
    { title: 'Metric B', value: '--', icon: 'bi-diagram-3', bg: 'bg-warning bg-opacity-10', text: 'text-warning' },
    { title: 'Metric C', value: '--', icon: 'bi-clipboard-data', bg: 'bg-info bg-opacity-10', text: 'text-info' },
    { title: 'Metric D', value: '--', icon: 'bi-people', bg: 'bg-secondary bg-opacity-10', text: 'text-secondary' }
  ];
}