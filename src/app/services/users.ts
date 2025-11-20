import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  username: string;
  is_verified: boolean;
  role: 'user' | 'admin' | 'guest';
  created_at: string;
  updated_at: string;
}

export interface UserPasswordResponse {
  phone_number: string;
  has_password: boolean;
  password: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users (admin only)
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(username: string, role: 'user' | 'admin' | 'guest'): Observable<any> {
    return this.http.put(`${this.apiUrl}/${username}/role`, null, {
      params: { role }
    });
  }

  /**
   * Update user verification status (admin only)
   */
  updateUserVerification(username: string, is_verified: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${username}/verify`, null, {
      params: { is_verified: is_verified.toString() }
    });
  }

  /**
   * Delete a user (admin only)
   */
  deleteUser(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${username}`);
  }

  /**
   * Get account password by phone number (admin only)
   */
  getAccountPassword(phoneNumber: string): Observable<UserPasswordResponse> {
    const accountsUrl = `${environment.apiUrl}/accounts`;
    return this.http.get<UserPasswordResponse>(`${accountsUrl}/${phoneNumber}/password`);
  }
}
