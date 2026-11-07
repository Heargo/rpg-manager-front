import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesCharacter: Routes = [
  {
    path: 'room/character',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/create-character-page/create-character-page.component').then((m) => m.CreateCharacterPageComponent),
  },
];
