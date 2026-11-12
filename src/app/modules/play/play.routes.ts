import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesPlay: Routes = [
  {
    path: 'play',
    canActivate: [NavigationGuard],
    loadComponent: () => import('./pages/play-page/play-page.component').then((m) => m.PlayPageComponent),
  },
  {
    path: 'play/joined/:worldId',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('../character/pages/joined-world-sheet-page/joined-world-sheet-page.component').then(
        (m) => m.JoinedWorldSheetPageComponent,
      ),
  },
];
