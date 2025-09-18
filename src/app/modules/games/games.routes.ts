import { Routes } from '@angular/router';
import { GamesPage } from './pages/games/games.page';
import { AuthGuard } from '../../core/guards/auth.guard';

export const routesGames: Routes = [
  {
    path: 'games',
    // canActivate: [AuthGuard],

    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/games/games.page').then((m) => m.GamesPage),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/games-create-update/games-create-update.page').then(
            (m) => m.GamesCreateUpdatePage
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./pages/games-create-update/games-create-update.page').then(
            (m) => m.GamesCreateUpdatePage
          ),
      },
    ],
  },
];
