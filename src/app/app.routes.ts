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
import { CreateTaskStage1 } from './pages/tasks/create-task/create-task-stage-1/create-task-stage-1';
import { CreateTaskStage2 } from './pages/tasks/create-task/create-task-stage-2/create-task-stage-2';
import { CreateTaskStage3 } from './pages/tasks/create-task/create-task-stage-3/create-task-stage-3';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'posts', component: Posts },
  { path: 'accounts', component: Accounts },
  { path: 'tasks', component: Tasks },
  { path: 'logs', component: Logs },
  { path: 'settings', component: Settings },
  { path: 'task/:id', component: Info },
  { path: 'task/:id/posts', component: PostsDetailed },
  { path: 'task/:id/accounts', component: AccountsDetailed },
  { path: 'task/:id/report', component: Report },
  { path: 'tasks/create', component: CreateTaskStage1 },
  { path: 'tasks/create/1', component: CreateTaskStage1 },
  { path: 'tasks/create/2', component: CreateTaskStage2 },
  { path: 'tasks/create/3', component: CreateTaskStage3 },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export default provideRouter(routes);
