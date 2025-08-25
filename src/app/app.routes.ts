import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegistrationComponent } from './components/registration/registration';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard';
import { SuperAdminDashboardComponent } from './components/super-admin-dashboard/super-admin-dashboard';
import { DepartmentAdminDashboardComponent } from './components/department-admin-dashboard/department-admin-dashboard';
import { StoreManagerDashboardComponent } from './components/store-manager-dashboard/store-manager-dashboard';
import { NotFoundComponent } from './components/not-found/not-found';
import { authGuard } from './guards/auth.guard';
import { UserRole } from './models/user.model';

export const routes: Routes = [
  { path: 'register', component: RegistrationComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'employee',
    component: EmployeeDashboardComponent,
    canActivate: [authGuard],
    data: { role: UserRole.EMPLOYEE }
  },

  {
    path: 'super-admin',
    component: SuperAdminDashboardComponent,
    canActivate: [authGuard],
    data: { role: UserRole.SUPER_ADMIN, allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] }
  },
  {
    path: 'department-admin',
    component: DepartmentAdminDashboardComponent,
    canActivate: [authGuard],
    data: { role: UserRole.DEPARTMENT_ADMIN }
  },
  {
    path: 'store-manager',
    component: StoreManagerDashboardComponent,
    canActivate: [authGuard],
    data: { role: UserRole.STORE_MANAGER }
  },
  // Unified dashboard (sidebar + cards)
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.UnifiedDashboardComponent),
    canActivate: [authGuard]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent }
];
