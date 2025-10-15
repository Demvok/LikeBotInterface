import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TaskAction {
  type: 'react' | 'comment';
  palette?: 'positive' | 'negative';
  content?: string;
}

export interface Task {
  task_id: number;
  name: string;
  description?: string;
  post_ids: number[];
  accounts: string[];
  action: TaskAction;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'CRASHED';
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks`);
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/tasks/${id}`);
  }

  createTask(task: Omit<Task, 'task_id' | 'status' | 'created_at' | 'updated_at'>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks`, task);
  }

  updateTask(id: number, task: Partial<Task>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tasks/${id}`, task);
  }

  deleteTask(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tasks/${id}`);
  }

  startTask(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks/${id}/start`, {});
  }

  pauseTask(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks/${id}/pause`, {});
  }

  resumeTask(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks/${id}/resume`, {});
  }

  getTaskStatus(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tasks/${id}/status`);
  }

  getTaskReport(id: number, reportType: string = 'success', runId?: string): Observable<any> {
    let url = `${this.apiUrl}/tasks/${id}/report?report_type=${reportType}`;
    if (runId) {
      url += `&run_id=${runId}`;
    }
    return this.http.get<any>(url);
  }
}
