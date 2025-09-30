import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TaskAction, Post } from './api.models';

// Interface for locally stored posts before submission
export interface LocalPost {
  message_link: string;
  isExisting?: boolean;
  existingData?: Post;
  tempId: string; // Temporary ID for local tracking
}

export interface TaskCreationData {
  name: string;
  description?: string;
  action: TaskAction;
  post_ids: number[];
  post_links?: string[]; // Temporary storage for post links before creation
  local_posts?: LocalPost[]; // Store local posts data
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

  // Store local posts data
  updateLocalPosts(localPosts: LocalPost[]) {
    const currentData = this.taskDataSubject.value;
    const postLinks = localPosts.map(post => post.message_link);
    this.taskDataSubject.next({ 
      ...currentData, 
      local_posts: localPosts,
      post_links: postLinks
    });
  }

  // Get stored local posts
  getLocalPosts(): LocalPost[] {
    return this.taskDataSubject.value.local_posts || [];
  }
}