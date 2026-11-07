import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesDice: Routes = [
  {
    path: 'dice',
    canActivate: [NavigationGuard],
    loadComponent: () => import('./pages/dice-page/dice-page.component').then((m) => m.DicePageComponent),
  },
];
