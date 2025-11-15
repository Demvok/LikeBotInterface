import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  isAdminUser: boolean = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.checkAdminStatus();
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    this.isAdminUser = user?.role === 'admin';
    return this.isAdminUser;
  }

  checkAdminStatus() {
    this.isAdmin();
  }
}
