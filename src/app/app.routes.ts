import { Routes } from '@angular/router';
import { routesHome } from './modules/home/home.routes';
import { routesProfile } from './modules/profile/profile.routes';
import { routesRoom } from './modules/room/room.routes';
import { routesPlay } from './modules/play/play.routes';
import { routesWorld } from './modules/world/world.routes';
import { routesCharacter } from './modules/character/character.routes';
import { routesDice } from './modules/dice/dice.routes';
import { routesTable } from './modules/table/table.routes';
import { routesItem } from './modules/item/item.routes';
import { routesTools } from './modules/tools/tools.routes';
import { routesNpc } from './modules/npc/npc.routes';

export const routes: Routes = [
  ...routesHome,
  ...routesProfile,
  ...routesPlay,
  ...routesCharacter,
  ...routesTable,
  ...routesRoom,
  ...routesWorld,
  ...routesDice,
  ...routesItem,
  ...routesNpc,
  ...routesTools,
  { path: '**', redirectTo: '' },
];
