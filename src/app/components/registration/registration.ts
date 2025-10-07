import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserRole, Department } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.css'
})
export class RegistrationComponent {
  registrationForm = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.EMPLOYEE,
    department: ''
  };

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  // Enums for template
  UserRole = UserRole;
  Department = Department;

  // Expose password pattern to template to avoid HTML escaping issues
  passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Helper: strong client-side password policy (made public to use in template)
  isStrongPassword(pwd: string): boolean {
    // At least 8 chars, 1 upper, 1 lower, 1 digit, 1 special
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);
  }

  // Map UI role values to backend-expected values
  private mapRoleForBackend(role: UserRole): string {
    switch (role) {
      case UserRole.EMPLOYEE:
        return 'employee';
      case UserRole.DEPARTMENT_ADMIN:
        return 'department-admin';
      case UserRole.STORE_MANAGER:
        return 'store-manager';
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.SUPER_ADMIN:
        return 'super-admin';
      default:
        return 'employee';
    }
  }

  register(form?: NgForm) {
    this.errorMessage = '';
    this.successMessage = '';

    // If template-driven form is provided, stop if invalid
    if (form && form.invalid) {
      this.errorMessage = 'Please fix the validation errors before submitting.';
      return;
    }

    // Manual guards for safety
    const { name, email, password, confirmPassword, role, department } = this.registrationForm;

    if (!name || !email || !password || !confirmPassword) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    // Name validation
    if (name.trim().length < 2) {
      this.errorMessage = 'Full name must be at least 2 characters long';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Password validations
    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }
    if (!this.isStrongPassword(password)) {
      this.errorMessage = 'Password must be at least 8 characters and include upper, lower, number, and special character.';
      return;
    }

    // Role/department validation
    if ((role === UserRole.DEPARTMENT_ADMIN || role === UserRole.EMPLOYEE || role === UserRole.ADMIN) && !department) {
      this.errorMessage = 'Department is required for this role';
      return;
    }

    this.isLoading = true;

    // Build payload expected by Spring Boot backend
    const payload = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      confirmPassword: confirmPassword,
      role: this.mapRoleForBackend(role),
      // Include department if provided (and if backend validates it per role)
      ...(department ? { department } : {})
    };

    this.authService.register(payload).subscribe({
      next: res => {
        // Attempt to derive newly created user ID from response
        const returned = (res && typeof res === 'object') ? res : {} as any;
        const newUserId = returned?.data?.id ?? returned?.id ?? returned?.userId ?? returned?.user?.id;

        // Fire-and-forget: send registration email to the registering user and notify admins
        if (newUserId) {
          this.authService.sendRegistrationEmailToUser(newUserId).subscribe(() => {});
          this.authService.sendRegistrationEmailToAdmins(newUserId).subscribe(() => {});
        }

        // After successful registration, direct user to login page
        this.isLoading = false;
        this.successMessage = 'Registration successful! Please login to continue.';
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: err => {
        this.isLoading = false;
        // Normalize error and show friendly duplicate email message
        let msg = 'Registration failed. Please try again.';
        try {
          if (err?.status === 409) {
            msg = 'Email already registered';
          } else if (typeof err?.error === 'string') {
            // Try parse backend string body
            const parsed = JSON.parse(err.error);
            msg = parsed?.message || msg;
          } else if (err?.error?.message) {
            msg = err.error.message;
          } else if (err?.message) {
            msg = err.message;
          }
          // Heuristics: if backend hints duplicates
          const rawLower = (err?.error?.message || err?.message || '').toLowerCase();
          if (rawLower.includes('duplicate') || rawLower.includes('already') && rawLower.includes('email')) {
            msg = 'Email already registered';
          }
        } catch {}
        this.errorMessage = msg;
      }
    });
  }

  getRoleOptions(): UserRole[] {
    return [
      UserRole.EMPLOYEE,
      UserRole.DEPARTMENT_ADMIN,
      UserRole.STORE_MANAGER,
      
    ];
  }

  getDepartmentOptions(): string[] {
    // Restrict registration dropdown to IT only
    return [Department.IT];
  }

  isRoleRequiresDepartment(): boolean {
    return this.registrationForm.role === UserRole.DEPARTMENT_ADMIN || 
           this.registrationForm.role === UserRole.EMPLOYEE ;
          
  }
}