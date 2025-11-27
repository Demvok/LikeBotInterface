import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChannelsService, Channel } from '../../services/channels';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './channels.html',
  styleUrl: './channels.css'
})
export class Channels implements OnInit {
  channels = new MatTableDataSource<Channel>([]);

  displayedColumns: string[] = [
    'chat_id',
    'channel_name',
    'is_private',
    'has_enabled_reactions',
    'tags',
    'created_at',
    'actions'
  ];

  loading: boolean = true;

  // Modal states
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteConfirm: boolean = false;

  // Add/Edit modal data
  formData: Partial<Channel> = {
    channel_name: '',
    is_private: false,
    has_enabled_reactions: true,
    reactions_only_for_subscribers: false,
    tags: []
  };
  tagsInput: string = '';
  isEditing: boolean = false;
  editingChatId: number | undefined = undefined;

  // Delete confirmation
  deleteChannelId: number = 0;
  deleteChannelName: string = '';

  // Filters
  searchChannelName: string = '';
  selectedTag: string = '';
  availableTags: string[] = [];

  // Error message
  errorMessage: string = '';
  successMessage: string = '';

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

  constructor(private channelsService: ChannelsService, private cdr: ChangeDetectorRef, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.getChannels();
  }

  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator && this._sort && this.channels) {
      this.channels.paginator = this._paginator;
      this.channels.sort = this._sort;
    }
  }

  getChannels() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const filters: any = {};
    if (this.searchChannelName.trim()) {
      filters.name = this.searchChannelName.trim();
    }
    if (this.selectedTag.trim()) {
      filters.tag = this.selectedTag.trim();
    }

    this.channelsService.getChannels(filters).subscribe({
      next: (data) => {
        this.channels = new MatTableDataSource<Channel>(data);
        this.assignTableFeatures();
        this.extractAvailableTags(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading channels:', error);
        this.errorMessage = error?.error?.detail || 'Failed to load channels';
        this.loading = false;
      }
    });
  }

  private extractAvailableTags(channels: Channel[]) {
    const tags = new Set<string>();
    channels.forEach((channel) => {
      if (channel.tags && Array.isArray(channel.tags)) {
        channel.tags.forEach((tag) => tags.add(tag));
      }
    });
    this.availableTags = Array.from(tags).sort();
  }

  applyFilters() {
    this.getChannels();
  }

  clearFilters() {
    this.searchChannelName = '';
    this.selectedTag = '';
    this.getChannels();
  }

  // Add modal
  openAddModal() {
    this.isEditing = false;
    this.editingChatId = undefined;
    this.formData = {
      channel_name: '',
      is_private: false,
      has_enabled_reactions: true,
      reactions_only_for_subscribers: false,
      tags: []
    };
    this.tagsInput = '';
    this.errorMessage = '';
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  // Parse tags from input
  parseTagsInput() {
    this.formData.tags = this.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  saveChannel() {
    if (!this.formData.channel_name) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.parseTagsInput();

    if (this.isEditing) {
      if (!this.editingChatId) {
        this.errorMessage = 'Chat ID is required for update';
        return;
      }
      this.channelsService.updateChannel(this.editingChatId, this.formData).subscribe({
        next: () => {
          this.successMessage = `Channel updated successfully`;
          this.closeAddModal();
          this.getChannels();
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail || 'Failed to update channel';
        }
      });
    } else {
      this.channelsService.createChannel(this.formData as Channel).subscribe({
        next: () => {
          this.successMessage = `Channel created successfully`;
          this.closeAddModal();
          this.getChannels();
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail || 'Failed to create channel';
        }
      });
    }
  }

  // Edit modal
  openEditModal(channel: Channel) {
    this.isEditing = true;
    this.editingChatId = channel.chat_id;
    this.formData = { ...channel };
    this.tagsInput = channel.tags ? channel.tags.join(', ') : '';
    this.errorMessage = '';
    this.showAddModal = true;
  }

  // Delete modal
  openDeleteConfirm(channel: Channel) {
    this.deleteChannelId = channel.chat_id;
    this.deleteChannelName = channel.channel_name;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
  }

  confirmDelete() {
    this.channelsService.deleteChannel(this.deleteChannelId).subscribe({
      next: () => {
        this.successMessage = `Channel "${this.deleteChannelName}" deleted successfully`;
        this.closeDeleteConfirm();
        this.getChannels();
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail || 'Failed to delete channel';
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA');
  }

  formatTags(tags: string[] | undefined): string {
    return tags && tags.length > 0 ? tags.join(', ') : '-';
  }

  viewChannelPosts(channel: Channel) {
    this.router.navigate(['/posts'], { queryParams: { channel_id: channel.chat_id } });
  }

  viewChannelSubscribers(channel: Channel) {
    this.router.navigate(['/accounts'], { queryParams: { channel_id: channel.chat_id } });
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
