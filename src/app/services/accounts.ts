import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  /** Get all accounts with optional filtering */
  getAccounts(params?: { phone_number?: string }): Observable<Account[]> {
    let httpParams = new HttpParams();
    if (params?.phone_number) httpParams = httpParams.set('phone_number', params.phone_number);
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

  /** Bulk create accounts */
  bulkCreateAccounts(accounts: Account[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, accounts);
  }

  /** Bulk delete accounts */
  bulkDeleteAccounts(phone_numbers: string[]): Observable<any> {
    return this.http.request<any>('delete', `${this.apiUrl}/bulk`, { body: phone_numbers });
  }
}
