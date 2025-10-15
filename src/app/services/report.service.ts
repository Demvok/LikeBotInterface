import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
    let params = new HttpParams();
    if (reportType) {
      params = params.set('report_type', reportType);
    }
    
    let url = `${this.baseUrl}/tasks/${taskId}/report`;
    if (runId) {
      url = `${this.baseUrl}/tasks/${taskId}/runs/${runId}/report`;
    }
    
    return this.http.get<TaskReport>(url, { params });
  }

  getTaskRunReport(taskId: number, runId: string, reportType: string = 'all'): Observable<TaskReport> {
    let params = new HttpParams();
    if (reportType) {
      params = params.set('report_type', reportType);
    }
    
    const url = `${this.baseUrl}/tasks/${taskId}/runs/${runId}/report`;
    return this.http.get<TaskReport>(url, { params });
  }
}