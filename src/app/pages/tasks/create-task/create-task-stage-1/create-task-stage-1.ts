import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskStepper } from '../task-stepper/task-stepper';
import { TaskCreationService } from '../../../../services/task-creation.service';
import { PalettesService } from '../../../../services/palettes.service';
import { TaskAction, Palette } from '../../../../services/api.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-task-stage-1',
  imports: [CommonModule, ReactiveFormsModule, TaskStepper],
  templateUrl: './create-task-stage-1.html',
  styleUrl: './create-task-stage-1.css'
})
export class CreateTaskStage1 implements OnInit, OnDestroy {
  @Output() stageChange = new EventEmitter<number>();
  
  taskForm: FormGroup;
  actionType: 'react' | 'comment' | '' = '';
  palettes: Palette[] = [];
  loadingPalettes = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private taskCreationService: TaskCreationService,
    private palettesService: PalettesService
  ) {
    this.taskForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      actionType: ['', Validators.required],
      palette: [''],
      commentContent: ['']
    });
  }

  ngOnInit() {
    // Load palettes from API
    this.loadPalettes();

    // Load existing data if any
    const existingData = this.taskCreationService.getCurrentTaskData();
    if (existingData) {
      this.taskForm.patchValue({
        name: existingData.name || '',
        description: existingData.description || '',
        actionType: existingData.action?.type || '',
        palette: existingData.action?.palette || '',
        commentContent: existingData.action?.content || ''
      });
      this.actionType = existingData.action?.type || '';
    }

    // Watch for action type changes
    this.subscription.add(
      this.taskForm.get('actionType')?.valueChanges.subscribe(value => {
        this.actionType = value;
        this.updateValidators();
      })
    );

    // Auto-save form changes
    this.subscription.add(
      this.taskForm.valueChanges.subscribe(() => {
        this.saveCurrentData();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadPalettes() {
    this.loadingPalettes = true;
    this.palettesService.getPalettes().subscribe(
      (palettes) => {
        this.palettes = palettes;
        console.log('Loaded palettes:', this.palettes);
        this.loadingPalettes = false;
      },
      (error) => {
        console.error('Failed to load palettes:', error);
        this.loadingPalettes = false;
      }
    );
  }

  private updateValidators() {
    const paletteControl = this.taskForm.get('palette');
    const commentContentControl = this.taskForm.get('commentContent');

    if (this.actionType === 'react') {
      paletteControl?.setValidators([Validators.required]);
      commentContentControl?.clearValidators();
    } else if (this.actionType === 'comment') {
      commentContentControl?.setValidators([Validators.required]);
      paletteControl?.clearValidators();
    } else {
      paletteControl?.clearValidators();
      commentContentControl?.clearValidators();
    }

    paletteControl?.updateValueAndValidity();
    commentContentControl?.updateValueAndValidity();
  }

  private saveCurrentData() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const action: TaskAction = {
        type: formValue.actionType
      };

      if (formValue.actionType === 'react') {
        action.palette = formValue.palette;
      } else if (formValue.actionType === 'comment') {
        action.content = formValue.commentContent;
      }

      this.taskCreationService.updateTaskData({
        name: formValue.name,
        description: formValue.description,
        action: action
      });
    }
  }

  canProceed(): boolean {
    const nameValid = this.taskForm.get('name')?.valid;
    const actionTypeValid = this.taskForm.get('actionType')?.valid;
    
    if (!nameValid || !actionTypeValid) {
      return false;
    }

    if (this.actionType === 'react') {
      return this.taskForm.get('palette')?.valid || false;
    } else if (this.actionType === 'comment') {
      return this.taskForm.get('commentContent')?.valid || false;
    }

    return false;
  }

  proceedToNext() {
    if (this.canProceed()) {
      this.saveCurrentData();
      this.taskCreationService.setCurrentStage(2);
      this.stageChange.emit(2);
    }
  }

  onStageChange(stage: number) {
    this.stageChange.emit(stage);
  }

  onSubmit() {
    if (this.taskForm.valid) {
      this.proceedToNext();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.taskForm.controls).forEach(key => {
        this.taskForm.get(key)?.markAsTouched();
      });
    }
  }
}
