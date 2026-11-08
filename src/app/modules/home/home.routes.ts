import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

/** Landing and static pages, all lazy so they stay out of the initial bundle. */
export const routesHome: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'credits',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/credits-page.component').then(
        (m) => m.CreditsPageComponent,
      ),
  },
  {
    path: 'contact',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/contact-page.component').then(
        (m) => m.ContactPageComponent,
      ),
  },
  {
    path: 'privacy-policy',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/privacy-page.component').then(
        (m) => m.PrivacyPageComponent,
      ),
  },
];
