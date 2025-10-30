import { provideRouter, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Posts } from './pages/posts/posts';
import { Accounts } from './pages/accounts/accounts';
import { Tasks } from './pages/tasks/tasks';
import { Logs } from './pages/logs/logs';
import { Settings } from './pages/settings/settings';
import { Info } from './pages/task-detailed/info/info';
import { Posts as PostsDetailed} from './pages/task-detailed/posts/posts';
import { Accounts as AccountsDetailed } from './pages/task-detailed/accounts/accounts';
import { Report } from './pages/task-detailed/report/report';
import { CreateTaskMain } from './pages/tasks/create-task/create-task-main/create-task-main';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public routes
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  
  // Protected routes
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'posts', component: Posts, canActivate: [authGuard] },
  { path: 'accounts', component: Accounts, canActivate: [authGuard] },
  { path: 'tasks', component: Tasks, canActivate: [authGuard] },
  { path: 'logs', component: Logs, canActivate: [authGuard] },
  { path: 'settings', component: Settings, canActivate: [authGuard] },
  { path: 'task/:id', component: Info, canActivate: [authGuard] },
  { path: 'task/:id/posts', component: PostsDetailed, canActivate: [authGuard] },
  { path: 'task/:id/accounts', component: AccountsDetailed, canActivate: [authGuard] },
  { path: 'task/:id/report', component: Report, canActivate: [authGuard] },
  { path: 'tasks/create', component: CreateTaskMain, canActivate: [authGuard] },
  
  // Default redirect to login
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

export default provideRouter(routes);
