import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesRoom: Routes = [
  {
    path: 'room',
    canActivate: [NavigationGuard],
    loadComponent: () => import('./pages/room-page/room-page.component').then((m) => m.RoomPageComponent),
  },
  {
    path: 'join',
    canActivate: [NavigationGuard],
    loadComponent: () => import('./pages/join-page/join-page.component').then((m) => m.JoinPageComponent),
  },
];
