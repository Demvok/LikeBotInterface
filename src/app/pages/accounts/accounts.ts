import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AccountsService, LoginStatusResponse } from '../../services/accounts';
import { Account, AccountStatus } from '../../services/api.models';
import { Proxy } from '../../services/proxies';
import { ProxiesService } from '../../services/proxies';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule, MatProgressSpinnerModule, MatIconModule, MatMenuModule],
  templateUrl: './accounts.html',
  styleUrls: ['./accounts.css']
})
export class Accounts {
  accounts = new MatTableDataSource<Account>([]);

  accountStatuses: AccountStatus[] = [
    'NEW',
    'ACTIVE',
    'AUTH_KEY_INVALID',
    'BANNED',
    'DEACTIVATED',
    'RESTRICTED',
    'ERROR'
  ];

  displayedColumns: string[] = [
    'phone_number',
    'account_id',
    'session_name',
    'status',
    'actions'
  ];

  loading: boolean = true;
  filter: { phone_number?: string; channel_id?: number } = {};

  lastUpdate: string = '';

  // Modal states
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showVerifyModal: boolean = false;
  showValidateModal: boolean = false;

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

  // Password/Details view
  showDetailsModal: boolean = false;
  detailsData: Account | null = null;
  detailsLoading: boolean = false;

  // Details password fetch (admin-only)
  detailsPasswordLoading: boolean = false;
  detailsPassword: string | null = null;
  detailsHasPassword: boolean | null = null;
  detailsPasswordError: string = '';

  // Validate modal state
  validating: boolean = false;
  validateTargetPhone: string = '';
  validateModalMessage: string = '';
  validateModalIsError: boolean = false;

  // Channel fetching (sync) modal state
  showChannelIndexModal: boolean = false;
  channelIndexing: boolean = false;
  channelIndexTargetPhone: string = '';
  channelIndexMessage: string = '';
  channelIndexIsError: boolean = false;

  // Proxies
  proxies: Proxy[] = [];
  loadingProxies: boolean = false;

  // Proxy filtering (by proxy_name / "proxy id")
  showProxyFilterModal: boolean = false;
  proxyIdFilterApplied: string | null = null;
  proxyIdFilterInput: string = '';

  // Account ↔ Proxy linking (Stage 1)
  editingAccountInitialProxies: string[] = [];
  private editingAccountInitialFields: { session_name: string | null; notes: string | null; status: AccountStatus | null } | null = null;
  editProxiesHydrating: boolean = false;
  private editProxiesTouched: boolean = false;
  editProxiesLoading: boolean = false;
  bulkAutoAssignLoading: boolean = false;

  // Edit modal: proxy assigning modes
  editProxyMode: 'auto' | 'manual' = 'auto';
  editAutoAssignDesiredCount: number = 1;
  editAutoAssignActiveOnly: boolean = true;

  // Bulk auto-assign config (Stage 1)
  showBulkAutoAssignModal: boolean = false;
  bulkAutoAssignDesiredCount: number = 1;
  bulkAutoAssignActiveOnly: boolean = true;

  constructor(
    private accountsService: AccountsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private proxiesService: ProxiesService
  ) {}

  private formatApiError(err: any): string {
    const detail = err?.error?.detail;
    if (detail !== undefined) {
      if (typeof detail === 'string' && detail.trim()) return detail;
      try {
        return JSON.stringify(detail);
      } catch {
        return String(detail);
      }
    }

    const message = err?.message;
    if (typeof message === 'string' && message.trim()) return message;

    const payload = err?.error;
    if (payload !== undefined) {
      try {
        return JSON.stringify(payload);
      } catch {
        return String(payload);
      }
    }

    try {
      return JSON.stringify(err);
    } catch {
      return String(err ?? 'Unknown error');
    }
  }

  private buildAccountUpdatePayload(account: Account): Partial<Account> {
    // Only send fields documented as updatable by PUT /accounts/{phone_number}
    // (avoid sending read-only/meta fields that can cause backend validation errors).
    const payload: Partial<Account> = {};

    const initial = this.editingAccountInitialFields;
    const normalizeText = (value: any): string | null => {
      if (value === undefined || value === null) return null;
      return String(value);
    };

    const currentSession = normalizeText(account.session_name);
    const currentNotes = normalizeText(account.notes);
    const currentStatus = (account.status === undefined || account.status === null) ? null : account.status;

    const initialSession = initial ? initial.session_name : null;
    const initialNotes = initial ? initial.notes : null;
    const initialStatus = initial ? initial.status : null;

    // Only send fields if they changed, and never send null/undefined.
    if (currentSession !== null && currentSession !== initialSession) payload.session_name = currentSession;
    if (currentNotes !== null && currentNotes !== initialNotes) payload.notes = currentNotes;
    if (currentStatus !== null && currentStatus !== initialStatus) payload.status = currentStatus;

    return payload;
  }

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
    // Read query parameters
    this.route.queryParams.subscribe((params) => {
      this.filter = {};
      if (params['channel_id']) {
        this.filter.channel_id = parseInt(params['channel_id'], 10);
      }
      if (params['phone_number']) {
        this.filter.phone_number = params['phone_number'];
      }
      this.getAccounts();
    });
    
    // Load proxies for filtering and selection
    this.loadProxies();
    
    this.lastUpdate = this.formatDate(new Date());
  }

  loadProxies() {
    this.loadingProxies = true;
    this.proxiesService.getProxies().subscribe({
      next: (data) => {
        this.proxies = data;
        this.loadingProxies = false;
      },
      error: (error) => {
        console.error('Error loading proxies:', error);
        this.loadingProxies = false;
      }
    });
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

  private normalizeProxyId(input?: string | null): string {
    return (input ?? '').trim();
  }

  private async runWithConcurrency(tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> {
    const queue = tasks.slice();
    const workerCount = Math.max(1, Math.min(concurrency, queue.length || 1));

    const workers = Array.from({ length: workerCount }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) return;
        try {
          await next();
        } catch {
          // Best-effort: if a single account proxy fetch fails, keep going.
        }
      }
    });

    await Promise.all(workers);
  }

  private async applyProxyIdFilterIfNeeded(accounts: Account[]): Promise<Account[]> {
    const proxyId = this.normalizeProxyId(this.proxyIdFilterApplied);
    if (!proxyId) return accounts;

    // Ensure we have assigned proxies for filtering. If the list endpoint doesn't include them,
    // hydrate missing rows from /accounts/{phone}/proxies.
    const tasks = accounts.map((account) => async () => {
      const existing = account.assigned_proxies ?? account.proxy_names;
      if (Array.isArray(existing)) return;
      await this.loadAssignedProxiesIntoAccount(account);
    });

    await this.runWithConcurrency(tasks, 6);

    return accounts.filter((account) => {
      const assigned = account.assigned_proxies ?? account.proxy_names ?? [];
      return Array.isArray(assigned) && assigned.includes(proxyId);
    });
  }

  async getAccounts() {
    this.loading = true;
    try {
      const data = await firstValueFrom(this.accountsService.getAccounts(this.filter));
      const filtered = await this.applyProxyIdFilterIfNeeded(data);

      this.accounts.data = filtered;
      this.assignTableFeatures();
      if (this._paginator) {
        this._paginator.firstPage();
      }
      this.loading = false;
      this.lastUpdate = this.formatDate(new Date());
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      this.accounts.data = [];
      this.assignTableFeatures();
      this.loading = false;
      this.lastUpdate = this.formatDate(new Date());
    }
  }

  formatDate(date: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }

  resetFilters() {
    this.filter = {};
    this.proxyIdFilterApplied = null;
    this.proxyIdFilterInput = '';
    this.getAccounts();
  }

  openProxyFilterModal() {
    this.proxyIdFilterInput = this.proxyIdFilterApplied ?? '';
    this.showProxyFilterModal = true;
  }

  closeProxyFilterModal() {
    this.showProxyFilterModal = false;
  }

  applyProxyFilterFromModal() {
    const next = this.normalizeProxyId(this.proxyIdFilterInput);
    this.proxyIdFilterApplied = next ? next : null;
    this.showProxyFilterModal = false;
    this.getAccounts();
  }

  clearProxyFilter() {
    this.proxyIdFilterApplied = null;
    this.proxyIdFilterInput = '';
    this.showProxyFilterModal = false;
    this.getAccounts();
  }

  openBulkAutoAssignModal() {
    if (this.isGuest()) return;
    this.showBulkAutoAssignModal = true;
  }

  closeBulkAutoAssignModal() {
    if (this.bulkAutoAssignLoading) return;
    this.showBulkAutoAssignModal = false;
  }

  // Account CRUD operations
  editAccount(account: Account) {
    this.editingAccount = { ...account };
    const initialProxies = (account.assigned_proxies ?? account.proxy_names ?? []).slice();
    this.editingAccount.proxy_names = initialProxies.slice();
    this.editingAccount.assigned_proxies = initialProxies.slice();
    this.editingAccountInitialProxies = initialProxies.slice();
    this.editingAccountInitialFields = {
      session_name: account.session_name ?? null,
      notes: account.notes ?? null,
      status: account.status ?? null
    };
    this.editProxiesTouched = false;
    this.editProxyMode = 'auto';
    this.editAutoAssignDesiredCount = Math.max(1, (account.assigned_proxies ?? account.proxy_names ?? []).length || 0);
    this.editAutoAssignActiveOnly = true;
    this.showEditModal = true;

    // Refresh assigned proxies from backend so the edit modal reflects reality.
    this.editProxiesHydrating = true;
    this.loadAssignedProxiesIntoAccount(this.editingAccount)
      .finally(() => {
        this.editProxiesHydrating = false;
      });
  }

  async submitEditAccount() {
    if (!this.editingAccount || !this.editingAccount.phone_number) return;
    
    const { phone_number } = this.editingAccount;
    const updateData = this.buildAccountUpdatePayload(this.editingAccount);

    const phone = this.sanitizePhoneNumber(phone_number);
    if (!phone) return;

    const nextProxies = (this.editingAccount.proxy_names ?? []).slice();
    const prevProxies = (this.editingAccountInitialProxies ?? []).slice();

    const toAdd = nextProxies.filter((p) => !prevProxies.includes(p));
    const toRemove = prevProxies.filter((p) => !nextProxies.includes(p));

    this.editProxiesLoading = true;

    try {
      const hasAccountUpdate = Object.keys(updateData).length > 0;
      const hasProxyChanges = toAdd.length > 0 || toRemove.length > 0;

      // If user only edits proxies, do NOT call updateAccount (backend returns 400 when body is empty).
      if (hasAccountUpdate) {
        await firstValueFrom(this.accountsService.updateAccount(phone, updateData));
      }

      if (this.editProxyMode === 'manual' && hasProxyChanges) {
        const operations: Array<{ label: string; run: () => Promise<any> }> = [
          ...toAdd.map((proxyName) => ({
            label: `link '${proxyName}'`,
            run: () => firstValueFrom(this.accountsService.linkProxyToAccount(phone, proxyName))
          })),
          ...toRemove.map((proxyName) => ({
            label: `unlink '${proxyName}'`,
            run: () => firstValueFrom(this.accountsService.unlinkProxyFromAccount(phone, proxyName))
          }))
        ];

        const results = await Promise.allSettled(operations.map((op) => op.run()));
        const failures = results
          .map((res, i) => ({ res, label: operations[i]?.label }))
          .filter((x) => x.res.status === 'rejected')
          .map((x: any) => `${x.label}: ${this.formatApiError(x.res.reason)}`);

        // Always refresh assigned proxies from backend for source-of-truth.
        await this.loadAssignedProxiesIntoAccount(this.editingAccount);

        // Refresh proxy stats so linked_accounts_count updates in the UI list.
        this.loadProxies();

        if (failures.length) {
          this.editProxiesLoading = false;
          this.showErrorMessage(`Account saved, but proxy changes failed:\n${failures.join('\n')}`);
          return;
        }
      }

      if (!hasAccountUpdate && !(this.editProxyMode === 'manual' && hasProxyChanges)) {
        // Nothing to update.
      }

      this.editProxiesLoading = false;

      // Refresh initial proxies snapshot after a successful save.
      this.editingAccountInitialProxies = (this.editingAccount.proxy_names ?? []).slice();
      this.getAccounts();
      this.closeEditModal();
    } catch (err: any) {
      this.editProxiesLoading = false;
      this.showErrorMessage('Failed to update account: ' + this.formatApiError(err));
    }
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingAccount = null;
    this.editingAccountInitialProxies = [];
    this.editingAccountInitialFields = null;
    this.editProxiesHydrating = false;
    this.editProxiesTouched = false;
    this.editProxiesLoading = false;
    this.editProxyMode = 'auto';
    this.editAutoAssignDesiredCount = 1;
    this.editAutoAssignActiveOnly = true;
  }

  getProxiesSortedLeastUsed(): Proxy[] {
    // Backend auto-assign uses least-linked proxies; we sort by linked_accounts_count.
    return [...(this.proxies ?? [])].sort((a, b) => {
      const aCount = a.linked_accounts_count ?? Number.MAX_SAFE_INTEGER;
      const bCount = b.linked_accounts_count ?? Number.MAX_SAFE_INTEGER;
      return aCount - bCount;
    });
  }

  async runAutoAssignForEditingAccount() {
    if (!this.editingAccount) return;
    if (this.isGuest()) return;

    const phone = this.sanitizePhoneNumber(this.editingAccount.phone_number);
    if (!phone) return;

    const desired = Number(this.editAutoAssignDesiredCount);
    if (!Number.isFinite(desired) || desired < 1) {
      this.showErrorMessage('Please enter a valid desired proxy count (>= 1).');
      return;
    }

    this.editProxiesLoading = true;
    try {
      const res = await firstValueFrom(
        this.accountsService.autoAssignProxies(phone, {
          desired_count: Math.min(5, desired),
          active_only: this.editAutoAssignActiveOnly
        })
      );

      // Refresh assigned proxies from backend (source of truth).
      await this.loadAssignedProxiesIntoAccount(this.editingAccount);
      this.loadProxies();

      this.editProxiesLoading = false;
      this.showSuccessMessage(
        `Auto-assign complete. Added: ${(res?.added || []).length}, remaining: ${res?.remaining ?? 0}`
      );
    } catch (err: any) {
      this.editProxiesLoading = false;
      this.showErrorMessage(this.formatApiError(err) || 'Failed to auto-assign proxies');
    }
  }

  async unlinkAllProxiesForEditingAccount() {
    if (!this.editingAccount) return;
    if (this.isGuest()) return;

    const phone = this.sanitizePhoneNumber(this.editingAccount.phone_number);
    if (!phone) return;

    const current = (this.editingAccount.proxy_names ?? this.editingAccount.assigned_proxies ?? []).slice();
    if (!current.length) {
      this.showSuccessMessage('No proxies to unlink.');
      return;
    }

    if (!confirm(`Unlink all proxies from account ${phone}?`)) return;

    this.editProxiesLoading = true;
    try {
      await Promise.all(current.map((proxyName) => firstValueFrom(this.accountsService.unlinkProxyFromAccount(phone, proxyName))));
      await this.loadAssignedProxiesIntoAccount(this.editingAccount);
      this.loadProxies();
      this.editProxiesLoading = false;
      this.showSuccessMessage('All proxies unlinked.');
    } catch (err: any) {
      this.editProxiesLoading = false;
      this.showErrorMessage(this.formatApiError(err) || 'Failed to unlink proxies');
    }
  }

  validateAccount(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;

    if (this.validating) return;

    this.showValidateModal = true;
    this.validating = true;
    this.validateTargetPhone = phone;
    this.validateModalMessage = 'Validating account... Please wait.';
    this.validateModalIsError = false;

    this.accountsService.validateAccount(phone).subscribe(
      (res) => {
        this.validateModalMessage = `Account validated: ${res.message}`;
        this.validateModalIsError = false;
        this.validating = false;
        this.getAccounts();
      },
      (err) => {
        this.validateModalMessage = 'Validation failed: ' + (err.error?.detail || err.message || 'Unknown error');
        this.validateModalIsError = true;
        this.validating = false;
      }
    );
  }

  closeValidateModal() {
    if (this.validating) return;
    this.showValidateModal = false;
    this.validateTargetPhone = '';
    this.validateModalMessage = '';
    this.validateModalIsError = false;
  }

  closeChannelIndexModal() {
    if (this.channelIndexing) return;
    this.showChannelIndexModal = false;
    this.channelIndexTargetPhone = '';
    this.channelIndexMessage = '';
    this.channelIndexIsError = false;
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
        // If user selected proxies during creation, link them now.
        this.linkSelectedProxiesAfterLogin(status.phone_number);
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

  private async loadAssignedProxiesIntoAccount(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;

    try {
      const proxies = await firstValueFrom(this.accountsService.getAccountProxies(phone));
      const names = Array.isArray(proxies) ? proxies.map((p: any) => p.proxy_name).filter(Boolean) : [];
      account.proxy_names = names;
      account.assigned_proxies = names;

      // If this is the currently edited account, treat this as the source of truth.
      if (this.editingAccount && this.sanitizePhoneNumber(this.editingAccount.phone_number) === phone) {
        // Never overwrite the user's in-progress manual changes.
        if (!this.editProxiesTouched) {
          this.editingAccount.proxy_names = names;
          this.editingAccount.assigned_proxies = names;
        }
        this.editingAccountInitialProxies = names.slice();
      }
    } catch {
      // Non-fatal: keep whatever was already on the account object.
      const fallback = (account.assigned_proxies ?? account.proxy_names ?? []).slice();
      account.proxy_names = fallback;
      account.assigned_proxies = fallback;

      if (this.editingAccount && this.sanitizePhoneNumber(this.editingAccount.phone_number) === phone) {
        if (!this.editProxiesTouched) {
          this.editingAccount.proxy_names = fallback;
          this.editingAccount.assigned_proxies = fallback;
        }
        this.editingAccountInitialProxies = fallback.slice();
      }
    }
  }

  async autoAssignProxiesForEditingAccount() {
    // Backwards-compatible wrapper (older template wiring).
    await this.runAutoAssignForEditingAccount();
  }

  async autoAssignProxiesForAccountsWithoutProxies(options?: { desired_count?: number; active_only?: boolean }) {
    if (this.isGuest()) return;
    if (this.bulkAutoAssignLoading) return;

    const desired_count = options?.desired_count;
    const active_only = options?.active_only;

    this.bulkAutoAssignLoading = true;

    let checked = 0;
    let assigned = 0;
    let skipped = 0;
    let failed = 0;

    for (const account of this.accounts.data) {
      const phone = this.sanitizePhoneNumber(account.phone_number);
      if (!phone) continue;

      checked++;

      try {
        const proxies = await firstValueFrom(this.accountsService.getAccountProxies(phone));
        const hasAny = Array.isArray(proxies) && proxies.length > 0;
        if (hasAny) {
          skipped++;
          continue;
        }

        await firstValueFrom(this.accountsService.autoAssignProxies(phone, { desired_count, active_only }));
        assigned++;
      } catch {
        failed++;
      }
    }

    this.bulkAutoAssignLoading = false;
    this.getAccounts();
    alert(`Auto-assign finished. Checked: ${checked}. Assigned: ${assigned}. Skipped: ${skipped}. Failed: ${failed}.`);
  }

  async runBulkAutoAssign() {
    if (this.isGuest()) return;
    if (this.bulkAutoAssignLoading) return;

    const desired = Number(this.bulkAutoAssignDesiredCount);
    if (!Number.isFinite(desired) || desired < 1) {
      alert('Please enter a valid “Proxies per account” number (>= 1).');
      return;
    }

    // Close modal = confirmation.
    this.showBulkAutoAssignModal = false;

    await this.autoAssignProxiesForAccountsWithoutProxies({
      desired_count: desired,
      active_only: this.bulkAutoAssignActiveOnly
    });
  }

  private async linkSelectedProxiesAfterLogin(phoneFromBackend: string) {
    // Only if user actually selected proxies during creation.
    const selected = (this.newAccount?.proxy_names ?? []).slice();
    if (!selected.length) return;
    if (this.isGuest()) return;

    const phone = this.sanitizePhoneNumber(phoneFromBackend);
    if (!phone) return;

    let linked = 0;
    let failed = 0;
    for (const proxyName of selected) {
      try {
        await firstValueFrom(this.accountsService.linkProxyToAccount(phone, proxyName));
        linked++;
      } catch {
        failed++;
      }
    }

    // Clear selection after we attempted to link.
    this.newAccount.proxy_names = [];

    if (linked || failed) {
      alert(`Proxy linking after login: linked ${linked}, failed ${failed}.`);
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
      case 'AUTH_KEY_INVALID':
      case 'DEACTIVATED':
      case 'RESTRICTED':
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

  // Check if current user is guest
  isGuest(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'guest';
  }

  // View account password (admin only)
  viewDetails(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;

    // Reset password fetch state on each open.
    this.detailsPasswordLoading = false;
    this.detailsPassword = null;
    this.detailsHasPassword = null;
    this.detailsPasswordError = '';

    this.detailsLoading = true;
    this.showDetailsModal = true;
    this.detailsData = { ...account, phone_number: phone };

    // Load proxies (and any other derived details) without forcing password fetch.
    this.loadAssignedProxiesIntoAccount(this.detailsData)
      .finally(() => {
        this.detailsLoading = false;
      });
  }

  fetchDetailsPassword() {
    if (!this.isAdmin()) return;
    if (!this.detailsData) return;

    const phone = this.sanitizePhoneNumber(this.detailsData.phone_number);
    if (!phone) return;
    if (this.detailsPasswordLoading) return;

    this.detailsPasswordLoading = true;
    this.detailsPasswordError = '';

    this.accountsService.getAccountPassword(phone).subscribe(
      (res) => {
        this.detailsHasPassword = !!res?.has_password;
        this.detailsPassword = res?.password ?? null;
        this.detailsPasswordLoading = false;
      },
      (err) => {
        this.detailsPasswordError = err?.error?.detail || err?.message || 'Failed to retrieve password';
        this.detailsPasswordLoading = false;
      }
    );
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.detailsData = null;
    this.detailsLoading = false;

    this.detailsPasswordLoading = false;
    this.detailsPassword = null;
    this.detailsHasPassword = null;
    this.detailsPasswordError = '';
  }

  viewSubscribedChannels(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;

    this.router.navigate(['/channels'], {
      queryParams: { subscribed_phone: phone }
    });
  }

  // Index subscribed channels for an account
  indexAccountChannels(account: Account) {
    const phone = this.sanitizePhoneNumber(account.phone_number);
    if (!phone) return;

    if (!confirm(`Sync subscribed channels for account ${account.phone_number}? This may take a while.`)) return;

    if (this.channelIndexing) return;

    this.showChannelIndexModal = true;
    this.channelIndexing = true;
    this.channelIndexTargetPhone = account.phone_number;
    this.channelIndexMessage = 'Syncing channels... Please wait.';
    this.channelIndexIsError = false;

    this.accountsService.indexAccountChannels(phone).subscribe(
      (res) => {
        this.channelIndexMessage = `Success! Synced ${res.channels_count} channels.`;
        this.channelIndexIsError = false;
        this.channelIndexing = false;
        this.getAccounts();
      },
      (err) => {
        this.channelIndexMessage = 'Failed to sync channels: ' + this.formatApiError(err);
        this.channelIndexIsError = true;
        this.channelIndexing = false;
      }
    );
  }

  // Toggle proxy selection for an account
  toggleProxySelection(proxyName: string, isSelected: boolean) {
    if (!this.editingAccount) {
      return;
    }

    this.editProxiesTouched = true;

    if (!this.editingAccount.proxy_names) {
      this.editingAccount.proxy_names = [];
    }

    if (isSelected) {
      // Add proxy if not already in list
      if (!this.editingAccount.proxy_names.includes(proxyName)) {
        this.editingAccount.proxy_names.push(proxyName);
      }
    } else {
      // Remove proxy from list
      const index = this.editingAccount.proxy_names.indexOf(proxyName);
      if (index > -1) {
        this.editingAccount.proxy_names.splice(index, 1);
      }
    }
  }

  // Toggle proxy selection for new account
  toggleProxySelectionForNewAccount(proxyName: string, isSelected: boolean) {
    if (!this.newAccount) {
      return;
    }

    if (!this.newAccount.proxy_names) {
      this.newAccount.proxy_names = [];
    }

    if (isSelected) {
      // Add proxy if not already in list
      if (!this.newAccount.proxy_names.includes(proxyName)) {
        this.newAccount.proxy_names.push(proxyName);
      }
    } else {
      // Remove proxy from list
      const index = this.newAccount.proxy_names.indexOf(proxyName);
      if (index > -1) {
        this.newAccount.proxy_names.splice(index, 1);
      }
    }
  }

}
