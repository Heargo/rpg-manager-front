import { Routes } from '@angular/router';

export const charactersRoutes: Routes = [
  {
    path: 'characters',
    children: [
      {
        path: 'create',
        loadComponent: () =>
          import(
            './pages/character-create-update/character-create-update'
          ).then((m) => m.CharacterCreateUpdate),
      },
      {
        path: ':id',
        loadComponent: () =>
          import(
            './pages/character-create-update/character-create-update'
          ).then((m) => m.CharacterCreateUpdate),
      },
      {
        path: ':id/update',
        loadComponent: () =>
          import(
            './pages/character-create-update/character-create-update'
          ).then((m) => m.CharacterCreateUpdate),
      },
    ],
  },
];
