import { Routes } from '@angular/router';

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
      {
        path: ':id/dashboard/gm',
        loadComponent: () =>
          import('./pages/game-master-dashboard/game-master-dashboard').then(
            (m) => m.GameMasterDashboard
          ),
      },
      {
        path: ':id/dashboard/player',
        loadComponent: () =>
          import('./pages/player-dashboard/player-dashboard').then(
            (m) => m.PlayerDashboard
          ),
      },
    ],
  },
];
