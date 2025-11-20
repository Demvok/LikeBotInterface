import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  
  private readonly THEME_STORAGE_KEY = 'likebot-theme';
  private currentThemeSubject = new BehaviorSubject<Theme>(this.getInitialTheme());
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor() {
    if (this.isBrowser) {
      this.applyTheme(this.currentThemeSubject.value);
    }
  }

  private getInitialTheme(): Theme {
    if (!this.isBrowser) {
      return 'light';
    }

    try {
      const saved = localStorage.getItem(this.THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch (error) {
      console.error('[ThemeService] Error loading theme:', error);
    }

    // Prefer dark theme if system prefers it
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    const newTheme = this.currentThemeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Set specific theme
   */
  setTheme(theme: Theme): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('[ThemeService] Error saving theme:', error);
    }

    this.applyTheme(theme);
    this.currentThemeSubject.next(theme);
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: Theme): void {
    if (!this.isBrowser) {
      return;
    }

    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light';
    }
  }

  /**
   * Check if dark theme is active
   */
  isDarkTheme(): boolean {
    return this.currentThemeSubject.value === 'dark';
  }
}
