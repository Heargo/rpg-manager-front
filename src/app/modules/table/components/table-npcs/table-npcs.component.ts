import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { PublicNpc } from '../../../npc/models/npc';

/** The NPCs the game master shows on the table: only the fields the world's rules let the players see. */
@Component({
  selector: 'app-table-npcs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, StoredImageComponent],
  template: `
    @for (npc of npcs(); track npc.id) {
      <article class="npc" data-testid="table-npc">
        <app-stored-image
          class="portrait"
          [imageId]="npc.portraitId"
          [alt]="npc.name"
        >
          <span class="initial">{{ npc.name.charAt(0).toUpperCase() }}</span>
        </app-stored-image>
        <div class="body">
          <h3>{{ npc.name }}</h3>
          @if (npc.level !== undefined) {
            <span data-field="level">{{
              'character.sheet.levelBadge' | transloco: { level: npc.level }
            }}</span>
          }
          @if (npc.lifeBar; as bar) {
            <div
              class="bar"
              data-field="life-bar"
              [attr.data-percent]="bar.percent"
            >
              <div class="fill" [style.width.%]="bar.percent"></div>
            </div>
          }
          @if (npc.life; as life) {
            <span data-field="life-numbers"
              >{{ life.current }} / {{ life.max }}</span
            >
          }
          @if (npc.description) {
            <p data-field="description">{{ npc.description }}</p>
          }
          @for (attribute of npc.attributes ?? []; track attribute.name) {
            <span data-field="attribute"
              >{{ attribute.name }} {{ attribute.current }} /
              {{ attribute.max }}</span
            >
          }
          @if (npc.equipment; as items) {
            <ul data-field="equipment">
              @for (item of items; track $index) {
                <li>{{ item.name }}</li>
              }
            </ul>
          }
        </div>
      </article>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.75rem;
    }
    .npc {
      display: flex;
      gap: 0.75rem;
      padding: 0.5rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 8px;
      background: var(--p-content-background);
    }
    .portrait {
      flex: none;
      width: 4rem;
      height: 5.5rem;
      border-radius: 6px;
      background: var(--p-content-hover-background);
    }
    .initial {
      display: grid;
      place-items: center;
      height: 100%;
      font-size: 1.5rem;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    h3,
    p,
    ul {
      margin: 0;
    }
    ul {
      padding-left: 1rem;
    }
    .bar {
      height: 0.5rem;
      border-radius: 4px;
      background: var(--p-content-border-color);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: var(--p-red-500);
    }
  `,
})
export class TableNpcsComponent {
  readonly npcs = input<PublicNpc[]>([]);
}
