import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProxiesService, Proxy } from '../../services/proxies';
import { AuthService } from '../../services/auth.service';

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
    'proxy_type',
    'host',
    'port',
    'username',
    'is_active',
    'connected_accounts',
    'linked_accounts_count',
    'actions'
  ];

  loading: boolean = true;

  // Modal states
  showAddModal: boolean = false;
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

  // Import
  showImportModal: boolean = false;
  importResults: any = null;
  importLoading: boolean = false;

  // Test
  testLoadingByProxy: Record<string, boolean> = {};

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

  constructor(private proxiesService: ProxiesService, private authService: AuthService) {}

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
        const sorted = [...(data || [])].sort(
          (a, b) => (b.connected_accounts ?? 0) - (a.connected_accounts ?? 0)
        );
        this.proxies = new MatTableDataSource<Proxy>(sorted);
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

  testProxy(proxy: Proxy) {
    if (!proxy?.proxy_name) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.testLoadingByProxy[proxy.proxy_name] = true;
    this.proxiesService.testProxy(proxy.proxy_name).subscribe({
      next: (res) => {
        this.testLoadingByProxy[proxy.proxy_name] = false;
        this.successMessage = `Proxy ${proxy.proxy_name} OK (${res.status_code}, ${Math.round(res.latency_ms)}ms)`;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.testLoadingByProxy[proxy.proxy_name] = false;
        this.errorMessage = error?.error?.detail || `Failed to test proxy ${proxy.proxy_name}`;
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
        is_active: this.formData.is_active,
        notes: this.formData.notes ?? ''
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
        is_active: this.formData.is_active !== false
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

  copyEditingProxyName() {
    const name = this.formData.proxy_name;
    if (!name) return;

    const setCopied = () => {
      this.successMessage = 'Proxy name copied to clipboard';
      setTimeout(() => {
        this.successMessage = '';
      }, 2000);
    };

    // Modern clipboard API
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(name)
        .then(setCopied)
        .catch(() => {
          this.errorMessage = 'Failed to copy proxy name';
        });
      return;
    }

    // Fallback
    try {
      const textarea = document.createElement('textarea');
      textarea.value = name;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied();
    } catch {
      this.errorMessage = 'Failed to copy proxy name';
    }
  }

  // Import modal
  openImportModal() {
    this.showImportModal = true;
    this.importResults = null;
    this.errorMessage = '';
  }

  closeImportModal() {
    this.showImportModal = false;
    this.importResults = null;
    // Clear file input
    const fileInput = document.getElementById('csvFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Handle file selection and import
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Backend accepts text files; keep a light hint without blocking uploads.
    const lowerName = file.name.toLowerCase();
    const looksOk = lowerName.endsWith('.txt') || lowerName.endsWith('.csv') || lowerName.endsWith('.log');
    if (!looksOk) {
      this.errorMessage = 'Please select a .txt or .csv file';
      return;
    }

    this.importLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.proxiesService.importProxies(file).subscribe({
      next: (response) => {
        this.importLoading = false;
        this.importResults = response;
        const imported = response?.imported ?? 0;
        const total = response?.total ?? 0;
        this.successMessage = `Import completed: ${imported}/${total} imported`;
        
        // Refresh table
        setTimeout(() => {
          this.getProxies();
          this.closeImportModal();
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }, 1000);
      },
      error: (error) => {
        this.importLoading = false;
        this.errorMessage = error?.error?.detail || 'Failed to import proxies';
      }
    });
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
