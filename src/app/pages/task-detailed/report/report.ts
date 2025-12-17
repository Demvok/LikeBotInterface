import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskReport, ReportEvent, Run } from '../../../services/api.models';
import { ReportService } from '../../../services/report.service';
import { TasksService } from '../../../services/tasks';
import { FormsModule } from '@angular/forms';

interface FilterOptions {
  client: string;
}

type ReportType = 'success' | 'errors' | 'all';

interface ReportStats {
  errorCount: number;
}

@Component({
  selector: 'app-report',
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './report.html',
  styleUrl: './report.css'
})
export class Report implements OnInit {
  private route = inject(ActivatedRoute);
  private reportService = inject(ReportService);
  private tasksService = inject(TasksService);
  private datePipe = inject(DatePipe);

  taskId: number = 0;
  reportData: TaskReport | null = null;
  filteredEvents: ReportEvent[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Runs management
  availableRuns: Run[] = [];
  selectedRunId: string | null = null;
  isLoadingRuns = false;
  
  // Report type (default to success)
  reportType: ReportType = 'success';
  
  filters: FilterOptions = {
    client: ''
  };

  stats: ReportStats = {
    errorCount: 0
  };

  uniqueClients: string[] = [];
  currentPage = 1;
  eventsPerPage = 10;
  sortBy: 'datetime' | 'client' | 'palette' = 'datetime';
  sortDirection: 'asc' | 'desc' = 'desc';
  Math = Math;

  // KPI values for header display
  kpis: {
    totalEvents: number;
    totalEventsAll: number;
    errorCount: number;
    successRate: number; // percent
  } = {
    totalEvents: 0,
    totalEventsAll: 0,
    errorCount: 0,
    successRate: 0
  };

  // Modal
  selectedMessage: ReportEvent | null = null;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.taskId = +params['id'];
      this.loadAvailableRuns();
    });
  }

  async loadAvailableRuns() {
    this.isLoadingRuns = true;
    try {
      const response = await this.tasksService.getTaskRuns(this.taskId).toPromise();
      if (response && response.runs) {
        this.availableRuns = response.runs.sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        
        // Select the latest run by default
        if (this.availableRuns.length > 0) {
          this.selectedRunId = this.availableRuns[0].run_id;
          await this.loadReportData();
        }
      }
    } catch (err: any) {
      this.error = err.error?.detail || 'Failed to load available runs';
    } finally {
      this.isLoadingRuns = false;
    }
  }

  async loadReportData() {
    if (!this.selectedRunId) {
      this.error = 'No run selected';
      return;
    }

    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await this.reportService.getTaskReport(
        this.taskId, 
        this.reportType, 
        this.selectedRunId
      ).toPromise();
      this.reportData = response || null;
      this.processReportData();
    } catch (err: any) {
      this.error = err.error?.detail || 'Failed to load report data';
    } finally {
      this.isLoading = false;
    }
  }

  onRunChange() {
    if (this.selectedRunId) {
      this.loadReportData();
    }
  }

  onReportTypeChange() {
    if (this.selectedRunId) {
      this.loadReportData();
    }
  }

  processReportData() {
    if (!this.reportData) return;

    // Extract clients first, then apply filters to compute KPIs on the filtered set
    this.extractUniqueClients();
    this.applyFilters();
    this.calculateStats();
    this.sortEvents();
  }

  calculateStats() {
    // Calculate KPIs based on the currently filtered events
    const events = this.filteredEvents || [];
    const total = events.length;
    const errorCount = events.filter((e: any) => e.error !== null && e.error !== undefined).length;
    const successCount = total - errorCount;

    // total events in the raw report (unfiltered)
    const totalAll = this.reportData?.report?.events?.length ?? 0;

    this.stats.errorCount = errorCount;
    this.kpis = {
      totalEvents: total,
      totalEventsAll: totalAll,
      errorCount,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0
    };
  }

  extractUniqueClients() {
    if (!this.reportData) return;
    const clientEvents = this.reportData.report.events.filter((e: any) => e.client);
    this.uniqueClients = [...new Set(clientEvents.map((e: any) => e.client))].sort();
  }

  applyFilters() {
    if (!this.reportData) return;

    this.filteredEvents = this.reportData.report.events.filter((event: any) => {
      if (this.filters.client && event.client && !event.client.includes(this.filters.client)) return false;
      return true;
    });

    this.currentPage = 1;
  }

  sortEvents() {
    this.filteredEvents.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'datetime':
          // Handle both datetime and ts fields
          aValue = a.datetime || a.ts;
          bValue = b.datetime || b.ts;
          // Convert to timestamps for comparison
          if (aValue) aValue = new Date(aValue).getTime();
          if (bValue) bValue = new Date(bValue).getTime();
          break;
        case 'client':
          aValue = a.client || '';
          bValue = b.client || '';
          break;
        case 'palette':
          aValue = a.palette || '';
          bValue = b.palette || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onFilterChange() {
    this.applyFilters();
    this.sortEvents();
  }

  onSort(field: 'datetime' | 'client' | 'palette') {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'desc';
    }
    this.sortEvents();
  }

  clearFilters() {
    this.filters = {
      client: ''
    };
    this.onFilterChange();
  }

  formatDate(timestamp: number | string | undefined): string {
    if (!timestamp) {
      return '';
    }
    
    let date: Date;
    
    if (typeof timestamp === 'string') {
      // Handle ISO string format from "all" report type
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Handle Unix timestamp from success/error reports
      date = new Date(timestamp);
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return this.datePipe.transform(date, 'MMM dd, yyyy HH:mm:ss') || '';
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Add null/undefined check
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return '';
    }
    
    // Remove any non-digit characters for processing
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length === 10) {
      // Format: (123) 456-7890
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // Format: +1 (123) 456-7890
      return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (phoneNumber.startsWith('+')) {
      // Keep original format if it starts with + and doesn't match above patterns
      return phoneNumber;
    }
    
    // Return original if format doesn't match expected patterns
    return phoneNumber;
  }

  getPaginatedEvents(): ReportEvent[] {
    const startIndex = (this.currentPage - 1) * this.eventsPerPage;
    const endIndex = startIndex + this.eventsPerPage;
    return this.filteredEvents.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredEvents.length / this.eventsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getVisiblePages(): number[] {
    const totalPages = this.getTotalPages();
    const visiblePages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      visiblePages.push(i);
    }
    
    return visiblePages;
  }

  // Update the trackBy function to use existing properties
  trackByEvent(index: number, event: ReportEvent): any {
    // Use a combination of timestamp and client to create a unique key
    const timestamp = event.datetime || event.ts;
    if (event && timestamp && event.client) {
      return `${timestamp}-${event.client}`;
    }
    // For "all" report logs without client, use timestamp and message
    if (timestamp && event.message) {
      return `${timestamp}-${event.message.substring(0, 20)}`;
    }
    // Fall back to index if we can't create a unique identifier
    return index;
  }

  // Modal methods
  openMessageModal(event: ReportEvent): void {
    this.selectedMessage = event;
  }

  closeMessageModal(): void {
    this.selectedMessage = null;
  }
}
