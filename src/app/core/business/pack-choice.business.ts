import { computed, inject, Injectable, resource, Signal } from '@angular/core';
import { PackGenerator } from '../packs/pack';
import { choosePack, RANDOM_PACK } from '../packs/pack-choice';
import { ActivePacksBusiness } from './active-packs.business';
import { LanguageBusiness } from './language.business';
import { basePackId, PackBusiness } from './pack.business';

export type PackChoiceContent = PackGenerator;

export interface PackChoiceOption {
  value: string;
  label: string;
}

/** The pack select of the generators: its options (Random, then the packs with content) and the pack a seed gives. */
@Injectable({ providedIn: 'root' })
export class PackChoiceBusiness {
  private readonly packs = inject(PackBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly activePacks = inject(ActivePacksBusiness);

  /** Options of the select for a generator; call from an injection context (a component field). */
  options(content: PackChoiceContent): Signal<PackChoiceOption[]> {
    const candidates = resource({
      params: () => ({
        lang: this.language.$language(),
        world: this.activePacks.$worldPacks(),
        installed: this.packs.$installed(),
      }),
      loader: ({ params }) => this.packs.packsFor(content),
    });
    return computed(() => {
      const lang = this.language.$language();
      const names = new Map(
        this.packs.$installed().map((p) => [p.id, p.name || p.id]),
      );
      const ids = candidates.hasValue() ? candidates.value() : [basePackId(lang)];
      return [
        { value: RANDOM_PACK, label: this.language.t('packs.choiceRandom') },
        ...ids.map((id) => ({ value: id, label: names.get(id) ?? id })),
      ];
    });
  }

  /** The pack to draw from for a choice (a pack id or `'random'`) and a seed. */
  async resolve(
    content: PackChoiceContent,
    choice: string,
    seed: string,
  ): Promise<string> {
    return choosePack(
      await this.packs.packsFor(content),
      choice,
      seed,
    );
  }
}
