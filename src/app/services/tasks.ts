import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, Run, TaskStatus } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  /** Get all tasks with optional filtering */
  getTasks(params?: { task_id?: number; status?: TaskStatus; name?: string }): Observable<Task[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.task_id !== undefined) httpParams = httpParams.set('task_id', params.task_id);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.name) httpParams = httpParams.set('name', params.name);
    }
    return this.http.get<Task[]>(this.apiUrl, { params: httpParams });
  }

  /** Get a specific task by ID */
  getTask(task_id: number): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${task_id}`);
  }

  /** Create a new task */
  createTask(task: Partial<Task>): Observable<{ message: string; task_id: number }> {
    return this.http.post<{ message: string; task_id: number }>(this.apiUrl, task);
  }

  /** Update an existing task */
  updateTask(task_id: number, data: Partial<Task>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${task_id}`, data);
  }

  /** Delete a task */
  deleteTask(task_id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${task_id}`);
  }

  /** Task actions: start, pause, resume */
  startTask(task_id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${task_id}/start`, {});
  }
  pauseTask(task_id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${task_id}/pause`, {});
  }
  resumeTask(task_id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${task_id}/resume`, {});
  }

  /** Get task status */
  getTaskStatus(task_id: number): Observable<{ task_id: number; status: TaskStatus }> {
    return this.http.get<{ task_id: number; status: TaskStatus }>(`${this.apiUrl}/${task_id}/status`);
  }

  /** Get all runs for a task */
  getTaskRuns(task_id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${task_id}/runs`);
  }

  /** Get report for a task or run */
  getTaskReport(task_id: number, report_type?: string, run_id?: string): Observable<any> {
    let url = run_id
      ? `${this.apiUrl}/${task_id}/runs/${run_id}/report`
      : `${this.apiUrl}/${task_id}/report`;
    let params = report_type ? { report_type } : undefined;
    return this.http.get<any>(url, { params });
  }

  /** Delete a specific run */
  deleteTaskRun(task_id: number, run_id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${task_id}/runs/${run_id}`);
  }

  /** Delete all runs for a task */
  deleteAllTaskRuns(task_id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${task_id}/runs`);
  }
}
