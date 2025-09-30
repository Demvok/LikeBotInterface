import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskStepper } from './task-stepper';

describe('TaskStepper', () => {
  let component: TaskStepper;
  let fixture: ComponentFixture<TaskStepper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskStepper]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskStepper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
