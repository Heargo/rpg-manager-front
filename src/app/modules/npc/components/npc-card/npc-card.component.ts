import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagModule } from '@openng/optimus-ui/tag';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { levelRarity } from '../../../character/helpers/level.rules';
import { RARITY_SEVERITY } from '../../../item/helpers/item-display';
import { SheetWorld } from '../../../character/business/character.business';
import { Npc } from '../../models/npc';

/** An NPC as a small trading card: portrait, name, level badge and role tags. Read-only. */
@Component({
  selector: 'app-npc-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, TagModule, StoredImageComponent],
  template: `
    @let n = npc();
    <article class="card" [attr.aria-labelledby]="'npc-name-' + n.id">
      <app-stored-image
        class="portrait"
        data-testid="card-portrait"
        [imageId]="n.portraitId"
        [fallbackSrc]="n.samplePortrait"
        [alt]="n.name"
      >
        <span class="initial">{{ n.name.charAt(0).toUpperCase() }}</span>
      </app-stored-image>
      <header class="overlay top">
        <h2 data-testid="card-name" [id]="'npc-name-' + n.id">{{ n.name }}</h2>
        <span data-testid="npc-level" [attr.data-rarity]="rarity()">
          <p-tag
            [severity]="severity()"
            [value]="
              'character.sheet.levelBadge' | transloco: { level: n.level }
            "
          />
        </span>
      </header>
      <footer class="overlay bottom">
        @for (role of n.roles; track role) {
          <span data-testid="npc-role" [attr.data-role]="role">
            <p-tag
              severity="secondary"
              [value]="'npc.role.' + role | transloco"
            />
          </span>
        }
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .card {
      position: relative;
      aspect-ratio: 5 / 7;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      border: 2px solid var(--p-primary-color);
      border-radius: 12px;
      background: var(--p-content-background);
      color: #fff;
      box-shadow: 0 0 0 1px var(--p-content-border-color);
    }
    .portrait {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        160deg,
        var(--p-content-hover-background),
        var(--p-primary-100, var(--p-content-background))
      );
    }
    .initial {
      display: grid;
      place-items: center;
      height: 100%;
      font-size: 5rem;
      font-weight: 600;
      color: var(--p-primary-color);
      opacity: 0.6;
    }
    .overlay {
      position: absolute;
      left: 0;
      right: 0;
      display: flex;
      gap: 0.3rem;
      padding: 0.4rem 0.5rem;
      font-size: 0.7rem;
      text-shadow: 0 1px 2px rgb(0 0 0 / 60%);
    }
    .top {
      top: 0;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 1rem;
      background: linear-gradient(to bottom, rgb(0 0 0 / 75%), transparent);
    }
    h2 {
      margin: 0;
      font-size: 0.9rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .bottom {
      bottom: 0;
      flex-wrap: wrap;
      padding-top: 1.2rem;
      background: linear-gradient(to top, rgb(0 0 0 / 85%) 70%, transparent);
    }
  `,
})
export class NpcCardComponent {
  readonly npc = input.required<Npc>();
  readonly world = input.required<Pick<SheetWorld, 'maxLevel'>>();

  protected readonly rarity = computed(() =>
    levelRarity(this.npc().level, this.world().maxLevel),
  );
  protected readonly severity = computed(() => RARITY_SEVERITY[this.rarity()]);
}
