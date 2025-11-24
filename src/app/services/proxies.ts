import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Proxy {
  proxy_name: string;
  proxy_type: string;
  host: string;
  port: number;
  username?: string;
  is_active: boolean;
  current_usage?: number;
  max_usage?: number;
  last_error?: string;
  last_error_time?: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyStats {
  total_proxies: number;
  active_proxies: number;
  inactive_proxies: number;
  total_usage: number;
  proxies_with_errors: number;
  proxies: Array<{
    proxy_name: string;
    current_usage: number;
    max_usage?: number;
    is_active: boolean;
    has_error: boolean;
  }>;
}

@Injectable({ providedIn: 'root' })
export class ProxiesService {
  private apiUrl = `${environment.apiUrl}/proxies`;

  constructor(private http: HttpClient) {}

  /**
   * Transform API response to match frontend interface
   */
  private transformProxy(apiProxy: any): Proxy {
    const port = apiProxy.socks5_port || apiProxy.http_port || apiProxy.port || 0;
    
    return {
      proxy_name: apiProxy.proxy_name,
      proxy_type: apiProxy.type || apiProxy.proxy_type || 'socks5',
      host: apiProxy.host,
      port: port,
      username: apiProxy.username,
      is_active: apiProxy.active !== undefined ? apiProxy.active : apiProxy.is_active !== undefined ? apiProxy.is_active : true,
      current_usage: apiProxy.connected_accounts !== undefined ? apiProxy.connected_accounts : apiProxy.current_usage,
      max_usage: apiProxy.max_usage,
      last_error: apiProxy.last_error,
      last_error_time: apiProxy.last_error_time,
      created_at: apiProxy.created_at,
      updated_at: apiProxy.updated_at
    };
  }

  /**
   * Get all proxies with optional filtering
   */
  getProxies(filters?: { proxy_name?: string; is_active?: boolean }): Observable<Proxy[]> {
    let params = new HttpParams();
    if (filters?.proxy_name) {
      params = params.set('proxy_name', filters.proxy_name);
    }
    if (filters?.is_active !== undefined) {
      params = params.set('active_only', filters.is_active.toString());
    }
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(proxies => proxies.map(p => this.transformProxy(p)))
    );
  }

  /**
   * Get a specific proxy by name
   */
  getProxyByName(proxy_name: string): Observable<Proxy> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(proxy_name)}`).pipe(
      map(p => this.transformProxy(p))
    );
  }

  /**
   * Create a new proxy
   */
  createProxy(data: {
    proxy_name: string;
    proxy_type: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    is_active?: boolean;
    max_usage?: number;
  }): Observable<any> {
    let params = new HttpParams();
    params = params.set('proxy_name', data.proxy_name);
    params = params.set('proxy_type', data.proxy_type);
    params = params.set('host', data.host);
    params = params.set('port', data.port.toString());
    
    if (data.username) params = params.set('username', data.username);
    if (data.password) params = params.set('password', data.password);
    if (data.is_active !== undefined) params = params.set('active', data.is_active.toString());
    if (data.max_usage !== undefined) params = params.set('notes', `Max usage: ${data.max_usage}`);

    return this.http.post<any>(this.apiUrl, null, { params });
  }

  /**
   * Update an existing proxy
   */
  updateProxy(proxy_name: string, data: Partial<{
    proxy_type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    is_active: boolean;
    max_usage: number;
  }>): Observable<any> {
    let params = new HttpParams();
    
    if (data.proxy_type) params = params.set('proxy_type', data.proxy_type);
    if (data.host) params = params.set('host', data.host);
    if (data.port) params = params.set('port', data.port.toString());
    if (data.username !== undefined) params = params.set('username', data.username || '');
    if (data.password !== undefined) params = params.set('password', data.password || '');
    if (data.is_active !== undefined) params = params.set('active', data.is_active.toString());
    if (data.max_usage !== undefined) params = params.set('notes', `Max usage: ${data.max_usage}`);

    return this.http.put<any>(`${this.apiUrl}/${encodeURIComponent(proxy_name)}`, null, { params });
  }

  /**
   * Delete a proxy
   */
  deleteProxy(proxy_name: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${encodeURIComponent(proxy_name)}`);
  }

  /**
   * Get proxy statistics
   */
  getProxyStats(): Observable<ProxyStats> {
    return this.http.get<ProxyStats>(`${this.apiUrl}/stats/summary`);
  }
}
