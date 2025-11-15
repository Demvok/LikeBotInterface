import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();

  // Check if user is authenticated and has admin role
  if (user && user.role === 'admin') {
    return true;
  }

  // If not admin, redirect to home page
  router.navigate(['/home']);
  return false;
};
