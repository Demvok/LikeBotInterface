import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from './api.models';

@Injectable({
  providedIn: 'root'
})


export class PostsService {

  private apiUrl = 'http://localhost:8080/posts';

  constructor(private http: HttpClient) {}


  /**
   * Get all posts with optional filtering
   */
  getPosts(params?: { post_id?: number; chat_id?: number; validated_only?: boolean }): Observable<Post[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.post_id !== undefined) httpParams = httpParams.set('post_id', params.post_id);
      if (params.chat_id !== undefined) httpParams = httpParams.set('chat_id', params.chat_id);
      if (params.validated_only !== undefined) httpParams = httpParams.set('validated_only', String(params.validated_only));
    }
    return this.http.get<Post[]>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get a specific post by ID
   */
  getPost(post_id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${post_id}`);
  }

  /**
   * Create a new post
   */
  createPost(post: Partial<Post>): Observable<{ message: string; post_id: number }> {
    return this.http.post<{ message: string; post_id: number }>(this.apiUrl, post);
  }

  /**
   * Update an existing post
   */
  updatePost(post_id: number, post: Partial<Post>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${post_id}`, post);
  }

  /**
   * Delete a post
   */
  deletePost(post_id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${post_id}`);
  }

  /**
   * Bulk create posts
   */
  bulkCreatePosts(posts: Partial<Post>[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, posts);
  }

  /**
   * Bulk delete posts
   */
  bulkDeletePosts(post_ids: number[]): Observable<any> {
    return this.http.request<any>('delete', `${this.apiUrl}/bulk`, { body: post_ids });
  }

  /**
   * Validate a post by ID
   */
  validatePost(post_id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${post_id}/validate`, {});
  }

}
