import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRole = route.data['role'] as UserRole;
  const allowedRoles = route.data['allowedRoles'] as UserRole[];

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const userRole = authService.getUserRole();
  
  // Check if user has the exact expected role
  if (expectedRole && userRole === expectedRole) {
    return true;
  }
  
  // Check if user has one of the allowed roles
  if (allowedRoles && userRole && allowedRoles.includes(userRole)) {
    return true;
  }
  
  // Super admin can access admin routes
  if (expectedRole === UserRole.ADMIN && userRole === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // If no match, redirect to login
  router.navigate(['/login']);
  return false;
};
