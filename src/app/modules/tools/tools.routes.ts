import { Routes } from '@angular/router';
import { WorldSessionBusiness } from '../world/business/world-session.business';
import { SandboxRulesBusiness } from './business/sandbox-rules.business';
import { NavigationGuard } from '../../core/guards/navigation.guard';

/** Tools work without a world or a room. */
export const routesTools: Routes = [
  {
    path: 'tools/item-generator',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/item-generator-page/item-generator-page.component').then(
        (m) => m.ItemGeneratorPageComponent,
      ),
  },
  {
    path: 'tools/item-catalogue',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/item-catalogue-tool-page/item-catalogue-tool-page.component').then(
        (m) => m.ItemCatalogueToolPageComponent,
      ),
  },
  {
    path: 'tools/item-editor',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/item-editor-tool-page/item-editor-tool-page.component').then(
        (m) => m.ItemEditorToolPageComponent,
      ),
  },
  {
    path: 'tools/character-sheet',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/sheet-tool-page/sheet-tool-page.component').then(
        (m) => m.SheetToolPageComponent,
      ),
  },
  {
    path: 'tools/world-rules',
    canActivate: [NavigationGuard],
    providers: [{ provide: WorldSessionBusiness, useClass: SandboxRulesBusiness }],
    loadComponent: () =>
      import('../world/pages/world-rules-page/world-rules-page.component').then(
        (m) => m.WorldRulesPageComponent,
      ),
  },
  {
    path: 'tools/links',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/external-tools-page/external-tools-page.component').then(
        (m) => m.ExternalToolsPageComponent,
      ),
  },
];
