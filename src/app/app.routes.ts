import { Routes } from '@angular/router';
import { NavigationGuard } from './core/guards/navigation.guard';
import { HomePageComponent } from './modules/home/home-page/home-page.component';
import { routesProfile } from './modules/profile/profile.routes';

export const routes: Routes = [
  { path: '', component: HomePageComponent, canActivate: [NavigationGuard] },
  ...routesProfile,
  { path: '**', redirectTo: '' },
];
