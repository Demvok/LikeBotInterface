import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { APP_VERSION } from '../../app-version';
import { catchError, finalize, of } from 'rxjs';

type BackendInfoResponse = {
  message?: string;
  version?: string;
};

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  frontendVersion = APP_VERSION;

  backendVersion: string | null = null;
  backendMessage: string | null = null;
  backendVersionLoading = false;
  backendVersionError: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadBackendInfo();
  }

  private loadBackendInfo(): void {
    this.backendVersionLoading = true;
    this.backendVersionError = null;

    this.http
      .get<BackendInfoResponse>(`${environment.apiUrl}/`)
      .pipe(
        catchError((err) => {
          const message = err?.error?.detail || err?.message || 'Failed to load backend version';
          this.backendVersionError = String(message);
          return of(null);
        }),
        finalize(() => {
          this.backendVersionLoading = false;
        })
      )
      .subscribe((res) => {
        if (!res) return;
        this.backendMessage = res.message ?? null;
        this.backendVersion = res.version ?? null;
      });
  }

}
