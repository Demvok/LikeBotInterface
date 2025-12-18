import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChannelsService, Channel, ChannelStats, ChannelSubscriberAccount, ChannelPostCountItem } from '../../services/channels';
import { AccountsService } from '../../services/accounts';
import { AuthService } from '../../services/auth.service';

type ChannelRow = Channel & { post_count?: number | null };

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
  channels = new MatTableDataSource<ChannelRow>([]);

  // Route-driven filter: show channels subscribed by an account
  subscribedPhoneFilter: string | null = null;
  private subscribedBaseRows: ChannelRow[] = [];

  displayedColumns: string[] = [
    'chat_id',
    'channel_name',
    'post_count',
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

  // KPIs (Stage 3)
  statsLoading: boolean = false;
  statsError: string = '';
  channelStats: ChannelStats | null = null;

  // Post counts (Stage 3)
  postCountsLoading: boolean = false;
  postCountsError: string = '';
  private postCountsByChatId = new Map<number, number>();

  // Channel subscribers (Stage 3)
  showSubscribersModal: boolean = false;
  subscribersLoading: boolean = false;
  subscribersError: string = '';
  subscribersChannel: Channel | null = null;
  subscriberAccounts: ChannelSubscriberAccount[] = [];

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

  constructor(
    private channelsService: ChannelsService,
    private accountsService: AccountsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const raw = params['subscribed_phone'];
      const normalized = typeof raw === 'string' ? raw.trim() : '';
      this.subscribedPhoneFilter = normalized || null;

      this.refreshAll();
    });
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

  refreshAll() {
    this.loadChannelStats();

    if (this.subscribedPhoneFilter) {
      this.loadSubscribedChannelsForAccount(this.subscribedPhoneFilter);
      return;
    }

    this.getChannels();
  }

  clearSubscribedFilter() {
    this.router.navigate(['/channels']);
  }

  private loadSubscribedChannelsForAccount(phone: string) {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.subscribedBaseRows = [];

    this.accountsService.getAccountSubscribedChannels(phone).subscribe({
      next: (subscribed) => {
        const subscribedIds = new Set<number>((Array.isArray(subscribed) ? subscribed : []).map((c) => c.chat_id));

        this.channelsService.getChannels().subscribe({
          next: (allChannels) => {
            const subset = (Array.isArray(allChannels) ? allChannels : []).filter((c) => subscribedIds.has(c.chat_id));
            const rows: ChannelRow[] = subset.map((c) => ({
              ...c,
              post_count: this.postCountsByChatId.get(c.chat_id) ?? null
            }));

            this.subscribedBaseRows = rows;
            this.channels = new MatTableDataSource<ChannelRow>(rows);
            this.assignTableFeatures();
            this.extractAvailableTags(subset);
            this.loading = false;

            // Merge counts after loading
            this.refreshPostCounts();
          },
          error: (error) => {
            console.error('Error loading channels:', error);
            this.errorMessage = error?.error?.detail || 'Failed to load channels';
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading account subscriptions:', error);
        this.errorMessage = error?.error?.detail || 'Failed to load subscribed channels for account';
        this.loading = false;
      }
    });
  }

  private loadChannelStats() {
    this.statsLoading = true;
    this.statsError = '';
    this.channelsService.getChannelStats().subscribe({
      next: (stats) => {
        this.channelStats = stats;
        this.statsLoading = false;
      },
      error: (error) => {
        console.error('Error loading channel stats:', error);
        this.statsError = error?.error?.detail || 'Failed to load channel stats';
        this.statsLoading = false;
      }
    });
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
        const rows: ChannelRow[] = (Array.isArray(data) ? data : []).map((c) => ({
          ...c,
          post_count: this.postCountsByChatId.get(c.chat_id) ?? null
        }));

        this.channels = new MatTableDataSource<ChannelRow>(rows);
        this.assignTableFeatures();
        this.extractAvailableTags(data);
        this.loading = false;

        // Post counts are fetched from a separate endpoint. Merge them in once loaded.
        this.refreshPostCounts();
      },
      error: (error) => {
        console.error('Error loading channels:', error);
        this.errorMessage = error?.error?.detail || 'Failed to load channels';
        this.loading = false;
      }
    });
  }

  private refreshPostCounts() {
    this.postCountsLoading = true;
    this.postCountsError = '';

    this.channelsService.getChannelsWithPostCounts().subscribe({
      next: (channelsWithCounts: ChannelPostCountItem[]) => {
        this.postCountsByChatId = new Map(
          (Array.isArray(channelsWithCounts) ? channelsWithCounts : []).map((c) => [c.chat_id, c.post_count])
        );

        const updated = (this.channels?.data ?? []).map((c) => ({
          ...c,
          post_count: this.postCountsByChatId.get(c.chat_id) ?? null
        }));

        this.channels.data = updated;
        this.assignTableFeatures();
        this.cdr.detectChanges();
        this.postCountsLoading = false;
      },
      error: (error) => {
        console.error('Error loading channel post counts:', error);
        this.postCountsError = error?.error?.detail || 'Failed to load post counts';
        this.postCountsLoading = false;
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
    if (this.subscribedPhoneFilter) {
      this.applyLocalFilters();
      return;
    }

    this.getChannels();
  }

  clearFilters() {
    this.searchChannelName = '';
    this.selectedTag = '';

    if (this.subscribedPhoneFilter) {
      this.channels.data = this.subscribedBaseRows.slice();
      this.assignTableFeatures();
      return;
    }

    this.getChannels();
  }

  private applyLocalFilters() {
    const name = this.searchChannelName.trim().toLowerCase();
    const tag = this.selectedTag.trim();

    const filtered = this.subscribedBaseRows.filter((c) => {
      const matchesName = !name || (c.channel_name || '').toLowerCase().includes(name);
      const matchesTag = !tag || (Array.isArray(c.tags) && c.tags.includes(tag));
      return matchesName && matchesTag;
    });

    this.channels.data = filtered;
    this.assignTableFeatures();
    this.cdr.detectChanges();
  }

  openSubscribersModal(channel: Channel) {
    this.subscribersChannel = channel;
    this.subscriberAccounts = [];
    this.subscribersError = '';
    this.subscribersLoading = true;
    this.showSubscribersModal = true;

    this.channelsService.getChannelSubscribers(channel.chat_id).subscribe({
      next: (accounts) => {
        this.subscriberAccounts = Array.isArray(accounts) ? accounts : [];
        this.subscribersLoading = false;
      },
      error: (error) => {
        console.error('Error loading channel subscribers:', error);
        this.subscribersError = error?.error?.detail || 'Failed to load subscribers';
        this.subscribersLoading = false;
      }
    });
  }

  closeSubscribersModal() {
    this.showSubscribersModal = false;
    this.subscribersLoading = false;
    this.subscribersError = '';
    this.subscribersChannel = null;
    this.subscriberAccounts = [];
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
    this.openSubscribersModal(channel);
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
