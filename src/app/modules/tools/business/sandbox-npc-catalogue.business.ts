import { computed, effect, inject, Injectable, untracked } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import {
  addNpcCopy,
  npcSheetView,
  NpcSheetView,
  sampleNpcs,
} from '../../npc/helpers/npc.rules';
import { upsertNpc } from '../../npc/helpers/npc-editor.rules';
import { Npc } from '../../npc/models/npc';
import { SandboxCatalogueBusiness } from './sandbox-catalogue.business';

/**
 * The NPC catalogue page's stand-in for `NpcCatalogueBusiness` in the Tools: edits the shared sandbox world in
 * memory, nothing is saved. Provided by the tool route.
 */
@Injectable()
export class SandboxNpcCatalogueBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);

  private readonly language = inject(LanguageBusiness);

  private readonly items = inject(SandboxCatalogueBusiness);

  /** The sandbox world with the sandbox item catalogue, which NPCs pick their gear from. */
  readonly $world = computed(() => ({
    ...this.sandbox.$world(),
    items: this.items.$world().items,
  }));

  constructor() {
    // The sandbox world starts without NPCs and starts over when the language changes: seed the examples then
    // (not when the NPCs of an earlier visit are still there).
    effect(() => {
      this.language.$language();
      untracked(() => {
        if (this.sandbox.$world().npcs.length) return;
        this.sandbox.updateNpcs(() => sampleNpcs((key) => this.language.t(key)));
      });
    });
  }

  /** A sandbox NPC as a read-only character sheet (bars full); null when it is gone. */
  sheetOf(npcId: string): NpcSheetView | null {
    return npcSheetView(this.$world(), npcId);
  }

  async duplicate(npcId: string): Promise<void> {
    this.sandbox.updateNpcs((npcs) =>
      addNpcCopy(
        npcs,
        npcId,
        () => crypto.randomUUID(),
        ` ${this.language.t('npc.catalogue.copySuffix')}`,
      ),
    );
  }

  async remove(npcId: string): Promise<void> {
    this.sandbox.updateNpcs((npcs) => npcs.filter((npc) => npc.id !== npcId));
  }

  /** Adds the NPC (new id) or replaces it (same id), in memory. */
  async save(input: Omit<Npc, 'id'> & { id?: string }): Promise<Npc> {
    let saved!: Npc;
    this.sandbox.updateNpcs((npcs) => {
      const result = upsertNpc(npcs, input, () => crypto.randomUUID());
      saved = result.npc;
      return result.npcs;
    });
    return saved;
  }
}
