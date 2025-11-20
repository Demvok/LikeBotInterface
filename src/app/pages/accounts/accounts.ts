import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AccountsService, LoginStatusResponse } from '../../services/accounts';
import { Account, AccountStatus } from '../../services/api.models';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './accounts.html',
  styleUrls: ['./accounts.css']
})
export class Accounts {
  accounts = new MatTableDataSource<Account>([]);

  displayedColumns: string[] = [
    'phone_number',
    'account_id',
    'session_name',
    'status',
    'actions'
  ];

  loading: boolean = true;
  filter: { phone_number?: string } = {};

  lastUpdate: string = '';

  // Modal states
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showVerifyModal: boolean = false;

  // Account data
  newAccount: Partial<Account> = {};
  editingAccount: Account | null = null;

  // Login process data
  loginSessionId: string = '';
  verificationCode: string = '';
  loginInProgress: boolean = false;
  loginMessage: string = '';
  loginError: string = '';
  pollingInterval: any = null;
  pollingStartTime: number = 0;
  pollingErrorCount: number = 0;
  readonly POLLING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  readonly MAX_POLLING_ERRORS = 5; // Stop polling after 5 consecutive errors

  // Password view
  showPasswordModal: boolean = false;
  passwordData: { phone_number: string; has_password: boolean; password: string | null } | null = null;
  passwordLoading: boolean = false;

  constructor(private accountsService: AccountsService, private authService: AuthService) {}

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

  ngOnInit() {
    this.getAccounts();
    this.lastUpdate = this.formatDate(new Date());
  }

  ngOnDestroy() {
    // Clean up polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator && this._sort && this.accounts) {
      this.accounts.paginator = this._paginator;
      this.accounts.sort = this._sort;
    }
  }

  private sanitizePhoneNumber(phone?: string): string {
    if (!phone) return '';
    const trimmed = phone.trim();
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (!digits) {
      return '';
    }
    return `+${digits}`;
  }

  getAccounts() {
    this.loading = true;
    this.accountsService.getAccounts(this.filter).subscribe(
      (data: Account[]) => {
        this.accounts.data = data;
        this.assignTableFeatures();
        if (this._paginator) {
          this._paginator.firstPage();
        }
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      },
      (error: any) => {
        console.error('Error fetching accounts:', error);
        this.accounts.data = [];
        this.assignTableFeatures();
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      }
    );
  }

  formatDate(date: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }

  resetFilters() {
    this.filter = {};
    this.getAccounts();
  }

  // Account CRUD operations
  editAccount(account: Account) {
    this.editingAccount = { ...account };
    this.showEditModal = true;
  }

  submitEditAccount() {
    if (!this.editingAccount || !this.editingAccount.phone_number) return;
    
    const { phone_number, ...updateData } = this.editingAccount;
    this.accountsService.updateAccount(phone_number, updateData).subscribe(
      (res) => {
        // this.showSuccessMessage('Account updated successfully');
        this.getAccounts();
        this.closeEditModal();
      },
      (err) => {
        this.showErrorMessage('Failed to update account: ' + (err.error?.detail || err.message));
      }
    );
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingAccount = null;
  }

  validateAccount(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;
    
    this.loading = true;
    this.accountsService.validateAccount(phone).subscribe(
      (res) => {
        this.showSuccessMessage(`Account validated: ${res.message}`);
        this.getAccounts();
      },
      (err) => {
        this.showErrorMessage('Validation failed: ' + (err.error?.detail || err.message));
        this.loading = false;
      }
    );
  }

  deleteAccount(account: Account) {   
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;
    if (!confirm(`Delete account ${phone}?`)) return;
    console.log(1);
    
    this.accountsService.deleteAccount(phone).subscribe(
      (res) => {
        // this.showSuccessMessage('Account deleted successfully');
        this.getAccounts();
      },
      (err) => {
        this.showErrorMessage('Failed to delete account: ' + (err.error?.detail || err.message));
      }
    );
  }

  // Modal management
  openAddAccountModal() {
    this.newAccount = {};
    this.resetLoginState();
    this.showAddModal = true;
  }

  closeAddAccountModal() {
    this.showAddModal = false;
    this.stopPolling();
    this.resetLoginState();
  }

  closeVerifyModal() {
    if (!this.loginInProgress) {
      this.showVerifyModal = false;
      this.verificationCode = '';
      this.loginError = '';
      this.loginMessage = '';
      this.stopPolling();
      this.resetLoginState();
    }
  }

  resetLoginState() {
    this.loginSessionId = '';
    this.verificationCode = '';
    this.loginMessage = '';
    this.loginError = '';
    this.loginInProgress = false;
    this.pollingStartTime = 0;
    this.pollingErrorCount = 0;
    if (this.newAccount) {
      this.newAccount.password_encrypted = undefined;
    }
  }

  resetAndRestart() {
    this.stopPolling();
    this.closeAllModals();
    this.resetLoginState();
    // Small delay to ensure cleanup, then reopen the modal
    setTimeout(() => {
      this.openAddAccountModal();
    }, 100);
  }

  // Login process implementation
  submitAddAccount() {
    const { phone_number, session_name, notes, password_encrypted } = this.newAccount;
    const normalizedPhone = this.sanitizePhoneNumber(phone_number);
    if (!normalizedPhone) return;

    this.newAccount.phone_number = normalizedPhone;

    // Prevent multiple submissions
    if (this.loginInProgress) {
      return;
    }

    const passwordPlain = password_encrypted ?? undefined;
    this.loginInProgress = true;
    this.loginMessage = 'Sending verification code...';
    this.loginError = '';

    this.accountsService.startLogin(
      normalizedPhone,
  passwordPlain,
      session_name,
      notes
    ).subscribe(
      (res) => {
        this.loginSessionId = res.login_session_id;
        this.loginMessage = res.message;
        
        if (res.status === 'wait_code') {
          // Show verification code modal
          this.showAddModal = false;
          this.showVerifyModal = true;
          this.loginInProgress = false; // Allow user to enter code
        } else if (res.status === 'wait_2fa') {
          // According to documentation, this should not happen if password was provided during start
          // But if it does, show error message
          this.loginError = '2FA password is required. Please restart login and provide password in the initial form.';
          this.loginInProgress = false;
        } else if (res.status === 'processing') {
          // Keep showing progress and start polling
          this.showAddModal = false;
          this.startPolling();
        } else if (res.status === 'done') {
          // Login completed immediately
          this.showAddModal = false;
          this.loginInProgress = false;
          this.showSuccessMessage('Account created successfully!');
          this.getAccounts();
        } else if (res.status === 'failed') {
          // Login failed
          this.loginError = res.message || 'Login failed';
          this.loginInProgress = false;
        }
        
        // Start polling for status updates if not in a final state
        if (res.status === 'wait_code' || res.status === 'processing') {
          this.startPolling();
        }
      },
      (err) => {
        this.loginError = 'Failed to start login: ' + (err.error?.detail || err.message);
        this.loginInProgress = false;
      }
    );
  }

  submitVerificationCode() {
    if (!this.verificationCode || !this.loginSessionId) return;

    this.loginInProgress = true;
    this.loginMessage = 'Verifying code...';
    this.loginError = '';

    this.accountsService.verifyLogin(this.loginSessionId, this.verificationCode).subscribe(
      (res) => {
        this.loginMessage = res.message;
        
        if (res.status === 'processing') {
          // Continue polling - status will update to done or failed
          // Keep the verification modal open but disabled
        } else if (res.status === 'done') {
          // Verification complete
          this.stopPolling();
          this.closeAllModals();
          this.loginInProgress = false;
          this.showSuccessMessage('Account created successfully!');
          this.getAccounts();
        } else if (res.status === 'failed') {
          // Verification failed
          this.stopPolling();
          this.loginInProgress = false;
          this.loginError = res.message || 'Verification failed';
        }
        // Don't close modal yet unless it's done - let polling handle final state transitions
      },
      (err) => {
        this.loginError = 'Verification failed: ' + (err.error?.detail || err.message);
        this.loginInProgress = false;
        // Keep modal open so user can try again
      }
    );
  }

  startPolling() {
    // Stop any existing polling to prevent multiple intervals
    this.stopPolling();
    
    this.pollingStartTime = Date.now();
    this.pollingErrorCount = 0;
    
    // Poll every 1 second
    this.pollingInterval = setInterval(() => {
      // Check if polling has been running too long
      if (Date.now() - this.pollingStartTime > this.POLLING_TIMEOUT_MS) {
        this.stopPolling();
        this.loginError = 'Login process timed out. Please try again.';
        this.loginInProgress = false;
        this.closeAllModals();
        return;
      }
      
      // Check if too many errors occurred
      if (this.pollingErrorCount >= this.MAX_POLLING_ERRORS) {
        this.stopPolling();
        this.loginError = 'Too many errors occurred. Please start a new login process.';
        this.loginInProgress = false;
        this.closeAllModals();
        return;
      }
      
      this.checkLoginStatus();
    }, 1000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  checkLoginStatus() {
    if (!this.loginSessionId) {
      this.stopPolling();
      return;
    }

    this.accountsService.getLoginStatus(this.loginSessionId).subscribe(
      (res: LoginStatusResponse) => {
        if (res && res.status) {
          // Reset error count on successful response
          this.pollingErrorCount = 0;
          this.handleLoginStatus(res);
        } else {
          this.pollingErrorCount++;
          this.loginError = 'Received invalid status response from server';
          this.loginInProgress = false;
          
          // Stop polling if too many invalid responses
          if (this.pollingErrorCount >= this.MAX_POLLING_ERRORS) {
            this.stopPolling();
            this.closeAllModals();
          }
        }
      },
      (err) => {
        this.pollingErrorCount++;
        
        // Handle specific backend errors
        let errorMessage = 'Unknown error occurred';
        let shouldStopPolling = false;
        
        if (err.error?.detail) {
          errorMessage = err.error.detail;
          
          // Check for the specific NoneType error
          if (errorMessage.includes('NoneType') && errorMessage.includes('await')) {
            errorMessage = 'Backend login process error. The login session may be corrupted. Please try starting a new login process.';
            shouldStopPolling = true;
            this.closeAllModals(); // Force close all modals to allow restart
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.loginError = 'Failed to check status: ' + errorMessage;
        this.loginInProgress = false;
        
        // If the session is not found (404), it might have expired
        if (err.status === 404) {
          this.loginError = 'Login session expired or not found. Please start the login process again.';
          shouldStopPolling = true;
          this.closeAllModals();
        } else if (err.status === 500) {
          // Internal server error - likely the NoneType issue
          this.loginError = 'Server error during login process. Please try starting a new login session.';
          shouldStopPolling = true;
          this.closeAllModals();
        }
        
        // Stop polling for critical errors or if too many errors occurred
        if (shouldStopPolling || this.pollingErrorCount >= this.MAX_POLLING_ERRORS) {
          this.stopPolling();
        }
      }
    );
  }

  handleLoginStatus(status: LoginStatusResponse) {
    switch (status.status) {
      case 'wait_code':
        if (!this.showVerifyModal) {
          this.showVerifyModal = true;
          this.showAddModal = false;
          this.verificationCode = ''; // Clear code field for fresh input
          this.loginInProgress = false; // Allow user to type
        }
        this.loginMessage = status.message;
        break;

      case 'wait_2fa':
        this.stopPolling();
        this.showVerifyModal = false;
        this.showAddModal = true;
        this.loginInProgress = false;
        this.loginMessage = '';
        this.loginSessionId = '';
        this.verificationCode = '';
        this.pollingStartTime = 0;
        this.pollingErrorCount = 0;
        this.loginError = status.message || 'Two-factor password required. Please restart login and provide the 2FA password in the initial form.';
        break;

      case 'processing':
        this.loginMessage = status.message || 'Processing...';
        this.loginInProgress = true;
        break;

      case 'done':
        this.stopPolling();
        this.loginInProgress = false;
        this.showSuccessMessage('Account created successfully!');
        this.closeAllModals();
        this.getAccounts();
        break;

      case 'failed':
        this.stopPolling();
        this.loginInProgress = false;
        this.loginError = status.error || 'Login failed';
        
        // Check for specific backend errors
        if (this.loginError.includes('NoneType') && this.loginError.includes('await')) {
          this.loginError = 'Backend error occurred. Please try starting a new login process.';
          this.closeAllModals();
        } else {
          this.showErrorMessage(this.loginError);
        }
        break;

      default:
        this.stopPolling();
        this.loginInProgress = false;
        this.loginError = `Unknown status received: ${status.status}`;
        break;
    }
  }

  closeAllModals() {
    this.showAddModal = false;
    this.showVerifyModal = false;
    this.showEditModal = false;
    this.stopPolling();
    this.resetLoginState();
  }

  // Utility methods
  showSuccessMessage(message: string) {
    alert(message);
  }

  showErrorMessage(message: string) {
    alert(message);
  }

  getAccountStatusClass(status?: AccountStatus): string {
    switch (status) {
      case 'ACTIVE':
      case 'LOGGED_IN':
        return 'status-active';
      case 'BANNED':
      case 'ERROR':
        return 'status-error';
      case 'NEW':
        return 'status-new';
      default:
        return 'status-unknown';
    }
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'admin';
  }

  // View account password (admin only)
  viewPassword(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;
    
    this.passwordLoading = true;
    this.showPasswordModal = true;
    this.passwordData = null;
    
    this.accountsService.getAccountPassword(phone).subscribe(
      (res) => {
        this.passwordData = res;
        this.passwordLoading = false;
      },
      (err) => {
        this.showErrorMessage('Failed to retrieve password: ' + (err.error?.detail || err.message));
        this.passwordLoading = false;
        this.closePasswordModal();
      }
    );
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.passwordData = null;
    this.passwordLoading = false;
  }
}
