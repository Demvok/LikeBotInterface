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

  constructor(private accountsService: AccountsService) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.getAccounts();
    this.lastUpdate = this.formatDate(new Date());
  }

  ngAfterViewInit() {
    this.accounts.paginator = this.paginator;
    this.accounts.sort = this.sort;
  }

  getAccounts() {
    this.loading = true;
    this.accountsService.getAccounts(this.filter).subscribe(
      (data: Account[]) => {
        this.accounts.data = data;
        if (this.paginator) {
          this.paginator.firstPage();
        }
        this.loading = false;
        this.lastUpdate = this.formatDate(new Date());
      },
      (error: any) => {
        console.error('Error fetching accounts:', error);
        this.accounts.data = [];
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
}
