import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Subscription } from 'rxjs';
import { AccountsService } from '../../../services/accounts';
import { TasksService } from '../../../services/tasks.service';
import { Account } from '../../../services/api.models';
import { Task } from '../../../services/tasks.service';

// Extended account interface for task-specific view
interface AccountWithTaskInfo extends Account {
  inTask?: boolean;
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css'
})
export class Accounts implements OnInit, OnDestroy {
  accounts = new MatTableDataSource<AccountWithTaskInfo>([]);
  taskAccounts = new MatTableDataSource<AccountWithTaskInfo>([]);
  allAccounts: Account[] = [];
  
  displayedColumns: string[] = [
    'phone_number',
    'account_id', 
    'session_name',
    // 'in_task',
    'actions'
  ];

  loading: boolean = true;
  filter: { phone_number?: string } = {};
  taskId: string = '';
  task: Task | null = null;
  showTaskAccountsOnly: boolean = false;

  lastUpdate: string = '';
  showAddModal: boolean = false;
  newAccount: Partial<Account> = {};
  
  private subscriptions = new Subscription();

  constructor(
    private accountsService: AccountsService,
    private tasksService: TasksService,
    private route: ActivatedRoute
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
    const dataSource = this.showTaskAccountsOnly ? this.taskAccounts : this.accounts;
    if (this._paginator && this._sort && dataSource) {
      dataSource.paginator = this._paginator;
      dataSource.sort = this._sort;
    }
  }

  loadTaskAndAccounts() {
    this.loading = true;
    
    // Load task details and accounts in parallel
    const taskSub = this.tasksService.getTask(this.taskId).subscribe(
      (task: Task) => {
        this.task = task;
        this.loadAccounts();
      },
      (error) => {
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

  updateAccountsDisplay() {
    if (this.task) {
      // Create enhanced account data with task membership info
      const enhancedAccounts: AccountWithTaskInfo[] = this.allAccounts.map(account => ({
        ...account,
        inTask: this.task!.accounts.includes(account.phone_number)
      }));
      
      this.accounts.data = enhancedAccounts;
      
      // Filter accounts that are in the task
      const taskAccountsData = enhancedAccounts.filter(account => account.inTask);
      this.taskAccounts.data = taskAccountsData;
    } else {
      this.accounts.data = this.allAccounts;
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

  toggleTaskFilter() {
    this.showTaskAccountsOnly = !this.showTaskAccountsOnly;
    this.assignTableFeatures();
    if (this._paginator) {
      this._paginator.firstPage();
    }
  }

  get currentDataSource() {
    return this.showTaskAccountsOnly ? this.taskAccounts : this.accounts;
  }

  editAccount(account: AccountWithTaskInfo) {
    alert('Edit not implemented.');
  }

  deleteAccount(account: AccountWithTaskInfo) {
    if (!account.phone_number) return;
    if (!confirm('Delete this account?')) return;
    
    const deleteSub = this.accountsService.deleteAccount(account.phone_number).subscribe(
      (res) => {
        this.loadAccounts();
      },
      (err) => {
        alert('Failed to delete account.');
      }
    );
    
    this.subscriptions.add(deleteSub);
  }

  addToTask(account: AccountWithTaskInfo) {
    if (!this.task || !account.phone_number) return;
    
    // Add account to task (this would need a proper API endpoint)
    const updatedAccounts = [...this.task.accounts, account.phone_number];
    // Here you would call an API to update the task
    alert('Add to task functionality needs API implementation.');
  }

  removeFromTask(account: AccountWithTaskInfo) {
    if (!this.task || !account.phone_number) return;
    
    if (!confirm('Remove this account from the task?')) return;
    
    // Remove account from task (this would need a proper API endpoint)
    const updatedAccounts = this.task.accounts.filter(phone => phone !== account.phone_number);
    // Here you would call an API to update the task
    alert('Remove from task functionality needs API implementation.');
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
}
