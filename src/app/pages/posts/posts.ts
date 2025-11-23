import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { PostsService } from '../../services/posts';
import { Post } from '../../services/api.models';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { EditPostModalComponent, EditPostDialogResult } from './edit-post-modal/edit-post-modal.component';


@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule, MatCheckboxModule],
  templateUrl: './posts.html',
  styleUrls: ['./posts.css']
})



export class Posts {
  posts = new MatTableDataSource<Post>([]);
  selection = new SelectionModel<Post>(true, []);

  displayedColumns: string[] = [
    'select',
    'post_id',
    'is_validated',
    'message_link',
    'chat_id',
    'message_id',
    'created_at',
    'updated_at',
    'actions'
  ];

  loading: boolean = true;
  filter: { post_id?: number; chat_id?: number; validated_only?: boolean } = {};

  lastUpdate: string = '';

  constructor(private postsService: PostsService, private dialog: MatDialog, private route: ActivatedRoute) {}

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
    // Read query parameters
    this.route.queryParams.subscribe((params) => {
      this.filter = {};
      if (params['channel_id']) {
        this.filter.chat_id = parseInt(params['channel_id'], 10);
      }
      if (params['post_id']) {
        this.filter.post_id = parseInt(params['post_id'], 10);
      }
      if (params['validated_only']) {
        this.filter.validated_only = params['validated_only'] === 'true';
      }
      this.getPosts();
      this.lastUpdate = this.formatDate(new Date());
    });
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
    this.selection.clear(); // Clear selection when refreshing posts
    this.postsService.getPosts(this.filter).subscribe(
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
  }

  formatDate(date: Date): string {
    // Format as 'HH:mm:ss dd.MM.yyyy'
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }

  resetFilters() {
    this.filter = {};
    this.getPosts();
  }

  validatePost(post: Post) {
    if (!post.post_id) return;
    this.postsService.validatePost(post.post_id).subscribe(
      (res) => {
        this.getPosts();
      },
      (err) => {
        alert('Failed to validate post.');
      }
    );
  }

  editPost(post: Post) {
    const dialogRef = this.dialog.open(EditPostModalComponent, {
      width: '600px',
      data: { post: post }
    });

    dialogRef.afterClosed().subscribe((result: EditPostDialogResult) => {
      if (result && result.post) {
        this.updatePost(result.post);
      }
    });
  }

  private updatePost(post: Post) {
    if (!post.post_id) return;
    
    this.postsService.updatePost(post.post_id, post).subscribe(
      (response) => {
        console.log('Post updated successfully:', response);
        this.getPosts(); // Refresh the posts list
      },
      (error) => {
        console.error('Error updating post:', error);
        alert('Failed to update post. Please try again.');
      }
    );
  }

  deletePost(post: Post) {
    if (!post.post_id) return;
    if (!confirm('Delete this post?')) return;
    this.postsService.deletePost(post.post_id).subscribe(
      (res) => {
        this.getPosts();
      },
      (err) => {
        alert('Failed to delete post.');
      }
    );
  }

  // Selection management methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.posts.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.posts.data.forEach(row => this.selection.select(row));
    }
  }

  getSelectedCount(): number {
    return this.selection.selected.length;
  }

  hasSelection(): boolean {
    return this.selection.selected.length > 0;
  }

  clearSelection() {
    this.selection.clear();
  }

  checkboxLabel(row?: Post): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.post_id}`;
  }

  // Bulk operations
  bulkDeletePosts() {
    const selectedPosts = this.selection.selected;
    if (selectedPosts.length === 0) {
      alert('No posts selected for deletion.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedPosts.length} selected post(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    const postIds = selectedPosts
      .map(post => post.post_id)
      .filter(id => id !== undefined) as number[];

    if (postIds.length === 0) {
      alert('No valid post IDs found for deletion.');
      return;
    }

    this.loading = true;
    this.postsService.bulkDeletePosts(postIds).subscribe(
      (response) => {
        console.log('Bulk delete successful:', response);
        this.selection.clear();
        this.getPosts();
      },
      (error) => {
        console.error('Error during bulk delete:', error);
        alert('Failed to delete some or all selected posts. Please try again.');
        this.loading = false;
      }
    );
  }
}
