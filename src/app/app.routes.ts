import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { NavigationGuard } from './core/guards/navigation.guard';
import { HomePageComponent } from './modules/home/home-page/home-page.component';
import { routesProfile } from './modules/profile/profile.routes';

export const routes: Routes = [
  { path: '', component: HomePageComponent, canActivate: [NavigationGuard] },
  ...routesProfile,
  // TEMPORARY dev-only P2P lab (p2p ticket 02), removed in p2p ticket 04.
  ...(isDevMode()
    ? [{ path: 'dev/p2p', loadComponent: () => import('./modules/dev/p2p-lab/p2p-lab.page').then((m) => m.P2pLabPage) }]
    : []),
  { path: '**', redirectTo: '' },
];
