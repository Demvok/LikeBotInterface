import { provideRouter, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Posts } from './pages/posts/posts';
import { Tasks } from './pages/tasks/tasks';

export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'posts', component: Posts },
  { path: 'tasks', component: Tasks },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export default provideRouter(routes);
