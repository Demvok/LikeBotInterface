import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard for root route - redirects to /home if authenticated, otherwise to /login
 */
export const redirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/home']);
  } else {
    router.navigate(['/login']);
  }

  return false; // Always return false since we're handling navigation
};
