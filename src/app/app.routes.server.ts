import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'task/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'task/:id/accounts',
    renderMode: RenderMode.Server
  },
  {
    path: 'task/:id/posts',
    renderMode: RenderMode.Server
  },
  {
    path: 'task/:id/report',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
