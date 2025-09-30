import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskCreationService } from '../../../../services/task-creation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-task-stepper',
  imports: [CommonModule],
  templateUrl: './task-stepper.html',
  styleUrl: './task-stepper.css'
})
export class TaskStepper implements OnInit, OnDestroy {
  @Output() stageChange = new EventEmitter<number>();
  
  currentStage: number = 1;
  private subscription: Subscription = new Subscription();

  constructor(private taskCreationService: TaskCreationService) {}

  ngOnInit() {
    this.subscription.add(
      this.taskCreationService.currentStage$.subscribe(stage => {
        this.currentStage = stage;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  goToStage(stage: number) {
    if (stage <= this.currentStage || stage === this.currentStage + 1) {
      this.taskCreationService.setCurrentStage(stage);
      this.stageChange.emit(stage);
    }
  }
}
