import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateTaskStage1 } from '../create-task-stage-1/create-task-stage-1';
import { CreateTaskStage2 } from '../create-task-stage-2/create-task-stage-2';
import { CreateTaskStage3 } from '../create-task-stage-3/create-task-stage-3';
import { TaskCreationService } from '../../../../services/task-creation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-task-main',
  imports: [CommonModule, CreateTaskStage1, CreateTaskStage2, CreateTaskStage3],
  templateUrl: './create-task-main.html',
  styleUrl: './create-task-main.css'
})
export class CreateTaskMain implements OnInit, OnDestroy {
  currentStage: number = 1;
  private subscription: Subscription = new Subscription();

  constructor(private taskCreationService: TaskCreationService) {}

  ngOnInit() {
    // Initialize the task creation process
    this.taskCreationService.resetTaskData();
    
    this.subscription.add(
      this.taskCreationService.currentStage$.subscribe(stage => {
        this.currentStage = stage;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onStageChange(stage: number) {
    this.currentStage = stage;
  }
}
