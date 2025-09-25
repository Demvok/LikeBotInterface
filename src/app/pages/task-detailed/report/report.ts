import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskReport, ReportEvent } from '../../../services/api.models';
import { ReportService } from '../../../services/report.service';
import { FormsModule } from '@angular/forms';

interface FilterOptions {
  client: string;
  palette: string;
  startDate: string;
  endDate: string;
  hasError: boolean | null;
}

interface ReportStats {
  totalEvents: number;
  uniqueClients: number;
  positiveReactions: number;
  negativeReactions: number;
  errorCount: number;
  successRate: number;
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
  private datePipe = inject(DatePipe);

  taskId: number = 0;
  reportData: TaskReport | null = null;
  filteredEvents: ReportEvent[] = [];
  isLoading = false;
  error: string | null = null;
  
  filters: FilterOptions = {
    client: '',
    palette: '',
    startDate: '',
    endDate: '',
    hasError: null
  };

  stats: ReportStats = {
    totalEvents: 0,
    uniqueClients: 0,
    positiveReactions: 0,
    negativeReactions: 0,
    errorCount: 0,
    successRate: 0
  };

  uniqueClients: string[] = [];
  currentPage = 1;
  eventsPerPage = 10;
  sortBy: 'datetime' | 'client' | 'palette' = 'datetime';
  sortDirection: 'asc' | 'desc' = 'desc';
  Math = Math;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.taskId = +params['id'];
      this.loadReportData();
    });
  }

  async loadReportData() {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await this.reportService.getTaskReport(this.taskId).toPromise();
      this.reportData = response || null;
      this.processReportData();
    } catch (err: any) {
      this.error = err.error?.detail || 'Failed to load report data';
    } finally {
      this.isLoading = false;
    }
  }

  processReportData() {
    if (!this.reportData) return;

    this.filteredEvents = [...this.reportData.report];
    this.calculateStats();
    this.extractUniqueClients();
    this.applyFilters();
    this.sortEvents();
  }

  calculateStats() {
    if (!this.reportData) return;

    const events = this.reportData.report;
    this.stats.totalEvents = events.length;
    this.stats.uniqueClients = new Set(events.map(e => e.client)).size;
    this.stats.positiveReactions = events.filter(e => e.palette === 'positive').length;
    this.stats.negativeReactions = events.filter(e => e.palette === 'negative').length;
    this.stats.errorCount = events.filter(e => e.error !== null).length;
    this.stats.successRate = this.stats.totalEvents > 0 
      ? ((this.stats.totalEvents - this.stats.errorCount) / this.stats.totalEvents) * 100 
      : 0;
  }

  extractUniqueClients() {
    if (!this.reportData) return;
    this.uniqueClients = [...new Set(this.reportData.report.map(e => e.client))].sort();
  }

  applyFilters() {
    if (!this.reportData) return;

    this.filteredEvents = this.reportData.report.filter(event => {
      if (this.filters.client && !event.client.includes(this.filters.client)) return false;
      if (this.filters.palette && event.palette !== this.filters.palette) return false;
      if (this.filters.hasError !== null) {
        if (this.filters.hasError && event.error === null) return false;
        if (!this.filters.hasError && event.error !== null) return false;
      }
      
      const eventDate = new Date(event.datetime);
      if (this.filters.startDate) {
        const startDate = new Date(this.filters.startDate);
        if (eventDate < startDate) return false;
      }
      if (this.filters.endDate) {
        const endDate = new Date(this.filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (eventDate > endDate) return false;
      }

      return true;
    });

    this.currentPage = 1;
  }

  sortEvents() {
    this.filteredEvents.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'datetime':
          aValue = a.datetime;
          bValue = b.datetime;
          break;
        case 'client':
          aValue = a.client;
          bValue = b.client;
          break;
        case 'palette':
          aValue = a.palette;
          bValue = b.palette;
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
      client: '',
      palette: '',
      startDate: '',
      endDate: '',
      hasError: null
    };
    this.onFilterChange();
  }

  formatDate(timestamp: number): string {
    if (!timestamp || typeof timestamp !== 'number') {
      return '';
    }
    
    const date = new Date(timestamp);
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
    
    if (phoneNumber.length === 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    } else if (phoneNumber.length === 12 && phoneNumber.startsWith('+1')) {
      return `${phoneNumber.slice(0, 2)} (${phoneNumber.slice(2, 5)}) ${phoneNumber.slice(5, 8)}-${phoneNumber.slice(8)}`;
    }
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
    // Use a combination of datetime and client to create a unique key
    if (event && event.datetime && event.client && 
        typeof event.datetime === 'number' && !isNaN(event.datetime)) {
      return `${event.datetime}-${event.client}`;
    }
    // Fall back to index if we can't create a unique identifier
    return index;
  }
}
