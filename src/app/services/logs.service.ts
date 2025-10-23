import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LogsStreamOptions {
  logFile?: string;
  tail?: number;
}

export type LogsStreamEvent =
  | { kind: 'open' }
  | { kind: 'line'; text: string }
  | { kind: 'error'; message: string; raw?: unknown }
  | { kind: 'close'; code: number; reason: string; wasClean: boolean };

@Injectable({
  providedIn: 'root'
})
export class LogsService {
  private readonly baseUrl = this.resolveBaseUrl();

  streamLogs(options: LogsStreamOptions = {}): Observable<LogsStreamEvent> {
    if (typeof window === 'undefined') {
      return new Observable<LogsStreamEvent>((observer) => {
        observer.error(new Error('WebSocket streaming is not supported on the server.'));
      });
    }

    const url = this.buildUrl(options);

    return new Observable<LogsStreamEvent>((observer) => {
      const socket = new WebSocket(url);
      let closedByClient = false;

      socket.onopen = () => observer.next({ kind: 'open' });

      socket.onmessage = (event: MessageEvent) => {
        const payload = typeof event.data === 'string' ? event.data : String(event.data ?? '');
        const parsed = this.tryParseJson(payload);

        if (parsed && typeof parsed === 'object' && 'type' in parsed && (parsed as any).type === 'error') {
          observer.next({
            kind: 'error',
            message: typeof (parsed as any).message === 'string' ? (parsed as any).message : 'Log stream error',
            raw: parsed
          });
          return;
        }

        // Split multiline payloads so filtering and highlighting stay predictable.
        payload.split(/\r?\n/).forEach((line, index, lines) => {
          if (line.length === 0 && index === lines.length - 1) {
            return;
          }
          observer.next({ kind: 'line', text: line });
        });
      };

      socket.onerror = () => {
        observer.error(new Error('WebSocket connection error.'));
      };

      socket.onclose = (event: CloseEvent) => {
        observer.next({ kind: 'close', code: event.code, reason: event.reason, wasClean: event.wasClean });
        if (!closedByClient) {
          observer.complete();
        }
      };

      return () => {
        closedByClient = true;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };
    });
  }

  private buildUrl(options: LogsStreamOptions): string {
    const params = new URLSearchParams();

    if (options.logFile) {
      params.set('log_file', options.logFile);
    }

    if (typeof options.tail === 'number') {
      params.set('tail', String(options.tail));
    }

    const query = params.toString();
    const path = '/ws/logs';
    return query ? `${this.baseUrl}${path}?${query}` : `${this.baseUrl}${path}`;
  }

  private resolveBaseUrl(): string {
    if (environment.logsWsUrl) {
      return environment.logsWsUrl.replace(/\/$/, '');
    }

    return this.deriveWsUrlFromApi(environment.apiUrl);
  }

  private deriveWsUrlFromApi(apiUrl: string): string {
    try {
      const url = new URL(apiUrl);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '';
      url.search = '';
      url.hash = '';
      return url.origin;
    } catch {
      return 'ws://localhost:8000';
    }
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
