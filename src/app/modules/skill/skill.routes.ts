import { Routes } from '@angular/router';
import { NavigationGuard } from '../../core/guards/navigation.guard';

export const routesSkill: Routes = [
  {
    path: 'room/skills',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/skill-catalogue-page/skill-catalogue-page.component').then(
        (m) => m.SkillCataloguePageComponent,
      ),
  },
];
