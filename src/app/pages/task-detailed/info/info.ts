import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksService, Task } from '../../../services/tasks.service';
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
    this.tasksService.getTask(id).subscribe({
      next: (task: Task) => {
        this.task = task;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load task';
      }
    });
  }

}
