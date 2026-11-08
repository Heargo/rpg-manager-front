import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesClass: Routes = [
  {
    path: 'room/classes',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/class-catalogue-page/class-catalogue-page.component').then(
        (m) => m.ClassCataloguePageComponent,
      ),
  },
];
