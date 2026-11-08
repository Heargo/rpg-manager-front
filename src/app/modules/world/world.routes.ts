import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesWorld: Routes = [
  {
    path: 'worlds/new',
    canActivate: [NavigationGuard],
    loadComponent: () => import('./pages/world-new-page/world-new-page.component').then((m) => m.WorldNewPageComponent),
  },
  {
    path: 'room/rules',
    canActivate: [NavigationGuard],
    loadComponent: () => import('./pages/world-rules-page/world-rules-page.component').then((m) => m.WorldRulesPageComponent),
  },
];
