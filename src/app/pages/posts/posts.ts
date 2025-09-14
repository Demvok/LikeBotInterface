import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostsService } from '../../services/posts';
import { Post } from '../../services/api.models';


@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './posts.html',
  styleUrls: ['./posts.css']
})



export class Posts {
  posts: Post[] = [];
  loading: boolean = true;
  filter: { post_id?: number; chat_id?: number; validated_only?: boolean } = {};

  lastUpdate: string = '';

  constructor(private postsService: PostsService) {}

  ngOnInit() {
    this.getPosts();
  this.lastUpdate = this.formatDate(new Date());
  }

  getPosts() {
    this.loading = true;
    this.postsService.getPosts(this.filter).subscribe(
      (data: Post[]) => {
        this.posts = data;
        this.loading = false;
  this.lastUpdate = this.formatDate(new Date());
      },
      (error: any) => {
        console.error('Error fetching posts:', error);
        this.posts = [];
        this.loading = false;
  this.lastUpdate = this.formatDate(new Date());
      }
    );
  }
  formatDate(date: Date): string {
    // Format as 'dd.MM.yyyy HH:mm:ss'
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
    // Placeholder for edit logic (e.g., open modal)
    alert('Edit not implemented.');
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
}
