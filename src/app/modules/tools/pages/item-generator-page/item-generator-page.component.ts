import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { LanguageBusiness } from '../../../../core/business/language.business';
import {
  EQUIPMENT_SLOTS,
  ITEM_RARITIES,
  ITEM_TYPES,
} from '../../../../core/models/item';
import { ItemCardComponent } from '../../../item/components/item-card/item-card.component';
import {
  ItemGeneratorBusiness,
  SEED_MAX_LENGTH,
} from '../../business/item-generator.business';

/** Tool: draw random items on the sandbox world, with a seed to get one back. */
@Component({
  selector: 'app-item-generator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    ItemCardComponent,
  ],
  template: `
    <div class="main-container generator">
      <header>
        <h1>{{ 'tools.itemGenerator.title' | transloco }}</h1>
        <p class="hint">
          {{
            'tools.itemGenerator.intro'
              | transloco
                : { attributes: generator.$attributeNames().join(', ') }
          }}
        </p>
      </header>

      <p-card>
        <div class="options">
          <div class="field">
            <label for="gen-rarity">{{
              'item.fields.rarity' | transloco
            }}</label>
            <p-select
              inputId="gen-rarity"
              [options]="rarities()"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              [placeholder]="'tools.itemGenerator.random' | transloco"
              [ngModel]="generator.$rarity()"
              (ngModelChange)="generator.$rarity.set($event ?? null)"
            />
          </div>
          <div class="field">
            <label for="gen-type">{{ 'item.fields.type' | transloco }}</label>
            <p-select
              inputId="gen-type"
              [options]="types()"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              [placeholder]="'tools.itemGenerator.random' | transloco"
              [ngModel]="generator.$type()"
              (ngModelChange)="generator.$type.set($event ?? null)"
            />
          </div>
          <div class="field">
            <label for="gen-slot">{{ 'item.fields.slot' | transloco }}</label>
            <p-select
              inputId="gen-slot"
              [options]="slots()"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              [disabled]="!generator.$slotEnabled()"
              [placeholder]="'tools.itemGenerator.random' | transloco"
              [ngModel]="generator.$slot()"
              (ngModelChange)="generator.$slot.set($event ?? null)"
            />
          </div>
        </div>
        <form class="seed" (ngSubmit)="generator.setSeed(seedText.value)">
          <div class="field">
            <label for="gen-seed">{{
              'tools.itemGenerator.seed' | transloco
            }}</label>
            <input
              #seedText
              pInputText
              id="gen-seed"
              [attr.maxlength]="seedMax"
              [value]="generator.$seed()"
              (change)="generator.setSeed(seedText.value)"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <p-button
            icon="pi pi-refresh"
            [label]="'tools.itemGenerator.reroll' | transloco"
            (onClick)="generator.reroll()"
          />
        </form>
        <small class="hint">{{
          'tools.itemGenerator.seedHint' | transloco
        }}</small>
      </p-card>

      @if (generator.$failed()) {
        <p-message severity="error">{{
          'tools.itemGenerator.failed' | transloco
        }}</p-message>
      } @else if (generator.$item(); as item) {
        <app-item-card [item]="item" />
      } @else {
        <p-skeleton height="12rem" />
      }
    </div>
  `,
  styles: `
    .generator {
      max-width: 40rem;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      margin: 0;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
    .options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .seed {
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }
    .seed .field {
      flex: 1;
      min-width: 10rem;
    }
    #gen-seed {
      font-family: monospace;
    }
  `,
})
export class ItemGeneratorPageComponent {
  protected readonly generator = inject(ItemGeneratorBusiness);
  private readonly language = inject(LanguageBusiness);
  protected readonly seedMax = SEED_MAX_LENGTH;

  protected readonly rarities = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t(`item.rarity.${value}`),
    })),
  );
  protected readonly types = computed(() =>
    ITEM_TYPES.map((value) => ({
      value,
      label: this.language.t(`item.type.${value}`),
    })),
  );
  protected readonly slots = computed(() =>
    EQUIPMENT_SLOTS.map((value) => ({
      value,
      label: this.language.t(`item.slot.${value}`),
    })),
  );
}
