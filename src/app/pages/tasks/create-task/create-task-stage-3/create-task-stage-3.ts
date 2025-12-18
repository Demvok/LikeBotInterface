import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskStepper } from '../task-stepper/task-stepper';
import { TaskCreationService, TaskCreationData } from '../../../../services/task-creation.service';
import { AccountsService } from '../../../../services/accounts';
import { TasksService } from '../../../../services/tasks';
import { PostsService } from '../../../../services/posts';
import { Account, Task } from '../../../../services/api.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-task-stage-3',
  imports: [CommonModule, FormsModule, TaskStepper],
  templateUrl: './create-task-stage-3.html',
  styleUrl: './create-task-stage-3.css'
})
export class CreateTaskStage3 implements OnInit, OnDestroy {
  @Output() stageChange = new EventEmitter<number>();
  
  taskData: Partial<TaskCreationData> | null = null;
  private subscription: Subscription = new Subscription();
  
  // Account selection properties
  selectionMode: 'manual' | 'count' = 'count';
  availableAccounts: Account[] = [];
  selectedAccounts: string[] = [];
  accountCount: number = 1;
  isLoadingAccounts = false;
  showTaskPreview = false;
  isCreatingTask = false;

  private static readonly PERMITTED_ACCOUNT_STATUS = 'ACTIVE';

  constructor(
    private taskCreationService: TaskCreationService,
    private accountsService: AccountsService,
    private tasksService: TasksService,
    private postsService: PostsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.taskCreationService.taskData$.subscribe(data => {
        this.taskData = data;
        // Initialize selected accounts from existing data
        if (data.accounts) {
          this.selectedAccounts = [...data.accounts];
        }
      })
    );
    
    this.loadAccounts();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadAccounts() {
    this.isLoadingAccounts = true;
    this.subscription.add(
      this.accountsService.getAccounts().subscribe({
        next: (accounts) => {
          // Frontend-only restriction: only ACTIVE accounts are permitted for new task creation.
          this.availableAccounts = (accounts || []).filter(
            (account) => account.status === CreateTaskStage3.PERMITTED_ACCOUNT_STATUS
          );

          // Prune any previously selected accounts that are not permitted.
          const permittedPhoneNumbers = new Set(
            this.availableAccounts.map((account) => account.phone_number)
          );
          const prunedSelected = this.selectedAccounts.filter((phone) => permittedPhoneNumbers.has(phone));
          if (prunedSelected.length !== this.selectedAccounts.length) {
            this.selectedAccounts = prunedSelected;
            this.updateTaskAccounts();
          }

          if (this.accountCount > this.availableAccounts.length) {
            this.accountCount = this.availableAccounts.length;
          }
          this.isLoadingAccounts = false;
        },
        error: (error) => {
          console.error('Error loading accounts:', error);
          this.isLoadingAccounts = false;
        }
      })
    );
  }

  onSelectionModeChange() {
    this.selectedAccounts = [];
    this.updateTaskAccounts();
  }

  onAccountToggle(phoneNumber: string) {
    const index = this.selectedAccounts.indexOf(phoneNumber);
    if (index > -1) {
      this.selectedAccounts.splice(index, 1);
    } else {
      this.selectedAccounts.push(phoneNumber);
    }
    this.updateTaskAccounts();
  }

  isAccountSelected(phoneNumber: string): boolean {
    return this.selectedAccounts.includes(phoneNumber);
  }

  onAccountCountChange() {
    if (this.selectionMode === 'count') {
      this.selectRandomAccounts();
    }
  }

  selectRandomAccounts() {
    if (this.accountCount > this.availableAccounts.length) {
      this.accountCount = this.availableAccounts.length;
    }
    
    const shuffled = [...this.availableAccounts].sort(() => 0.5 - Math.random());
    this.selectedAccounts = shuffled
      .slice(0, this.accountCount)
      .map(account => account.phone_number); // Use phone_number instead of account_id
    
    this.updateTaskAccounts();
  }

  refreshRandomSelection() {
    if (this.selectionMode === 'count' && this.availableAccounts.length > 0) {
      this.selectRandomAccounts();
    }
  }

  updateTaskAccounts() {
    this.taskCreationService.updateTaskData({
      accounts: this.selectedAccounts
    });
  }

  goToPrevious() {
    this.taskCreationService.setCurrentStage(2);
    this.stageChange.emit(2);
  }

  toggleTaskPreview() {
    this.showTaskPreview = !this.showTaskPreview;
  }

  createTask() {
    if (!this.canCreateTask || this.isCreatingTask) {
      return;
    }

    // Safety check: ensure only permitted (ACTIVE) accounts are submitted.
    const permittedPhoneNumbers = new Set(
      this.availableAccounts.map((account) => account.phone_number)
    );
    const prunedSelected = this.selectedAccounts.filter((phone) => permittedPhoneNumbers.has(phone));
    if (prunedSelected.length !== this.selectedAccounts.length) {
      this.selectedAccounts = prunedSelected;
      this.updateTaskAccounts();
      if (this.selectedAccounts.length === 0) {
        alert('Only ACTIVE accounts can be used to create a task. Please select at least one ACTIVE account.');
        return;
      }
    }

    this.isCreatingTask = true;
    
    // Process posts to get proper post_ids
    this.processPostsAndCreateTask();
  }

  private processPostsAndCreateTask() {
    if (!this.taskData?.local_posts || this.taskData.local_posts.length === 0) {
      alert('No posts selected. Please go back and add posts.');
      this.isCreatingTask = false;
      return;
    }

    // Separate existing and new posts
    const existingPosts = this.taskData.local_posts.filter(post => post.isExisting && post.existingData);
    const newPosts = this.taskData.local_posts.filter(post => !post.isExisting);

    // Get IDs from existing posts
    const existingPostIds = existingPosts.map(post => post.existingData!.post_id!);

    if (newPosts.length === 0) {
      // Only existing posts, proceed with task creation
      this.submitTask(existingPostIds);
    } else {
      // Need to create new posts first
      const postsToCreate = newPosts.map(post => ({
        message_link: post.message_link
      }));

      this.postsService.bulkCreatePosts(postsToCreate).subscribe({
        next: (response) => {
          console.log('Posts created:', response);
          
          // Extract new post IDs from response
          let newPostIds: number[] = [];
          if (response && response.results && Array.isArray(response.results)) {
            newPostIds = response.results
              .filter((r: any) => r.status === 'success' && r.post_id)
              .map((r: any) => r.post_id);
          }
          
          // Combine existing and new post IDs
          const allPostIds = [...existingPostIds, ...newPostIds];
          this.submitTask(allPostIds);
        },
        error: (error) => {
          console.error('Error creating posts:', error);
          this.isCreatingTask = false;
          alert(`Failed to create posts: ${error.error?.detail || error.message || 'Unknown error'}`);
        }
      });
    }
  }

  private submitTask(postIds: number[]) {
    // Prepare task data in correct API format
    const taskPayload = {
      name: this.taskData!.name!,
      description: this.taskData!.description || undefined,
      post_ids: postIds,
      accounts: this.selectedAccounts, // Already phone numbers
      action: this.taskData!.action!
    };
    
    console.log('Submitting task with correct format:', taskPayload);
    
    this.tasksService.createTask(taskPayload).subscribe({
      next: (response) => {
        console.log('Task created successfully:', response);
        this.isCreatingTask = false;
        
        // Reset task creation data
        this.taskCreationService.resetTaskData();
        
        // Show success message
        alert(`Task "${taskPayload.name}" created successfully with ID: ${response.task_id}`);
        
        // Navigate back to tasks list
        this.router.navigate(['/tasks']);
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.isCreatingTask = false;
        
        // Enhanced error handling
        let errorMessage = 'An unexpected error occurred';
        if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.error('Full error object:', error);
        alert(`Failed to create task: ${errorMessage}`);
      }
    });
  }

  onStageChange(stage: number) {
    this.stageChange.emit(stage);
  }

  get canCreateTask(): boolean {
    return !this.isCreatingTask &&
           this.selectedAccounts.length > 0 && 
           !!this.taskData?.name && 
           !!this.taskData?.action &&
           !!this.taskData?.local_posts && 
           this.taskData.local_posts.length > 0;
  }
}
