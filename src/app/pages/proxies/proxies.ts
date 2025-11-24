import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProxiesService, Proxy } from '../../services/proxies';

@Component({
  selector: 'app-proxies',
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
  templateUrl: './proxies.html',
  styleUrl: './proxies.css'
})
export class Proxies implements OnInit {
  proxies = new MatTableDataSource<Proxy>([]);

  displayedColumns: string[] = [
    'proxy_name',
    'proxy_type',
    'host',
    'port',
    'username',
    'is_active',
    'current_usage',
    'max_usage',
    'last_error',
    'actions'
  ];

  loading: boolean = true;

  // Modal states
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteConfirm: boolean = false;

  // Form data
  formData: Partial<Proxy> = {
    proxy_type: 'socks5',
    is_active: true
  };
  formPassword: string = '';
  isEditing: boolean = false;
  editingProxyName: string = '';

  // Delete confirmation
  deleteProxyName: string = '';

  // Messages
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

  constructor(private proxiesService: ProxiesService) {}

  ngOnInit() {
    this.getProxies();
  }

  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator && this._sort && this.proxies) {
      this.proxies.paginator = this._paginator;
      this.proxies.sort = this._sort;
    }
  }

  getProxies() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.proxiesService.getProxies().subscribe({
      next: (data) => {
        this.proxies = new MatTableDataSource<Proxy>(data);
        this.assignTableFeatures();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading proxies:', error);
        this.errorMessage = error?.error?.detail || 'Failed to load proxies';
        this.loading = false;
      }
    });
  }

  // Add modal
  openAddModal() {
    this.isEditing = false;
    this.editingProxyName = '';
    this.formData = {
      proxy_type: 'socks5',
      is_active: true
    };
    this.formPassword = '';
    this.errorMessage = '';
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    // Clear form data
    this.formData = {
      proxy_type: 'socks5',
      is_active: true
    };
    this.formPassword = '';
    this.errorMessage = '';
    this.isEditing = false;
    this.editingProxyName = '';
  }

  // Edit modal
  openEditModal(proxy: Proxy) {
    this.isEditing = true;
    this.editingProxyName = proxy.proxy_name;
    this.formData = { ...proxy };
    this.formPassword = '';
    this.errorMessage = '';
    this.showAddModal = true;
  }

  // Delete modal
  openDeleteConfirm(proxy: Proxy) {
    this.deleteProxyName = proxy.proxy_name;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
  }

  // Save proxy
  saveProxy() {
    if (!this.formData.proxy_name || !this.formData.host || !this.formData.port) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    if (this.isEditing) {
      const updateData: any = {
        proxy_type: this.formData.proxy_type,
        host: this.formData.host,
        port: this.formData.port,
        username: this.formData.username || undefined,
        is_active: this.formData.is_active
      };

      if (this.formPassword) {
        updateData.password = this.formPassword;
      }

      this.proxiesService.updateProxy(this.editingProxyName, updateData).subscribe({
        next: () => {
          this.successMessage = `Proxy ${this.formData.proxy_name} updated successfully`;
          this.closeAddModal();
          this.getProxies();
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail || 'Failed to update proxy';
        }
      });
    } else {
      const createData = {
        proxy_name: this.formData.proxy_name!,
        proxy_type: this.formData.proxy_type || 'socks5',
        host: this.formData.host!,
        port: this.formData.port!,
        username: this.formData.username,
        password: this.formPassword,
        is_active: this.formData.is_active !== false,
        max_usage: this.formData.max_usage
      };

      this.proxiesService.createProxy(createData).subscribe({
        next: () => {
          this.successMessage = `Proxy ${this.formData.proxy_name} created successfully`;
          this.closeAddModal();
          this.getProxies();
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail || 'Failed to create proxy';
        }
      });
    }
  }

  // Delete proxy
  confirmDelete() {
    this.proxiesService.deleteProxy(this.deleteProxyName).subscribe({
      next: () => {
        this.successMessage = `Proxy ${this.deleteProxyName} deleted successfully`;
        this.closeDeleteConfirm();
        this.getProxies();
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail || 'Failed to delete proxy';
      }
    });
  }

  // Toggle active status
  toggleProxyStatus(proxy: Proxy) {
    this.proxiesService.updateProxy(proxy.proxy_name, { is_active: !proxy.is_active }).subscribe({
      next: () => {
        this.successMessage = `Proxy ${proxy.proxy_name} status changed`;
        this.getProxies();
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail || 'Failed to update proxy status';
      }
    });
  }

  getProxyTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'socks5':
        return '#8b5cf6';
      case 'socks4':
        return '#6366f1';
      case 'http':
        return '#3b82f6';
      case 'https':
        return '#10b981';
      default:
        return '#6b7280';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA');
  }
}
