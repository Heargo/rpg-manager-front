import { effect, inject, Injectable, untracked } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { addNpcCopy, sampleNpcs } from '../../npc/helpers/npc.rules';

/**
 * The NPC catalogue page's stand-in for `NpcCatalogueBusiness` in the Tools: edits the shared sandbox world in
 * memory, nothing is saved. Provided by the tool route.
 */
@Injectable()
export class SandboxNpcCatalogueBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);

  private readonly language = inject(LanguageBusiness);

  readonly $world = this.sandbox.$world;

  constructor() {
    // The sandbox world starts without NPCs and starts over when the language changes: seed the examples then.
    effect(() => {
      this.language.$language();
      untracked(() =>
        this.sandbox.updateNpcs(() =>
          sampleNpcs((key) => this.language.t(key)),
        ),
      );
    });
  }

  async duplicate(npcId: string): Promise<void> {
    this.sandbox.updateNpcs((npcs) =>
      addNpcCopy(npcs, npcId, () => crypto.randomUUID()),
    );
  }

  async remove(npcId: string): Promise<void> {
    this.sandbox.updateNpcs((npcs) => npcs.filter((npc) => npc.id !== npcId));
  }
}
