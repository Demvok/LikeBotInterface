import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  username: string;
  is_verified: boolean;
  role: 'user' | 'admin' | 'guest';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: 'user' | 'admin' | 'guest';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialization complete
  }

  /**
   * Register a new user account
   */
  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, data);
  }

  /**
   * Login with username and password
   */
  login(username: string, password: string): Observable<AuthResponse> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(response => {
        this.setToken(response.access_token);
        // After login, fetch user details
        this.fetchCurrentUser().subscribe();
      })
    );
  }

  /**
   * Fetch current user details
   */
  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.setUser(user);
      })
    );
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.clearAuth();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.length > 0;
  }

  /**
   * Check if JWT token is expired (client-side check only, server has final say)
   */
  isTokenExpired(token?: string): boolean {
    const authToken = token || this.getToken();
    if (!authToken) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const exp = payload.exp;
      
      if (!exp) {
        return false; // No expiration in token, let server validate
      }
      
      // Check if token expires in less than 60 seconds (add small buffer)
      return Date.now() >= (exp * 1000) - 60000;
    } catch {
      // If we can't parse the token, assume it's not expired (let server validate)
      return false;
    }
  }

  /**
   * Get the current auth token
   */
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Error getting token:', error);
      return null;
    }
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get time until token expiration in milliseconds
   * Returns null if no token or can't parse expiration
   */
  getTokenExpirationTime(): number | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      
      if (!exp) {
        return null;
      }
      
      return (exp * 1000) - Date.now();
    } catch {
      return null;
    }
  }

  /**
   * Check if token will expire soon (within 1 hour)
   */
  isTokenExpiringSoon(): boolean {
    const timeUntilExpiration = this.getTokenExpirationTime();
    if (!timeUntilExpiration) {
      return false;
    }
    
    // Return true if expiring within 1 hour (3600000 ms)
    return timeUntilExpiration < 3600000 && timeUntilExpiration > 0;
  }

  /**
   * Set auth token
   */
  private setToken(token: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('[AuthService] Error saving token:', error);
    }
  }

  /**
   * Set current user
   */
  private setUser(user: User): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('[AuthService] Error saving user:', error);
    }
    this.currentUserSubject.next(user);
  }

  /**
   * Get user from local storage
   */
  private getUserFromStorage(): User | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }
    } catch (error) {
      console.error('[AuthService] Error loading user:', error);
    }
    return null;
  }

  /**
   * Clear all auth data
   */
  private clearAuth(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('[AuthService] Error clearing auth:', error);
    }
    this.currentUserSubject.next(null);
  }
}
