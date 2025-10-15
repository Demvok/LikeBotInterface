import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Post } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})


export class PostsService {

  private apiUrl = `${environment.apiUrl}/posts`;

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
    return this.http.get<Post[]>(this.apiUrl, { params: httpParams }).pipe(
      catchError((error) => {
        console.error('Error fetching posts:', error);
        // Return empty array on error instead of throwing
        return of([]);
      })
    );
  }

  /**
   * Get a specific post by ID
   */
  getPost(post_id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${post_id}`);
  }

  /**
   * Get posts by array of IDs
   */
  getPostsByIds(post_ids: number[]): Observable<Post[]> {
    if (post_ids.length === 0) {
      return of([]);
    }
    
    // Make individual requests for each post and combine them
    // Handle individual failures gracefully - skip posts that can't be loaded
    const requests = post_ids.map(id => 
      this.getPost(id).pipe(
        catchError((error) => {
          console.warn(`Failed to load post ${id}:`, error);
          return of(null); // Return null for failed requests
        })
      )
    );
    
    return forkJoin(requests).pipe(
      map(posts => {
        const filteredPosts = posts.filter(post => post !== null) as Post[];
        // Sort posts by updated_at descending (most recent first)
        return filteredPosts.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at) : new Date(0);
          const dateB = b.updated_at ? new Date(b.updated_at) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      })
    );
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
