import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  username = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    // Validation
    if (!this.username || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.username.length < 3 || this.username.length > 50) {
      this.errorMessage = 'Username must be between 3 and 50 characters';
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(this.username)) {
      this.errorMessage = 'Username can only contain letters, numbers, underscores, and hyphens';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register({
      username: this.username,
      password: this.password,
      role: 'user'
    }).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.successMessage = 'Registration successful! Your account is pending verification. You will be able to login once an administrator approves your account.';
        
        // Clear form
        this.username = '';
        this.password = '';
        this.confirmPassword = '';

        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 400) {
          this.errorMessage = error.error?.detail || 'Username already exists or invalid data';
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
        console.error('Registration error:', error);
      }
    });
  }
}
