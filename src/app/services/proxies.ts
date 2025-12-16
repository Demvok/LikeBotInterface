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
  /** Backend field: number of accounts currently using the proxy. */
  connected_accounts?: number;
  /** Backend field: number of accounts linked to the proxy. */
  linked_accounts_count?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyImportResult {
  message: string;
  dry_run: boolean;
  total: number;
  imported?: number;
  skipped?: Array<{ proxy_name: string; reason: string }>;
  errors?: Array<any>;
}

export interface ProxyTestResult {
  proxy_name: string;
  endpoint: string;
  target_url: string;
  latency_ms: number;
  status_code: number;
  details?: any;
}

export interface ProxyStats {
  total_proxies: number;
  active_proxies: number;
  inactive_proxies: number;
  total_connected_accounts: number;
  least_used_proxy?: {
    proxy_name: string;
    connected_accounts: number;
  };
  most_used_proxy?: {
    proxy_name: string;
    connected_accounts: number;
  };
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
      connected_accounts: apiProxy.connected_accounts,
      linked_accounts_count: apiProxy.linked_accounts_count,
      notes: apiProxy.notes,
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
    notes?: string;
  }): Observable<any> {
    let params = new HttpParams();
    params = params.set('proxy_name', data.proxy_name);
    params = params.set('proxy_type', data.proxy_type);
    params = params.set('host', data.host);
    params = params.set('port', data.port.toString());
    
    if (data.username) params = params.set('username', data.username);
    if (data.password) params = params.set('password', data.password);
    if (data.is_active !== undefined) params = params.set('active', data.is_active.toString());
    if (data.notes !== undefined) params = params.set('notes', data.notes || '');

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
    notes: string;
  }>): Observable<any> {
    let params = new HttpParams();
    
    if (data.proxy_type) params = params.set('proxy_type', data.proxy_type);
    if (data.host) params = params.set('host', data.host);
    if (data.port) params = params.set('port', data.port.toString());
    if (data.username !== undefined) params = params.set('username', data.username || '');
    if (data.password !== undefined) params = params.set('password', data.password || '');
    if (data.is_active !== undefined) params = params.set('active', data.is_active.toString());
    if (data.notes !== undefined) params = params.set('notes', data.notes || '');

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

  /**
   * Import proxies from a text file using backend bulk import endpoint.
   * Backend expects multipart form-data with field name `proxy_file`.
   */
  importProxies(file: File, options?: { proxy_type?: string; base_name?: string; dry_run?: boolean }): Observable<ProxyImportResult> {
    const form = new FormData();
    form.append('proxy_file', file, file.name);

    let params = new HttpParams();
    if (options?.proxy_type) params = params.set('proxy_type', options.proxy_type);
    if (options?.base_name) params = params.set('base_name', options.base_name);
    if (options?.dry_run !== undefined) params = params.set('dry_run', String(options.dry_run));

    return this.http.post<ProxyImportResult>(`${this.apiUrl}/import`, form, { params });
  }

  /** Test proxy connectivity via backend endpoint. */
  testProxy(proxy_name: string, options?: { test_url?: string; timeout_seconds?: number }): Observable<ProxyTestResult> {
    let params = new HttpParams();
    if (options?.test_url) params = params.set('test_url', options.test_url);
    if (options?.timeout_seconds !== undefined) params = params.set('timeout_seconds', String(options.timeout_seconds));

    return this.http.post<ProxyTestResult>(`${this.apiUrl}/${encodeURIComponent(proxy_name)}/test`, {}, { params });
  }

  /**
   * Import proxies from CSV file
   */
  importProxiesFromCsv(file: File): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          
          // Parse CSV headers (first line)
          const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
          
          // Parse CSV rows
          const proxies: any[] = [];
          const generatedNames = new Set<string>();
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const values = line.split(',').map((v: string) => v.trim());
            const proxy: any = {};
            
            headers.forEach((header: string, index: number) => {
              proxy[header] = values[index];
            });
            
            // Generate unique proxy name from host and port
            if (proxy.host && proxy.port) {
              // Create base name from host IP (last 2 octets)
              const hostParts = proxy.host.split('.');
              const shortHost = hostParts.slice(-2).join('_'); // e.g., "217_82"
              let proxyName = `proxy_${shortHost}_${proxy.port}`;
              
              // Ensure unique name
              let counter = 1;
              let uniqueName = proxyName;
              while (generatedNames.has(uniqueName)) {
                uniqueName = `${proxyName}_${counter}`;
                counter++;
              }
              
              proxy.proxy_name = uniqueName;
              generatedNames.add(uniqueName);
              proxy.proxy_type = proxy.proxy_type || 'socks5'; // Default type
              proxies.push(proxy);
            }
          }
          
          if (proxies.length === 0) {
            observer.error({ error: { detail: 'No valid proxy data found in CSV' } });
            return;
          }
          
          // Import proxies one by one
          const results: any[] = [];
          let completed = 0;
          
          proxies.forEach((proxy, index) => {
            const createData = {
              proxy_name: proxy.proxy_name,
              proxy_type: proxy.proxy_type || 'socks5',
              host: proxy.host,
              port: parseInt(proxy.port, 10),
              username: proxy.username,
              password: proxy.password,
              is_active: true
            };
            
            this.createProxy(createData).subscribe({
              next: (response) => {
                results[index] = {
                  proxy_name: proxy.proxy_name,
                  status: 'success',
                  message: 'Proxy created successfully'
                };
                completed++;
                
                if (completed === proxies.length) {
                  observer.next({ results });
                  observer.complete();
                }
              },
              error: (error) => {
                const errorMsg = error?.error?.detail || 'Failed to create proxy';
                results[index] = {
                  proxy_name: proxy.proxy_name,
                  status: errorMsg.includes('already exists') ? 'skipped' : 'error',
                  message: errorMsg
                };
                completed++;
                
                if (completed === proxies.length) {
                  observer.next({ results });
                  observer.complete();
                }
              }
            });
          });
        } catch (error) {
          observer.error({ error: { detail: 'Failed to parse CSV file' } });
        }
      };
      
      reader.onerror = () => {
        observer.error({ error: { detail: 'Failed to read file' } });
      };
      
      reader.readAsText(file);
    });
  }
}
