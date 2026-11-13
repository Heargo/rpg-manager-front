import { Routes } from '@angular/router';
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
    loadComponent: () =>
      import('./pages/world-rules-tool-page/world-rules-tool-page.component').then(
        (m) => m.WorldRulesToolPageComponent,
      ),
  },
  {
    path: 'tools/npc-catalogue',
    canActivate: [NavigationGuard],
    data: { tool: true },
    loadComponent: () =>
      import('./pages/npc-catalogue-tool-page/npc-catalogue-tool-page.component').then(
        (m) => m.NpcCatalogueToolPageComponent,
      ),
  },
  {
    path: 'tools/npc-editor',
    canActivate: [NavigationGuard],
    data: { tool: true },
    loadComponent: () =>
      import('./pages/npc-editor-tool-page/npc-editor-tool-page.component').then(
        (m) => m.NpcEditorToolPageComponent,
      ),
  },
  {
    path: 'tools/npc-editor/:id',
    canActivate: [NavigationGuard],
    data: { tool: true },
    loadComponent: () =>
      import('./pages/npc-editor-tool-page/npc-editor-tool-page.component').then(
        (m) => m.NpcEditorToolPageComponent,
      ),
  },
  {
    path: 'tools/skills',
    canActivate: [NavigationGuard],
    data: { tool: true },
    loadComponent: () =>
      import('./pages/skill-catalogue-tool-page/skill-catalogue-tool-page.component').then(
        (m) => m.SkillCatalogueToolPageComponent,
      ),
  },
  {
    path: 'tools/classes',
    canActivate: [NavigationGuard],
    data: { tool: true },
    loadComponent: () =>
      import('./pages/class-catalogue-tool-page/class-catalogue-tool-page.component').then(
        (m) => m.ClassCatalogueToolPageComponent,
      ),
  },
  {
    path: 'tools/combat',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component').then(
        (m) => m.CombatSandboxToolPageComponent,
      ),
  },
  {
    path: 'tools/sprite-colorizer',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('../sprite/pages/sprite-colorizer-page/sprite-colorizer-page.component').then(
        (m) => m.SpriteColorizerPageComponent,
      ),
  },
  {
    path: 'tools/packs',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/packs-tool-page/packs-tool-page.component').then(
        (m) => m.PacksToolPageComponent,
      ),
  },
  {
    path: 'tools/pack-creator',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/pack-creator-page/pack-creator-page.component').then(
        (m) => m.PackCreatorPageComponent,
      ),
  },
  {
    path: 'tools/pack-creator/:draftId',
    canActivate: [NavigationGuard],
    loadComponent: () =>
      import('./pages/pack-draft-page/pack-draft-page.component').then(
        (m) => m.PackDraftPageComponent,
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
