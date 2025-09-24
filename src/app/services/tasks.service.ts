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
}
