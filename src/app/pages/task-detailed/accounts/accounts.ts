import { Component, ViewChild, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { forkJoin, Subscription } from 'rxjs';
import { AccountsService } from '../../../services/accounts';
import { TasksService, Task } from '../../../services/tasks';
import { AuthService } from '../../../services/auth.service';
import { Account } from '../../../services/api.models';
import { ReportService } from '../../../services/report.service';

// Extended account interface for task-specific view
interface AccountWithTaskInfo extends Account {
  inTask?: boolean;
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css'
})
export class Accounts implements OnInit, OnDestroy {
  taskAccounts = new MatTableDataSource<AccountWithTaskInfo>([]);
  allAccounts: Account[] = [];

  kpis = {
    successRate: 0,
    errorCount: 0
  };
  kpisLoading = false;
  
  displayedColumns: string[] = [
    'phone_number',
    'account_id', 
    'session_name',
    // 'in_task',
  ];

  loading: boolean = true;
  filter: { phone_number?: string } = {};
  taskId: string = '';
  task: Task | null = null;

  lastUpdate: string = '';
  showAddModal: boolean = false;
  newAccount: Partial<Account> = {};
  
  private subscriptions = new Subscription();

  constructor(
    private accountsService: AccountsService,
    private tasksService: TasksService,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private authService: AuthService,
    private reportService: ReportService
  ) {}

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
    // Get task ID from route
    this.subscriptions.add(
      this.route.params.subscribe(params => {
        this.taskId = params['id'];
        this.loadTaskAndAccounts();
      })
    );
    this.lastUpdate = this.formatDate(new Date());
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator) {
      this.taskAccounts.paginator = this._paginator;
    }
    if (this._sort) {
      this.taskAccounts.sort = this._sort;
    }
  }

  loadTaskAndAccounts() {
    this.loading = true;
    
    // Load task details and accounts in parallel
    const taskSub = this.tasksService.getTask(Number(this.taskId)).subscribe(
      (task: Task) => {
        this.task = task;
        this.loadKpis();
        this.loadAccounts();
      },
      (error: any) => {
        console.error('Error fetching task:', error);
        this.loadAccounts(); // Load accounts anyway
      }
    );
    
    this.subscriptions.add(taskSub);
  }

  loadAccounts() {
    this.loading = true;
    
    const accountsSub = this.accountsService.getAccounts(this.filter).subscribe(
      (data: Account[]) => {
        this.allAccounts = data;
        this.updateAccountsDisplay();
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      },
      (error: any) => {
        console.error('Error fetching accounts:', error);
        this.allAccounts = [];
        this.updateAccountsDisplay();
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      }
    );
    
    this.subscriptions.add(accountsSub);
  }

  private loadKpis(): void {
    if (!this.task?.task_id) return;

    const accountsCount = this.task.accounts?.length ?? 0;
    this.kpisLoading = true;

    forkJoin({
      success: this.reportService.getTaskReport(this.task.task_id, 'success'),
      errors: this.reportService.getTaskReport(this.task.task_id, 'errors')
    }).subscribe({
      next: ({ success, errors }) => {
        const successCount = success?.report?.events?.length ?? 0;
        const errorCount = errors?.report?.events?.length ?? 0;

        this.kpis = {
          successRate: accountsCount > 0 ? Math.round((successCount / accountsCount) * 100) : 0,
          errorCount
        };
        this.kpisLoading = false;
      },
      error: () => {
        this.kpis = { successRate: 0, errorCount: 0 };
        this.kpisLoading = false;
      }
    });
  }

  updateAccountsDisplay() {
    if (this.task) {
      // Create enhanced account data with task membership info
      const enhancedAccounts: AccountWithTaskInfo[] = this.allAccounts.map(account => ({
        ...account,
        inTask: this.task!.accounts.includes(account.phone_number)
      }));
      
      // Filter accounts that are in the task
      const taskAccountsData = enhancedAccounts.filter(account => account.inTask);
      this.taskAccounts.data = taskAccountsData;
    } else {
      this.taskAccounts.data = [];
    }
    
    this.assignTableFeatures();
    if (this._paginator) {
      this._paginator.firstPage();
    }
  }

  getAccounts() {
    this.loadAccounts();
  }

  formatDate(date: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }

  resetFilters() {
    this.filter = {};
    this.loadAccounts();
  }

  openAddAccountModal() {
    this.newAccount = {};
    this.showAddModal = true;
  }

  closeAddAccountModal() {
    this.showAddModal = false;
  }

  submitAddAccount() {
    const { phone_number, account_id, session_name } = this.newAccount;
    if (!phone_number) return;
    
    const account: Account = {
      phone_number: phone_number ?? '',
      account_id: account_id ?? undefined,
      session_name: session_name ?? undefined
    };
    
    const createSub = this.accountsService.createAccount(account).subscribe(
      (res) => {
        this.loadAccounts();
        this.closeAddAccountModal();
      },
      (err) => {
        alert('Failed to create account.');
      }
    );

    this.subscriptions.add(createSub);
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
