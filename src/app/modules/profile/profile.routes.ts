import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';

export const routesProfile: Routes = [
  { path: 'profile', component: ProfilePageComponent, canActivate: [NavigationGuard] },
];
