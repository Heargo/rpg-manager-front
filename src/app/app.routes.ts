import { Routes } from '@angular/router';
import { routesAuth } from './modules/authentification/auth.routes';
import { HomePageComponent } from './modules/home/home-page/home-page.component';
import { routesUsers } from './modules/user/user.routes';
import { routesGames } from './modules/games/games.routes';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  ...routesAuth,
  ...routesUsers,
  ...routesGames,
];
