import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Channel {
  chat_id: number;
  channel_name: string;
  is_private: boolean;
  has_enabled_reactions: boolean;
  reactions_only_for_subscribers: boolean;
  discussion_chat_id?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ChannelWithPostCount extends Channel {
  post_count: number;
}

export interface ChannelStats {
  total_channels: number;
  private_channels: number;
  public_channels: number;
  channels_with_reactions: number;
  tag_distribution: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class ChannelsService {
  private apiUrl = `${environment.apiUrl}/channels`;

  constructor(private http: HttpClient) {}

  /**
   * Get all channels with optional filtering
   */
  getChannels(filters?: { chat_id?: number; tag?: string; name?: string }): Observable<Channel[]> {
    let params: any = {};
    if (filters?.chat_id) params['chat_id'] = filters.chat_id;
    if (filters?.tag) params['tag'] = filters.tag;
    if (filters?.name) params['name'] = filters.name;

    return this.http.get<Channel[]>(this.apiUrl, { params });
  }

  /**
   * Get a specific channel by chat ID
   */
  getChannelById(chatId: number): Observable<Channel> {
    return this.http.get<Channel>(`${this.apiUrl}/${chatId}`);
  }

  /**
   * Create a new channel
   */
  createChannel(data: Omit<Channel, 'created_at' | 'updated_at'>): Observable<any> {
    const params: any = {
      chat_id: data.chat_id,
      channel_name: data.channel_name,
      is_private: data.is_private.toString(),
      has_enabled_reactions: data.has_enabled_reactions.toString(),
      reactions_only_for_subscribers: data.reactions_only_for_subscribers.toString()
    };

    if (data.discussion_chat_id) params['discussion_chat_id'] = data.discussion_chat_id;
    if (data.tags && data.tags.length > 0) params['tags'] = data.tags.join(',');

    return this.http.post(this.apiUrl, null, { params });
  }

  /**
   * Update an existing channel
   */
  updateChannel(chatId: number, data: Partial<Omit<Channel, 'created_at' | 'updated_at'>>): Observable<any> {
    const params: any = {};

    if (data.channel_name) params['channel_name'] = data.channel_name;
    if (data.is_private !== undefined) params['is_private'] = data.is_private.toString();
    if (data.has_enabled_reactions !== undefined) params['has_enabled_reactions'] = data.has_enabled_reactions.toString();
    if (data.reactions_only_for_subscribers !== undefined) params['reactions_only_for_subscribers'] = data.reactions_only_for_subscribers.toString();
    if (data.discussion_chat_id !== undefined) params['discussion_chat_id'] = data.discussion_chat_id;
    if (data.tags) params['tags'] = data.tags.join(',');

    return this.http.put(`${this.apiUrl}/${chatId}`, null, { params });
  }

  /**
   * Delete a channel
   */
  deleteChannel(chatId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${chatId}`);
  }

  /**
   * Get channel statistics
   */
  getChannelStats(): Observable<ChannelStats> {
    return this.http.get<ChannelStats>(`${this.apiUrl}/stats/summary`);
  }

  /**
   * Get all channels with their post counts
   */
  getChannelsWithPostCounts(): Observable<ChannelWithPostCount[]> {
    return this.http.get<ChannelWithPostCount[]>(`${this.apiUrl}/with-post-counts`);
  }
}
