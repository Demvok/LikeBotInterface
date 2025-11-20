
import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { CommonModule as NgCommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HttpClientModule, MatCardModule, NgCommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('LikeBot');
  
  currentRoute = '/';
  is_task_detailed = false;
  task_id: string | null = null;
  showSidebar = true;
  isDarkTheme: boolean = false;
  
  // Collapsible sidebar state
  expandedCategories: { [key: string]: boolean } = {
    main: true,
    admin: false,
    detailed: false
  };
  
  private themeSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.urlAfterRedirects;
        this.is_task_detailed = this.currentRoute.startsWith('/task/');
        this.task_id = this.is_task_detailed ? this.currentRoute.split('/')[2] : null;
        
        // Hide sidebar on login/register pages
        this.showSidebar = !this.currentRoute.startsWith('/login') && !this.currentRoute.startsWith('/register');
      }
    });
  }

  ngOnInit(): void {
    this.isDarkTheme = this.themeService.isDarkTheme();
    this.themeSubscription = this.themeService.currentTheme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'admin';
  }

  toggleCategory(category: string): void {
    this.expandedCategories[category] = !this.expandedCategories[category];
  }
}
