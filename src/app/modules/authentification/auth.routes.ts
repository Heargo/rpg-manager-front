import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesAuth: Routes = [
  {
    path: 'auth',
    canActivate: [NavigationGuard],
    children: [
      { path: 'login', component: LoginPageComponent },
      // { path: 'register', component: RegisterPageComponent },
    ],
  },
];
