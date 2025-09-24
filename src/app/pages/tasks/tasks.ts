
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { TasksService, Task } from '../../services/tasks.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css'
})
export class Tasks implements OnInit {
  tasks: Task[] = [];
  loading = true;
  error: string | null = null;
  expandedTaskIndex: number | null = null;
  lastUpdate: string = '';

  constructor(private tasksService: TasksService) {}

  ngOnInit() {
    this.tasksService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
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

  toggleExpand(index: number) {
    this.expandedTaskIndex = this.expandedTaskIndex === index ? null : index;
  }

  formatDate(date: Date): string {
    // Format as 'HH:mm:ss dd.MM.yyyy'
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
}
