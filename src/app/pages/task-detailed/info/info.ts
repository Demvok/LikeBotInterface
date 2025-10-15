import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksService, Task } from '../../../services/tasks';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info.html',
  styleUrl: './info.css'
})
export class Info implements OnInit {
  task: Task | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private tasksService: TasksService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.route.params.subscribe(params => {
        const taskId = params['id'];
        this.loadTask(taskId);
      });
    }
  }

  private loadTask(id: string) {
    this.loading = true;
    this.error = null;
    this.tasksService.getTask(Number(id)).subscribe({
      next: (task: Task) => {
        this.task = task;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load task information. Please try again.';
      }
    });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'Pending',
      'RUNNING': 'Running',
      'PAUSED': 'Paused',
      'FINISHED': 'Completed',
      'CRASHED': 'Failed'
    };
    return statusMap[status] || status;
  }

  getActionTypeText(actionType: string): string {
    const actionMap: { [key: string]: string } = {
      'react': 'React to Posts',
      'comment': 'Comment on Posts'
    };
    return actionMap[actionType] || actionType;
  }

  getTaskDuration(): string {
    if (!this.task || !this.task.created_at || !this.task.updated_at) return 'N/A';
    
    const createdDate = new Date(this.task.created_at);
    const updatedDate = new Date(this.task.updated_at);
    const diffInMs = updatedDate.getTime() - createdDate.getTime();
    
    if (diffInMs < 1000) {
      return 'Less than a second';
    }
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInHours > 0) {
      const remainingMinutes = diffInMinutes % 60;
      return `${diffInHours}h ${remainingMinutes}m`;
    } else {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    }
  }

  getFormattedTime(): string {
    const now = new Date();
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  }

  // Task Management Actions
  startTask() {
    if (!this.task || !this.task.task_id) return;
    
    this.tasksService.startTask(this.task.task_id).subscribe({
      next: (response: any) => {
        console.log('Task started:', response);
        this.loadTask(this.task!.task_id!.toString()); // Refresh task data
      },
      error: (error: any) => {
        console.error('Error starting task:', error);
        alert(`Failed to start task: ${error.error?.detail || error.message}`);
      }
    });
  }

  pauseTask() {
    if (!this.task || !this.task.task_id) return;
    
    this.tasksService.pauseTask(this.task.task_id).subscribe({
      next: (response: any) => {
        console.log('Task paused:', response);
        this.loadTask(this.task!.task_id!.toString()); // Refresh task data
      },
      error: (error: any) => {
        console.error('Error pausing task:', error);
        alert(`Failed to pause task: ${error.error?.detail || error.message}`);
      }
    });
  }

  resumeTask() {
    if (!this.task || !this.task.task_id) return;
    
    this.tasksService.resumeTask(this.task.task_id).subscribe({
      next: (response: any) => {
        console.log('Task resumed:', response);
        this.loadTask(this.task!.task_id!.toString()); // Refresh task data
      },
      error: (error: any) => {
        console.error('Error resuming task:', error);
        alert(`Failed to resume task: ${error.error?.detail || error.message}`);
      }
    });
  }

  deleteTask() {
    if (!this.task || !this.task.task_id) return;
    
    const confirmed = confirm(`Are you sure you want to delete task "${this.task.name}"? This action cannot be undone.`);
    if (confirmed) {
      this.tasksService.deleteTask(this.task.task_id).subscribe({
        next: (response: any) => {
          console.log('Task deleted:', response);
          alert(`Task "${this.task!.name}" has been deleted successfully.`);
          // Navigate back to tasks list or show success message
          window.history.back();
        },
        error: (error: any) => {
          console.error('Error deleting task:', error);
          alert(`Failed to delete task: ${error.error?.detail || error.message}`);
        }
      });
    }
  }
}
