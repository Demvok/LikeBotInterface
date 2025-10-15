import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account } from './api.models';
import { environment } from '../../environments/environment';

export interface LoginStartResponse {
  status: 'wait_code' | 'wait_2fa' | 'processing' | 'done' | 'failed';
  login_session_id: string;
  message: string;
}

export interface LoginStatusResponse {
  status: 'wait_code' | 'wait_2fa' | 'processing' | 'done' | 'failed';
  phone_number: string;
  created_at: string;
  message: string;
  account_created?: boolean;
  error?: string;
}

export interface LoginVerifyResponse {
  status: 'processing' | 'done' | 'failed';
  message: string;
}

export interface ValidateAccountResponse {
  message: string;
  account_id: number;
  connection_status: string;
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  /** Get all accounts with optional filtering */
  getAccounts(params?: { phone_number?: string }): Observable<Account[]> {
    let httpParams = new HttpParams();
    if (params?.phone_number) {
      httpParams = httpParams.set('phone_number', params.phone_number);
    }
    return this.http.get<Account[]>(this.apiUrl, { params: httpParams });
  }

  /** Get a specific account by phone number */
  getAccount(phone_number: string): Observable<Account> {
    return this.http.get<Account>(`${this.apiUrl}/${encodeURIComponent(phone_number)}`);
  }

  /** Create a new account */
  createAccount(account: Account): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, account);
  }

  /** Update an existing account */
  updateAccount(phone_number: string, data: Partial<Account>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${encodeURIComponent(phone_number)}`, data);
  }

  /** Delete an account */
  deleteAccount(phone_number: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${encodeURIComponent(phone_number)}`);
  }

  /** Validate an account by testing connection */
  validateAccount(phone_number: string): Observable<ValidateAccountResponse> {
    return this.http.put<ValidateAccountResponse>(
      `${this.apiUrl}/${encodeURIComponent(phone_number)}/validate`,
      {}
    );
  }

  /** Bulk create accounts */
  bulkCreateAccounts(accounts: Account[]): Observable<{ results: Array<{ phone_number: string; status: string; message: string }> }> {
    return this.http.post<{ results: Array<{ phone_number: string; status: string; message: string }> }>(`${this.apiUrl}/bulk`, accounts);
  }

  /** Bulk delete accounts */
  bulkDeleteAccounts(phone_numbers: string[]): Observable<any> {
    return this.http.request<any>('delete', `${this.apiUrl}/bulk`, { body: phone_numbers });
  }

  // Login Process Methods

  /** Start login process - sends verification code */
  startLogin(
    phone_number: string,
    password_encrypted?: string,
    session_name?: string,
    notes?: string
  ): Observable<LoginStartResponse> {
    let params = new HttpParams().set('phone_number', phone_number);
    if (password_encrypted) params = params.set('password_encrypted', password_encrypted);
    if (session_name) params = params.set('session_name', session_name);
    if (notes) params = params.set('notes', notes);

    return this.http.post<LoginStartResponse>(`${this.apiUrl}/create/start`, null, { params });
  }

  /** Submit verification code or 2FA password */
  verifyLogin(
    login_session_id: string,
    code?: string,
    password_2fa?: string
  ): Observable<LoginVerifyResponse> {
    let params = new HttpParams().set('login_session_id', login_session_id);
    if (code) params = params.set('code', code);
    if (password_2fa) params = params.set('password_2fa', password_2fa);

    return this.http.post<LoginVerifyResponse>(`${this.apiUrl}/create/verify`, null, { params });
  }

  /** Poll login status */
  getLoginStatus(login_session_id: string): Observable<LoginStatusResponse> {
    const params = new HttpParams().set('login_session_id', login_session_id);
    return this.http.get<LoginStatusResponse>(`${this.apiUrl}/create/status`, { params });
  }
}
