import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTaskStage2 } from './create-task-stage-2';

describe('CreateTaskStage2', () => {
  let component: CreateTaskStage2;
  let fixture: ComponentFixture<CreateTaskStage2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTaskStage2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTaskStage2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
