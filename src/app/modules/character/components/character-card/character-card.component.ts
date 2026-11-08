import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { TagModule } from '@openng/optimus-ui/tag';
import { CoinDisplayComponent } from '../../../../core/components/coin-display/coin-display.component';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { RARITY_SEVERITY } from '../../../item/helpers/item-display';
import { levelRarity } from '../../helpers/level.rules';
import { Character } from '../../../world/models/world';
import {
  CharacterBusiness,
  SheetWorld,
} from '../../business/character.business';

/** A trading-card summary of a character: name, level, portrait, money, stat points, XP and the life/mana bars. Read-only. */
@Component({
  selector: 'app-character-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ProgressBarModule,
    TagModule,
    CoinDisplayComponent,
    StoredImageComponent,
  ],
  templateUrl: './character-card.component.html',
  styleUrl: './character-card.component.scss',
})
export class CharacterCardComponent {
  private readonly characters = inject(CharacterBusiness);

  readonly character = input.required<Character>();
  readonly world = input.required<SheetWorld>();

  protected readonly progress = computed(() =>
    this.characters.progressOf(this.character(), this.world()),
  );
  protected readonly levelRarityName = computed(() =>
    levelRarity(this.character().level, this.world().maxLevel),
  );
  protected readonly levelSeverity = computed(
    () => RARITY_SEVERITY[this.levelRarityName()],
  );
  protected readonly bars = computed(() => {
    const { life, mana } = this.characters.barsOf(
      this.character(),
      this.world(),
    );
    return [
      ...(life ? [{ kind: 'life', stat: life }] : []),
      ...(mana ? [{ kind: 'mana', stat: mana }] : []),
    ];
  });
}
