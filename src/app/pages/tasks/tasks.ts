
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TasksService, Task } from '../../services/tasks.service';
import { RouterModule } from '@angular/router';

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
    MatChipsModule,
    MatProgressSpinnerModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css'
})
export class Tasks implements OnInit {
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

  constructor(private tasksService: TasksService) {}

  ngOnInit() {
    this.loadTasks();
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
        task.task_id.toString().includes(term)
      );
    }
    
    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(task => 
        task.status.toLowerCase() === this.selectedStatus
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

  formatDate(date: Date): string {
    // Format as 'HH:mm:ss dd.MM.yyyy'
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
}
