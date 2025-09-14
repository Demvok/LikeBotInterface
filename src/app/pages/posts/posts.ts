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

  constructor(private postsService: PostsService) {}

  ngOnInit() {
    this.getPosts();
  }

  getPosts() {
    this.loading = true;
    this.postsService.getPosts(this.filter).subscribe(
      (data: Post[]) => {
        this.posts = data;
        this.loading = false;
      },
      (error: any) => {
        console.error('Error fetching posts:', error);
        this.posts = [];
        this.loading = false;
      }
    );
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
