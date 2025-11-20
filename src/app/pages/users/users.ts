import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { UsersService, User } from '../../services/users';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  users = new MatTableDataSource<User>([]);

  displayedColumns: string[] = [
    'username',
    'role',
    'is_verified',
    'created_at',
    'updated_at',
    'actions'
  ];

  loading: boolean = true;
  isAdminUser: boolean = false;

  // Modal states
  showEditModal: boolean = false;
  showDeleteConfirm: boolean = false;

  // Edit modal data
  editingUser: User | null = null;
  selectedRole: 'user' | 'admin' | 'guest' = 'user';
  selectedVerified: boolean = false;

  // Delete confirmation
  deleteUsername: string = '';

  // Error message
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

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.checkAdminStatus();
    if (this.isAdminUser) {
      this.getUsers();
    }
  }

  ngAfterViewInit() {
    this.assignTableFeatures();
  }

  private assignTableFeatures() {
    if (this._paginator && this._sort && this.users) {
      this.users.paginator = this._paginator;
      this.users.sort = this._sort;
    }
  }

  checkAdminStatus() {
    const user = this.authService.getCurrentUser();
    this.isAdminUser = user?.role === 'admin';
  }

  getUsers() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = new MatTableDataSource<User>(data);
        this.assignTableFeatures();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = error?.error?.detail || 'Failed to load users';
        this.loading = false;
      }
    });
  }

  // Edit role
  openEditModal(user: User) {
    this.editingUser = user;
    this.selectedRole = user.role;
    this.selectedVerified = user.is_verified;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingUser = null;
  }

  saveEditModal() {
    if (!this.editingUser) return;

    const updateRole$ = this.usersService.updateUserRole(this.editingUser.username, this.selectedRole);
    const updateVerify$ = this.usersService.updateUserVerification(
      this.editingUser.username,
      this.selectedVerified
    );

    let completedCount = 0;
    let hasError = false;

    updateRole$.subscribe({
      next: () => {
        completedCount++;
        if (completedCount === 2) {
          this.successMessage = `User ${this.editingUser?.username} updated successfully`;
          this.closeEditModal();
          this.getUsers();
        }
      },
      error: (error) => {
        hasError = true;
        this.errorMessage = error?.error?.detail || 'Failed to update user';
      }
    });

    updateVerify$.subscribe({
      next: () => {
        completedCount++;
        if (completedCount === 2 && !hasError) {
          this.successMessage = `User ${this.editingUser?.username} updated successfully`;
          this.closeEditModal();
          this.getUsers();
        }
      },
      error: (error) => {
        hasError = true;
        this.errorMessage = error?.error?.detail || 'Failed to update user';
      }
    });
  }

  // Delete user
  openDeleteConfirm(username: string) {
    this.deleteUsername = username;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.deleteUsername = '';
  }

  confirmDelete() {
    this.usersService.deleteUser(this.deleteUsername).subscribe({
      next: () => {
        this.successMessage = `User ${this.deleteUsername} deleted successfully`;
        this.closeDeleteConfirm();
        this.getUsers();
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail || 'Failed to delete user';
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA');
  }
}
