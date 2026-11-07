import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesTable: Routes = [
  {
    path: 'room/table',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/table-page/table-page.component').then(
        (m) => m.TablePageComponent,
      ),
  },
];
