import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

/** Tools work without a world or a room. */
export const routesTools: Routes = [
  {
    path: 'tools/item-generator',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/item-generator-page/item-generator-page.component').then(
        (m) => m.ItemGeneratorPageComponent,
      ),
  },
  {
    path: 'tools/links',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/external-tools-page/external-tools-page.component').then(
        (m) => m.ExternalToolsPageComponent,
      ),
  },
];
