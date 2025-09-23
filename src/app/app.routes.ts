import { provideRouter, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Posts } from './pages/posts/posts';
import { Accounts } from './pages/accounts/accounts';
import { Tasks } from './pages/tasks/tasks';
import { Logs } from './pages/logs/logs';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'posts', component: Posts },
  { path: 'accounts', component: Accounts },
  { path: 'tasks', component: Tasks },
  { path: 'logs', component: Logs },
  { path: 'settings', component: Settings },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export default provideRouter(routes);
