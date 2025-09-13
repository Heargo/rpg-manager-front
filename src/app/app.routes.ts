import { Routes } from '@angular/router';
import { routesAuth } from './modules/authentification/auth.routes';
import { HomePageComponent } from './modules/home/home-page/home-page.component';
import { routesUsers } from './modules/user/starter-kit.routes';
import { NavigationGuard } from './core/guards/navigation.guard';

export const routes: Routes = [
  { path: '', component: HomePageComponent, canActivate: [NavigationGuard] },
  ...routesAuth,
  ...routesUsers,
];
