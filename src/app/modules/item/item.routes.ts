import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesItem: Routes = [
  {
    path: 'room/items',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/item-catalogue-page/item-catalogue-page.component').then(
        (m) => m.ItemCataloguePageComponent,
      ),
  },
];
