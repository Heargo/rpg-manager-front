import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NpcCatalogueBusiness } from '../../../npc/business/npc-catalogue.business';
import { NpcCataloguePageComponent } from '../../../npc/pages/npc-catalogue-page/npc-catalogue-page.component';
import { SandboxNpcCatalogueBusiness } from '../../business/sandbox-npc-catalogue.business';

/** Tool: the NPC catalogue page on the sandbox world, in memory. Nothing is saved. */
@Component({
  selector: 'app-npc-catalogue-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NpcCataloguePageComponent],
  providers: [
    { provide: NpcCatalogueBusiness, useClass: SandboxNpcCatalogueBusiness },
  ],
  template: `<app-npc-catalogue-page />`,
})
export class NpcCatalogueToolPageComponent {}
