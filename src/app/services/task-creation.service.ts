import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TaskAction } from './api.models';

export interface TaskCreationData {
  name: string;
  description?: string;
  action: TaskAction;
  post_ids: number[];
  accounts: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TaskCreationService {
  private taskDataSubject = new BehaviorSubject<Partial<TaskCreationData>>({
    action: { type: 'react', palette: 'positive' }
  });
  
  public taskData$ = this.taskDataSubject.asObservable();
  
  private currentStageSubject = new BehaviorSubject<number>(1);
  public currentStage$ = this.currentStageSubject.asObservable();

  updateTaskData(data: Partial<TaskCreationData>) {
    const currentData = this.taskDataSubject.value;
    this.taskDataSubject.next({ ...currentData, ...data });
  }

  getCurrentTaskData(): Partial<TaskCreationData> {
    return this.taskDataSubject.value;
  }

  setCurrentStage(stage: number) {
    this.currentStageSubject.next(stage);
  }

  getCurrentStage(): number {
    return this.currentStageSubject.value;
  }

  resetTaskData() {
    this.taskDataSubject.next({
      action: { type: 'react', palette: 'positive' }
    });
    this.currentStageSubject.next(1);
  }
}