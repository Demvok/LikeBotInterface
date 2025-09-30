import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTaskStage3 } from './create-task-stage-3';

describe('CreateTaskStage3', () => {
  let component: CreateTaskStage3;
  let fixture: ComponentFixture<CreateTaskStage3>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTaskStage3]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTaskStage3);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
