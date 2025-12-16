import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReportEvent, TaskReport } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  private normalizeTaskReport(raw: any): TaskReport {
    const task_id = raw?.task_id;
    const run_id = raw?.run_id ?? null;
    const report = raw?.report;

    // Legacy/alternate shape: report is an array of events
    if (Array.isArray(report)) {
      return {
        task_id,
        run_id,
        report: {
          events: report as ReportEvent[],
          summary: undefined
        }
      };
    }

    // Expected shape: report is an object with events
    if (report && Array.isArray(report.events)) {
      return {
        task_id,
        run_id,
        report: {
          events: report.events as ReportEvent[],
          summary: report.summary
        }
      };
    }

    // Fallback: keep it safe and renderable
    return {
      task_id,
      run_id,
      report: {
        events: [],
        summary: report?.summary
      }
    };
  }

  getTaskReport(taskId: number, reportType: string = 'all', runId?: string): Observable<TaskReport> {
    let params = new HttpParams();
    if (reportType) {
      params = params.set('report_type', reportType);
    }
    
    let url = `${this.baseUrl}/tasks/${taskId}/report`;
    if (runId) {
      url = `${this.baseUrl}/tasks/${taskId}/runs/${runId}/report`;
    }
    
    return this.http.get<any>(url, { params }).pipe(map((raw) => this.normalizeTaskReport(raw)));
  }

  getTaskRunReport(taskId: number, runId: string, reportType: string = 'all'): Observable<TaskReport> {
    let params = new HttpParams();
    if (reportType) {
      params = params.set('report_type', reportType);
    }
    
    const url = `${this.baseUrl}/tasks/${taskId}/runs/${runId}/report`;
    return this.http.get<any>(url, { params }).pipe(map((raw) => this.normalizeTaskReport(raw)));
  }
}