import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})
export class NavigationComponent {
  constructor(private authService: AuthService, private router: Router) {}

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get dashboardLink(): string {
    const role = this.authService.getUserRole();
    switch (role) {
      case UserRole.SUPER_ADMIN: return '/super-admin';
      case UserRole.ADMIN: return '/super-admin';
      case UserRole.DEPARTMENT_ADMIN: return '/department-admin';
      case UserRole.STORE_MANAGER: return '/store-manager';
      case UserRole.EMPLOYEE: return '/employee';
      default: return '/login';
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
