import { Routes } from '@angular/router';
import { NavigationGuard } from './core/guards/navigation.guard';
import { HomePageComponent } from './modules/home/home-page/home-page.component';
import { routesProfile } from './modules/profile/profile.routes';
import { routesRoom } from './modules/room/room.routes';
import { routesPlay } from './modules/play/play.routes';
import { routesWorld } from './modules/world/world.routes';
import { routesCharacter } from './modules/character/character.routes';
import { routesDice } from './modules/dice/dice.routes';
import { routesTable } from './modules/table/table.routes';

export const routes: Routes = [
  { path: '', component: HomePageComponent, canActivate: [NavigationGuard] },
  ...routesProfile,
  ...routesPlay,
  ...routesCharacter,
  ...routesTable,
  ...routesRoom,
  ...routesWorld,
  ...routesDice,
  { path: '**', redirectTo: '' },
];
