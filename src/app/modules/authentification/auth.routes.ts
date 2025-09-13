import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { NavigationGuard } from '../../core/guards/navigation.guard';
import { RegisterPageComponent } from './pages/register-page/register-page.component';

export const routesAuth: Routes = [
  {
    path: 'auth',
    canActivate: [NavigationGuard],
    children: [
      { path: 'login', component: LoginPageComponent },
      { path: 'register', component: RegisterPageComponent },
    ],
  },
];
