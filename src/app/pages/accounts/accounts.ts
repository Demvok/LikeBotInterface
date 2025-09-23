import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { AccountsService } from '../../services/accounts';
import { Account } from '../../services/api.models';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule],
  templateUrl: './accounts.html',
  styleUrls: ['./accounts.css']
})
export class Accounts {
  accounts = new MatTableDataSource<Account>([]);

  displayedColumns: string[] = [
    'phone_number',
    'account_id',
    'session_name',
    'actions'
  ];

  loading: boolean = true;
  filter: { phone_number?: string } = {};

  lastUpdate: string = '';

  showAddModal: boolean = false;
  newAccount: Partial<Account> = {};

  constructor(private accountsService: AccountsService) {}

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


  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator && this._sort && this.accounts) {
      this.accounts.paginator = this._paginator;
      this.accounts.sort = this._sort;
    }
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

  editAccount(account: Account) {
    alert('Edit not implemented.');
  }

  deleteAccount(account: Account) {
    if (!account.phone_number) return;
    if (!confirm('Delete this account?')) return;
    this.accountsService.deleteAccount(account.phone_number).subscribe(
      (res) => {
        this.getAccounts();
      },
      (err) => {
        alert('Failed to delete account.');
      }
    );
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
    this.accountsService.createAccount(account).subscribe(
      (res) => {
        this.getAccounts();
        this.closeAddAccountModal();
      },
      (err) => {
        alert('Failed to create account.');
      }
    );
  }
}
