import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  private getPhoneVariants(phone_number: string): { primary: string; fallback?: string } {
    if (!phone_number) {
      return { primary: '' };
    }

    const digits = phone_number.trim().replace(/[^0-9]/g, '');

    if (!digits) {
      return { primary: '' };
    }

    const primary = `+${digits}`;
    const fallback = digits;

    return { primary, fallback: primary === fallback ? undefined : fallback };
  }

  private withPhoneFallback<T>(phone_number: string, executor: (normalized: string) => Observable<T>): Observable<T> {
    const { primary, fallback } = this.getPhoneVariants(phone_number);

    return executor(primary).pipe(
      catchError((err) => {
        if (err.status === 404 && fallback) {
          return executor(fallback);
        }
        return throwError(() => err);
      })
    );
  }

  /** Get all accounts with optional filtering */
  getAccounts(params?: { phone_number?: string; channel_id?: number }): Observable<Account[]> {
    let httpParams = new HttpParams();
    if (params?.phone_number) {
      httpParams = httpParams.set('phone_number', params.phone_number);
    }
    if (params?.channel_id) {
      httpParams = httpParams.set('channel_id', params.channel_id.toString());
    }
    return this.http.get<Account[]>(this.apiUrl, { params: httpParams });
  }

  /** Get a specific account by phone number */
  getAccount(phone_number: string): Observable<Account> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.get<Account>(`${this.apiUrl}/${encodeURIComponent(normalized)}`)
    );
  }

  /** Create a new account */
  createAccount(account: Account): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, account);
  }

  /** Update an existing account */
  updateAccount(phone_number: string, data: Partial<Account>): Observable<{ message: string }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.put<{ message: string }>(`${this.apiUrl}/${encodeURIComponent(normalized)}`, data)
    );
  }

  /** Delete an account */
  deleteAccount(phone_number: string): Observable<{ message: string }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.delete<{ message: string }>(`${this.apiUrl}/${encodeURIComponent(normalized)}`)
    );
  }

  /** Validate an account by testing connection */
  validateAccount(phone_number: string): Observable<ValidateAccountResponse> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.put<ValidateAccountResponse>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/validate`,
        {}
      )
    );
  }

  /** Bulk create accounts */
  bulkCreateAccounts(accounts: Account[]): Observable<{ results: Array<{ phone_number: string; status: string; message: string }> }> {
    return this.http.post<{ results: Array<{ phone_number: string; status: string; message: string }> }>(`${this.apiUrl}/bulk`, accounts);
  }

  /** Bulk delete accounts */
  bulkDeleteAccounts(phone_numbers: string[]): Observable<any> {
    const normalizedPhones = phone_numbers.map((phone) => this.getPhoneVariants(phone).primary);
    return this.http.request<any>('delete', `${this.apiUrl}/bulk`, { body: normalizedPhones });
  }

  // Login Process Methods

  /** Start login process - sends verification code */
  startLogin(
    phone_number: string,
    password?: string,
    session_name?: string,
    notes?: string
  ): Observable<LoginStartResponse> {
    const { primary: sanitizedPhone } = this.getPhoneVariants(phone_number);
    let params = new HttpParams().set('phone_number', sanitizedPhone);
    if (password) params = params.set('password', password);
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

  /** Get account password (admin only) */
  getAccountPassword(phone_number: string): Observable<{ phone_number: string; has_password: boolean; password: string | null }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.get<{ phone_number: string; has_password: boolean; password: string | null }>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/password`
      )
    );
  }

  /** Index subscribed channels for an account */
  indexAccountChannels(phone_number: string): Observable<{ message: string; channels_indexed: number }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.post<{ message: string; channels_indexed: number }>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/index-channels`,
        {}
      )
    );
  }
}
