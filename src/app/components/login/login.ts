import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { UserRole, LoginCredentials } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  // UI state for simple inline panels
  showForgotPassword = false;
  showForgotUsername = false;
  resetIdentifier = '';
  newPassword = '';
  recoveryEmail = '';
  recoveryMessage = '';

  // Monkey emoji theme state
  passwordFocused = false;
  get showMonkey() { return this.passwordFocused || !!this.password; }

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials: LoginCredentials = {
      email: this.email,
      password: this.password
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        if (response.success && response.user) {
          console.log('Login successful:', response);
          this.navigateBasedOnRole(response.user.role);
        } else {
          this.errorMessage = response.message || 'Invalid email or password';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Login error:', err);
        console.log('Login error details:', {
          status: err?.status,
          statusText: err?.statusText,
          url: err?.url,
          error: err?.error
        });

        // Provide specific error messages based on the error type
        if (err?.status === 401 || err?.status === 403) {
          this.errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (err?.status === 0) {
          this.errorMessage = 'Cannot connect to the server. Please check if the backend is running on localhost:8080.';
        } else if (err?.status === 404) {
          this.errorMessage = 'Login endpoint not found. Please check the backend configuration.';
        } else if (err?.status === 500) {
          this.errorMessage = 'Server error during login. Please try again later.';
        } else {
          const msg = typeof err?.error === 'string'
            ? err.error
            : (err?.error?.message || '');
          this.errorMessage = msg || `Login failed (Error ${err?.status || 'Unknown'}). Please try again.`;
        }
        this.isLoading = false;
      }
    });
  }

  // Forgot password flow (email-based reset)
  openForgotPassword() {
    this.resetIdentifier = '';
    this.recoveryMessage = '';
    this.showForgotPassword = true;
  }

  submitForgotPassword() {
    const email = (this.resetIdentifier || '').trim();
    if (!email) {
      this.recoveryMessage = 'Please enter your account email';
      return;
    }
    this.recoveryMessage = '';
    this.authService.requestPasswordReset(email).subscribe({
      next: (msg) => {
        this.recoveryMessage = typeof msg === 'string' && msg ? msg : 'If that email exists, a reset link has been sent.';
      },
      error: (err) => {
        const message = typeof err?.error === 'string' ? err.error : (err?.error?.message || 'Unable to send reset email');
        this.recoveryMessage = message;
      }
    });
  }

  closeRecoveryPanels() {
    this.showForgotPassword = false;
  }

  private navigateBasedOnRole(role: UserRole) {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        this.router.navigate(['/super-admin']);
        break;
      case UserRole.ADMIN:
        this.router.navigate(['/super-admin']);
        break;
      case UserRole.DEPARTMENT_ADMIN:
        this.router.navigate(['/department-admin']);
        break;
      case UserRole.EMPLOYEE:
        this.router.navigate(['/employee']);
        break;
      case UserRole.STORE_MANAGER:
        this.router.navigate(['/store-manager']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }
}
