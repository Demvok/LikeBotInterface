import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Stats } from './api.models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private apiUrl = 'http://localhost:8000/stats';

  constructor(private http: HttpClient) {}

  /** Get database statistics */
  getStats(): Observable<Stats> {
    return this.http.get<Stats>(this.apiUrl);
  }
}