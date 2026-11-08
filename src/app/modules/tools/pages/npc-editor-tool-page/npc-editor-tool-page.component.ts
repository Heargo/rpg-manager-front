import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NpcCatalogueBusiness } from '../../../npc/business/npc-catalogue.business';
import { NpcEditorPageComponent } from '../../../npc/pages/npc-editor-page/npc-editor-page.component';
import { SandboxNpcCatalogueBusiness } from '../../business/sandbox-npc-catalogue.business';

/** Tool: the NPC editor page on the sandbox world, in memory. Saved NPCs show in the sandbox NPC catalogue. */
@Component({
  selector: 'app-npc-editor-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NpcEditorPageComponent],
  providers: [
    { provide: NpcCatalogueBusiness, useClass: SandboxNpcCatalogueBusiness },
  ],
  template: `<app-npc-editor-page />`,
})
export class NpcEditorToolPageComponent {}
