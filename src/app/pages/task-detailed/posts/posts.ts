import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { PostsService } from '../../../services/posts';
import { TasksService } from '../../../services/tasks';
import { AuthService } from '../../../services/auth.service';
import { Post, Task } from '../../../services/api.models';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule],
  templateUrl: './posts.html',
  styleUrls: ['./posts.css']
})
export class Posts implements OnInit, OnDestroy {
  posts = new MatTableDataSource<Post>([]);

  displayedColumns: string[] = [
    'post_id',
    'message_link',
    'chat_id',
    'message_id',
    'created_at',
    'updated_at',
    'actions'
  ];

  loading: boolean = true;
  filter: { post_id?: number; chat_id?: number } = {};
  taskId: string = '';
  task: Task | null = null;

  lastUpdate: string = '';

  private subscriptions = new Subscription();

  constructor(
    private postsService: PostsService,
    private tasksService: TasksService,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  private _paginator!: MatPaginator;
  private _sort!: MatSort;

  @ViewChild(MatPaginator)
  set paginator(paginator: MatPaginator) {
    this._paginator = paginator;
    this.assignTableFeatures();
  }

  @ViewChild(MatSort)
  set sort(sort: MatSort) {
    this._sort = sort;
    this.assignTableFeatures();
  }

  ngOnInit() {
    // Get task ID from route
    this.subscriptions.add(
      this.route.params.subscribe(params => {
        this.taskId = params['id'];
        this.getPosts();
      })
    );
    this.lastUpdate = this.formatDate(new Date());
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator && this._sort && this.posts) {
      this.posts.paginator = this._paginator;
      this.posts.sort = this._sort;
    }
  }

  getPosts() {
    this.loading = true;
    
    if (!this.taskId) {
      // If no task ID, get all posts with current filters
      const postsSub = this.postsService.getPosts(this.filter).subscribe(
        (data: Post[]) => {
          // Sort posts by updated_at descending (most recent first)
          const sortedData = data.sort((a, b) => {
            const dateA = a.updated_at ? new Date(a.updated_at) : new Date(0);
            const dateB = b.updated_at ? new Date(b.updated_at) : new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
          this.posts.data = sortedData;
          this.assignTableFeatures();
          if (this._paginator) {
            this._paginator.firstPage();
          }
          this.loading = false;
          this.lastUpdate = this.formatDate(new Date());
        },
        (error: any) => {
          console.error('Error fetching posts:', error);
          this.posts.data = [];
          this.assignTableFeatures();
          this.loading = false;
          this.lastUpdate = this.formatDate(new Date());
        }
      );
      this.subscriptions.add(postsSub);
      return;
    }

    // Get task first, then fetch only the posts for that task
    const taskSub = this.tasksService.getTask(Number(this.taskId)).pipe(
      switchMap((task: Task) => {
        this.task = task;
        if (!task.post_ids || task.post_ids.length === 0) {
          return of([]);
        }
        // Get posts by IDs from the task
        return this.postsService.getPostsByIds(task.post_ids);
      }),
      catchError((error: any) => {
        console.error('Error fetching task or posts:', error);
        return of([]);
      })
    ).subscribe(
      (data: Post[]) => {
        // Apply any additional filters if needed
        let filteredData = data;
        
        if (this.filter.post_id !== undefined) {
          filteredData = filteredData.filter(post => post.post_id === this.filter.post_id);
        }
        
        if (this.filter.chat_id !== undefined) {
          filteredData = filteredData.filter(post => post.chat_id === this.filter.chat_id);
        }
        
        // validation filter removed (not needed on this page)
        
        // Sort posts by updated_at descending (most recent first)
        const sortedData = filteredData.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at) : new Date(0);
          const dateB = b.updated_at ? new Date(b.updated_at) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        this.posts.data = sortedData;
        this.assignTableFeatures();
        if (this._paginator) {
          this._paginator.firstPage();
        }
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      },
      (error: any) => {
        console.error('Error processing posts:', error);
        this.posts.data = [];
        this.assignTableFeatures();
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      }
    );
    
    this.subscriptions.add(taskSub);
  }

  formatDate(date: Date): string {
    // Format as 'HH:mm:ss dd.MM.yyyy'
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }

  resetFilters() {
    this.filter = {}; // Reset all filters
    this.getPosts();
  }

  // validatePost removed — validation UI/flow not required on this page

  editPost(post: Post) {
    // Placeholder for edit logic (e.g., open modal)
    alert('Edit not implemented.');
  }

  deletePost(post: Post) {
    if (!post.post_id) return;
    if (!confirm('Delete this post?')) return;
    const deleteSub = this.postsService.deletePost(post.post_id).subscribe(
      (res) => {
        console.log('Post deleted successfully:', res);
        this.getPosts();
      },
      (err) => {
        console.error('Failed to delete post:', err);
        alert('Failed to delete post: ' + (err.error?.detail || err.message || 'Unknown error'));
      }
    );
    
    this.subscriptions.add(deleteSub);
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'admin';
  }

  // Check if current user is guest
  isGuest(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'guest';
  }
}
