import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStepper } from '../task-stepper/task-stepper';
import { TaskCreationService, TaskCreationData, LocalPost } from '../../../../services/task-creation.service';
import { PostsService } from '../../../../services/posts';
import { Post } from '../../../../services/api.models';
import { Subscription, forkJoin, of } from 'rxjs';
import { finalize, map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-create-task-stage-2',
  imports: [CommonModule, TaskStepper, FormsModule],
  templateUrl: './create-task-stage-2.html',
  styleUrl: './create-task-stage-2.css'
})
export class CreateTaskStage2 implements OnInit, OnDestroy {
  @Output() stageChange = new EventEmitter<number>();
  
  taskData: Partial<TaskCreationData> | null = null;
  selectedPosts: LocalPost[] = []; // Changed to LocalPost array
  singlePostUrl: string = '';
  bulkPostUrls: string = '';
  isProcessing: boolean = false;
  errorMessages: string[] = [];
  isBulkMode: boolean = false;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private taskCreationService: TaskCreationService,
    private postsService: PostsService
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.taskCreationService.taskData$.subscribe(data => {
        this.taskData = data;
        
        // Load stored local posts first
        const storedLocalPosts = this.taskCreationService.getLocalPosts();
        if (storedLocalPosts.length > 0) {
          this.selectedPosts = storedLocalPosts;
        }
        // If there are existing post_ids but no local posts, load them from API
        else if (data.post_ids && data.post_ids.length > 0) {
          this.loadExistingPosts(data.post_ids);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadExistingPosts(postIds: number[]) {
    this.isProcessing = true;
    this.postsService.getPostsByIds(postIds).subscribe({
      next: (posts) => {
        // Convert existing posts to LocalPost format
        this.selectedPosts = posts.map(post => ({
          message_link: post.message_link,
          tempId: this.generateTempId(),
          isExisting: true,
          existingData: post
        }));
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error loading existing posts:', error);
        this.addError('Failed to load existing posts');
        this.isProcessing = false;
      }
    });
  }

  addSinglePost() {
    const url = this.singlePostUrl.trim();
    if (!url) return;

    if (!this.isValidTelegramUrl(url)) {
      this.addError('Invalid Telegram URL format');
      return;
    }

    // Check if URL is already in the list
    if (this.selectedPosts.some(post => post.message_link === url)) {
      this.addError('This post URL is already in the list');
      return;
    }

    this.addPostToList(url);
    this.singlePostUrl = '';
  }

  addBulkPosts() {
    const urls = this.bulkPostUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) return;

    const invalidUrls = urls.filter(url => !this.isValidTelegramUrl(url));
    if (invalidUrls.length > 0) {
      this.addError(`Invalid URLs: ${invalidUrls.join(', ')}`);
      return;
    }

    // Filter out URLs that are already in the list
    const existingUrls = urls.filter(url => 
      this.selectedPosts.some(post => post.message_link === url)
    );
    
    if (existingUrls.length > 0) {
      this.addError(`These URLs are already in the list: ${existingUrls.join(', ')}`);
    }

    const newUrls = urls.filter(url => 
      !this.selectedPosts.some(post => post.message_link === url)
    );

    this.addPostsToList(newUrls);
    this.bulkPostUrls = '';
  }

  private addPostToList(url: string) {
    this.isProcessing = true;
    
    // Create local post entry
    const localPost: LocalPost = {
      message_link: url,
      tempId: this.generateTempId(),
      isExisting: false
    };

    // Check if post already exists in database
    this.checkPostExists(url).subscribe({
      next: (existingPost) => {
        if (existingPost) {
          localPost.isExisting = true;
          localPost.existingData = existingPost;
        }
        this.selectedPosts.push(localPost);
        this.updateTaskData();
        this.isProcessing = false;
      },
      error: (error) => {
        // If checking fails, still add the post as new
        console.warn('Failed to check if post exists:', error);
        this.selectedPosts.push(localPost);
        this.updateTaskData();
        this.isProcessing = false;
      }
    });
  }

  private addPostsToList(urls: string[]) {
    if (urls.length === 0) return;
    
    this.isProcessing = true;
    
    // Create local post entries
    const localPosts: LocalPost[] = urls.map(url => ({
      message_link: url,
      tempId: this.generateTempId(),
      isExisting: false
    }));

    // Check existence for all posts
    const checkRequests = localPosts.map(localPost => 
      this.checkPostExists(localPost.message_link)
    );

    forkJoin(checkRequests).pipe(
      finalize(() => this.isProcessing = false)
    ).subscribe({
      next: (existingPosts) => {
        // Update local posts with existing data
        localPosts.forEach((localPost, index) => {
          const existingPost = existingPosts[index];
          if (existingPost) {
            localPost.isExisting = true;
            localPost.existingData = existingPost;
          }
        });
        
        this.selectedPosts.push(...localPosts);
        this.updateTaskData();
      },
      error: (error) => {
        // If checking fails, still add the posts as new
        console.warn('Failed to check if posts exist:', error);
        this.selectedPosts.push(...localPosts);
        this.updateTaskData();
      }
    });
  }

  private checkPostExists(messageLink: string) {
    // Get all posts and check if any matches the message_link
    return this.postsService.getPosts().pipe(
      map((posts: Post[]) => {
        const existingPost = posts.find(post => post.message_link === messageLink);
        return existingPost || null;
      }),
      catchError((error) => {
        console.warn('Error checking post existence:', error);
        return of(null);
      })
    );
  }

  private generateTempId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  removePost(index: number) {
    this.selectedPosts.splice(index, 1);
    this.updateTaskData();
  }

  clearAllPosts() {
    this.selectedPosts = [];
    this.updateTaskData();
  }

  clearErrors() {
    this.errorMessages = [];
  }

  toggleMode() {
    this.isBulkMode = !this.isBulkMode;
    // Clear the input fields when switching modes
    this.singlePostUrl = '';
    this.bulkPostUrls = '';
  }

  private addError(message: string) {
    this.errorMessages.push(message);
  }

  private updateTaskData() {
    // Store the local posts in the service
    this.taskCreationService.updateLocalPosts(this.selectedPosts);
  }

  private isValidTelegramUrl(url: string): boolean {
    const telegramUrlPattern = /^https:\/\/t\.me\/[^\s]+$/;
    return telegramUrlPattern.test(url);
  }

  getPostStatusClass(post: LocalPost): string {
    if (post.isExisting && post.existingData) {
      return 'status-existing';
    }
    if (post.existingData?.chat_id && post.existingData?.message_id) {
      return 'status-validated';
    }
    return 'status-new';
  }

  getPostStatusText(post: LocalPost): string {
    if (post.isExisting && post.existingData) {
      return 'Already exists';
    }
    if (post.existingData?.chat_id && post.existingData?.message_id) {
      return 'Validated';
    }
    return 'New post';
  }

  getPostDisplayData(post: LocalPost) {
    if (post.isExisting && post.existingData) {
      return {
        id: post.existingData.post_id,
        link: post.existingData.message_link,
        chat_id: post.existingData.chat_id,
        message_id: post.existingData.message_id
      };
    }
    return {
      id: post.tempId,
      link: post.message_link,
      chat_id: null,
      message_id: null
    };
  }

  goToPrevious() {
    this.taskCreationService.setCurrentStage(1);
    this.stageChange.emit(1);
  }

  proceedToNext() {
    if (this.selectedPosts.length === 0) {
      this.addError('Please select at least one post before proceeding');
      return;
    }
    
    this.taskCreationService.setCurrentStage(3);
    this.stageChange.emit(3);
  }

  onStageChange(stage: number) {
    this.stageChange.emit(stage);
  }
}
