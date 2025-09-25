import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TaskReport } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getTaskReport(taskId: number, reportType: string = 'all', runId?: string): Observable<TaskReport> {
    let url = `${this.baseUrl}/tasks/${taskId}/report?report_type=${reportType}`;
    if (runId) {
      url += `&run_id=${runId}`;
    }
    return this.http.get<TaskReport>(url);
  }

  getTaskRunReport(taskId: number, runId: string, reportType: string = 'all'): Observable<TaskReport> {
    const url = `${this.baseUrl}/tasks/${taskId}/runs/${runId}/report?report_type=${reportType}`;
    return this.http.get<TaskReport>(url);
  }
}