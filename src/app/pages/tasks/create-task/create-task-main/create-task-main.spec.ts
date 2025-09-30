import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTaskMain } from './create-task-main';

describe('CreateTaskMain', () => {
  let component: CreateTaskMain;
  let fixture: ComponentFixture<CreateTaskMain>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTaskMain]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTaskMain);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
