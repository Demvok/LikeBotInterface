import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStepper } from '../task-stepper/task-stepper';
import { TaskCreationService, TaskCreationData } from '../../../../services/task-creation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-task-stage-3',
  imports: [CommonModule, TaskStepper],
  templateUrl: './create-task-stage-3.html',
  styleUrl: './create-task-stage-3.css'
})
export class CreateTaskStage3 implements OnInit, OnDestroy {
  @Output() stageChange = new EventEmitter<number>();
  
  taskData: Partial<TaskCreationData> | null = null;
  private subscription: Subscription = new Subscription();

  constructor(private taskCreationService: TaskCreationService) {}

  ngOnInit() {
    this.subscription.add(
      this.taskCreationService.taskData$.subscribe(data => {
        this.taskData = data;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  goToPrevious() {
    this.taskCreationService.setCurrentStage(2);
    this.stageChange.emit(2);
  }

  createTask() {
    // TODO: Implement task creation logic
    console.log('Creating task with data:', this.taskData);
    alert('Task creation functionality will be implemented here!');
  }

  onStageChange(stage: number) {
    this.stageChange.emit(stage);
  }
}
