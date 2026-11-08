import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesNpc: Routes = [
  {
    path: 'room/npcs',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/npc-catalogue-page/npc-catalogue-page.component').then(
        (m) => m.NpcCataloguePageComponent,
      ),
  },
  {
    path: 'room/npcs/editor',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/npc-editor-page/npc-editor-page.component').then(
        (m) => m.NpcEditorPageComponent,
      ),
  },
  {
    path: 'room/npcs/editor/:id',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/npc-editor-page/npc-editor-page.component').then(
        (m) => m.NpcEditorPageComponent,
      ),
  },
];
