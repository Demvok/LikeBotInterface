import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { map } from 'rxjs/operators';
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
  account_status: string;
  has_session: boolean;
}

export interface ChannelSyncResponse {
  message: string;
  phone_number: string;
  channels_count: number;
  chat_ids: number[];
  synced_at: string;
}

export interface AccountSubscribedChannel {
  chat_id: number;
  channel_name: string;
  is_private: boolean;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  private normalizeAccountFromApi(apiAccount: any): Account {
    if (!apiAccount || typeof apiAccount !== 'object') {
      return apiAccount as Account;
    }

    const assigned = Array.isArray(apiAccount.assigned_proxies) ? apiAccount.assigned_proxies : undefined;
    const legacy = Array.isArray(apiAccount.proxy_names) ? apiAccount.proxy_names : undefined;

    // Keep both populated for compatibility, but prefer backend naming.
    const assigned_proxies = assigned ?? legacy;
    const proxy_names = legacy ?? assigned;

    return {
      ...(apiAccount as Account),
      assigned_proxies,
      proxy_names
    };
  }

  private normalizeAccountToApi(input: Partial<Account>): any {
    if (!input || typeof input !== 'object') {
      return input;
    }

    const payload: any = { ...input };

    // Prefer assigned_proxies for backend, but accept legacy UI field.
    if (payload.assigned_proxies === undefined && Array.isArray(payload.proxy_names)) {
      payload.assigned_proxies = payload.proxy_names;
    }

    // Avoid sending legacy fields that backend may reject.
    delete payload.proxy_names;

    return payload;
  }

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
    const buildParams = (input?: { phone_number?: string; channel_id?: number }, includeChannelId: boolean = true): HttpParams => {
      let httpParams = new HttpParams();
      if (input?.phone_number) {
        httpParams = httpParams.set('phone_number', input.phone_number);
      }
      if (includeChannelId && input?.channel_id !== undefined) {
        httpParams = httpParams.set('channel_id', input.channel_id.toString());
      }
      return httpParams;
    };

    const withChannelFilter = this.http.get<any[]>(this.apiUrl, { params: buildParams(params, true) }).pipe(
      map((accounts) => (Array.isArray(accounts) ? accounts.map((a) => this.normalizeAccountFromApi(a)) : []))
    );

    // If backend dropped the old channel_id filter, retry without it to keep the page usable.
    if (params?.channel_id !== undefined) {
      return withChannelFilter.pipe(
        catchError((err) => {
          if (err?.status === 400 || err?.status === 404 || err?.status === 422) {
            return this.http.get<any[]>(this.apiUrl, { params: buildParams(params, false) }).pipe(
              map((accounts) => (Array.isArray(accounts) ? accounts.map((a) => this.normalizeAccountFromApi(a)) : []))
            );
          }
          return throwError(() => err);
        })
      );
    }

    return withChannelFilter;
  }

  /** Get a specific account by phone number */
  getAccount(phone_number: string): Observable<Account> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(normalized)}`).pipe(
        map((account) => this.normalizeAccountFromApi(account))
      )
    );
  }

  /** Create a new account */
  createAccount(account: Account): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, this.normalizeAccountToApi(account));
  }

  /** Update an existing account */
  updateAccount(phone_number: string, data: Partial<Account>): Observable<{ message: string }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.put<{ message: string }>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}`,
        this.normalizeAccountToApi(data)
      )
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
    return this.http.post<{ results: Array<{ phone_number: string; status: string; message: string }> }>(
      `${this.apiUrl}/bulk`,
      accounts.map((account) => this.normalizeAccountToApi(account))
    );
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
  indexAccountChannels(phone_number: string): Observable<ChannelSyncResponse> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.post<ChannelSyncResponse>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/channels/sync`,
        {}
      )
    );
  }

  /** Get channels an account is subscribed to. */
  getAccountSubscribedChannels(phone_number: string): Observable<AccountSubscribedChannel[]> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.get<AccountSubscribedChannel[]>(`${this.apiUrl}/${encodeURIComponent(normalized)}/channels`)
    );
  }

  // Proxy linking (Stage 1)

  /** List proxies linked to an account. */
  getAccountProxies(phone_number: string): Observable<any[]> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.get<any[]>(`${this.apiUrl}/${encodeURIComponent(normalized)}/proxies`)
    );
  }

  /** Link a proxy to an account. */
  linkProxyToAccount(phone_number: string, proxy_name: string): Observable<{ message: string }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.post<{ message: string }>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/proxies/${encodeURIComponent(proxy_name)}`,
        {}
      )
    );
  }

  /** Unlink a proxy from an account. */
  unlinkProxyFromAccount(phone_number: string, proxy_name: string): Observable<{ message: string }> {
    return this.withPhoneFallback(phone_number, (normalized) =>
      this.http.delete<{ message: string }>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/proxies/${encodeURIComponent(proxy_name)}`
      )
    );
  }

  /** Auto-assign proxies to an account. */
  autoAssignProxies(
    phone_number: string,
    options?: { desired_count?: number; active_only?: boolean }
  ): Observable<{ phone_number: string; target: number; assigned_proxies: string[]; added: string[]; remaining: number }> {
    return this.withPhoneFallback(phone_number, (normalized) => {
      let params = new HttpParams();
      if (options?.desired_count !== undefined) params = params.set('desired_count', String(options.desired_count));
      if (options?.active_only !== undefined) params = params.set('active_only', String(options.active_only));

      return this.http.post<{ phone_number: string; target: number; assigned_proxies: string[]; added: string[]; remaining: number }>(
        `${this.apiUrl}/${encodeURIComponent(normalized)}/proxies/auto-assign`,
        {},
        { params }
      );
    });
  }
}
