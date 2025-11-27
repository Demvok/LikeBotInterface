
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFabButton } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TasksService, Task } from '../../services/tasks';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatFabButton,
    MatChipsModule,
    MatProgressSpinnerModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css'
})
export class Tasks implements OnInit, OnDestroy {
  allTasks: Task[] = [];
  filteredTasks: Task[] = [];
  paginatedTasks: Task[] = [];
  loading = true;
  error: string | null = null;
  expandedTaskIndex: number | null = null;
  lastUpdate: string = '';
  
  // Expose Math to template
  Math = Math;
  
  // Search and filter properties
  searchTerm: string = '';
  selectedStatus: string = 'all';
  selectedActionType: string = 'all';
  
  // Pagination properties
  pageSize = 6;
  pageIndex = 0;
  totalItems = 0;
  pageSizeOptions = [6, 12, 24, 48];
  
  // Auto-refresh properties
  private autoRefreshSubscription: Subscription | null = null;
  private countdownSubscription: Subscription | null = null;
  private autoRefreshInterval = 10000; // 30 seconds in milliseconds
  secondsUntilRefresh: number = 10; // Display countdown in seconds
  
  // Status options for filtering
  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'paused', label: 'Paused' },
    { value: 'finished', label: 'Finished' },
    { value: 'crashed', label: 'Crashed' }
  ];
  
  actionTypeOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'react', label: 'React' },
    { value: 'comment', label: 'Comment' }
  ];

  constructor(private tasksService: TasksService, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.loadTasks();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  startAutoRefresh() {
    // Stop any existing auto-refresh
    this.stopAutoRefresh();
    
    // Initialize countdown to 10 seconds
    this.secondsUntilRefresh = 10;
    
    // Start countdown timer that updates every second
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.secondsUntilRefresh--;
      if (this.secondsUntilRefresh <= 0) {
        this.secondsUntilRefresh = 10;
      }
    });
    
    // Start new auto-refresh interval (30 seconds)
    this.autoRefreshSubscription = interval(this.autoRefreshInterval).subscribe(() => {
      this.refreshTasks();
    });
  }

  stopAutoRefresh() {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = null;
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = null;
    }
  }
  
  loadTasks() {
    this.loading = true;
    this.tasksService.getTasks().subscribe({
      next: (tasks) => {
        this.allTasks = tasks;
        this.applyFilters();
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      },
      error: (err) => {
        this.error = 'Failed to load tasks';
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      }
    });
  }
  
  applyFilters() {
    let filtered = [...this.allTasks];
    
    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(term) ||
        (task.description && task.description.toLowerCase().includes(term)) ||
        (task.task_id && task.task_id.toString().includes(term))
      );
    }
    
    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(task => 
        task.status && task.status.toLowerCase() === this.selectedStatus
      );
    }
    
    // Apply action type filter
    if (this.selectedActionType !== 'all') {
      filtered = filtered.filter(task => 
        task.action.type === this.selectedActionType
      );
    }
    
    this.filteredTasks = filtered;
    this.totalItems = filtered.length;
    this.pageIndex = 0; // Reset to first page when filters change
    this.updatePaginatedTasks();
  }
  
  updatePaginatedTasks() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedTasks = this.filteredTasks.slice(startIndex, endIndex);
  }
  
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedTasks();
  }
  
  onSearchChange() {
    this.applyFilters();
  }
  
  onStatusChange() {
    this.applyFilters();
  }
  
  onActionTypeChange() {
    this.applyFilters();
  }
  
  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedActionType = 'all';
    this.applyFilters();
  }
  
  refreshTasks() {
    this.loadTasks();
  }

  toggleExpand(index: number) {
    this.expandedTaskIndex = this.expandedTaskIndex === index ? null : index;
  }
  
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'schedule';
      case 'running': return 'play_circle';
      case 'paused': return 'pause_circle';
      case 'finished': return 'check_circle';
      case 'crashed': return 'error';
      default: return 'help';
    }
  }
  
  getActionIcon(actionType: string): string {
    switch (actionType) {
      case 'react': return 'thumb_up';
      case 'comment': return 'comment';
      default: return 'help';
    }
  }

  // Helper method to check if task is finished
  isTaskFinished(task: Task): boolean {
    const finished = task.status === 'FINISHED';
    console.log(`Task ${task.task_id} status: '${task.status}' - isFinished: ${finished}`);
    return finished;
  }

  formatDate(date: Date): string {
    // Format as 'HH:mm:ss dd.MM.yyyy'
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  
  navigateToCreateTask() {
    this.router.navigate(['/tasks/create']);
  }

  // Task Management Actions
  startTask(taskId: number) {
    this.tasksService.startTask(taskId).subscribe({
      next: (response: any) => {
        console.log('Task started:', response);
        this.refreshTasks(); // Refresh to update status
      },
      error: (error: any) => {
        console.error('Error starting task:', error);
        alert(`Failed to start task: ${error.error?.detail || error.message}`);
      }
    });
  }

  pauseTask(taskId: number) {
    this.tasksService.pauseTask(taskId).subscribe({
      next: (response: any) => {
        console.log('Task paused:', response);
        this.refreshTasks(); // Refresh to update status
      },
      error: (error: any) => {
        console.error('Error pausing task:', error);
        alert(`Failed to pause task: ${error.error?.detail || error.message}`);
      }
    });
  }

  resumeTask(taskId: number) {
    this.tasksService.resumeTask(taskId).subscribe({
      next: (response: any) => {
        console.log('Task resumed:', response);
        this.refreshTasks(); // Refresh to update status
      },
      error: (error: any) => {
        console.error('Error resuming task:', error);
        alert(`Failed to resume task: ${error.error?.detail || error.message}`);
      }
    });
  }

  deleteTask(taskId: number, taskName: string) {
    const confirmed = confirm(`Are you sure you want to delete task "${taskName}"? This action cannot be undone.`);
    if (confirmed) {
      this.tasksService.deleteTask(taskId).subscribe({
        next: (response: any) => {
          console.log('Task deleted:', response);
          this.refreshTasks(); // Refresh to update list
        },
        error: (error: any) => {
          console.error('Error deleting task:', error);
          alert(`Failed to delete task: ${error.error?.detail || error.message}`);
        }
      });
    }
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'admin';
  }

  // Check if current user is guest
  isGuest(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'guest';
  }
}
