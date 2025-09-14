import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Posts } from './pages/posts/posts';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'posts', component: Posts },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];
