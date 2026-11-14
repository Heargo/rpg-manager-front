import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { World } from '../../../world/models/world';
import { filterNpcs } from '../../helpers/npc.rules';
import { Npc, NPC_ROLES, NpcRole } from '../../models/npc';
import { NpcCardComponent } from '../npc-card/npc-card.component';

/** A world's NPC catalogue: search and filters, a card per NPC, with duplicate and delete. */
@Component({
  selector: 'app-npc-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    MultiSelectModule,
    NpcCardComponent,
  ],
  template: `
    <div class="toolbar">
      <input
        pInputText
        data-field="search"
        type="search"
        [attr.aria-label]="'npc.catalogue.search' | transloco"
        [placeholder]="'npc.catalogue.search' | transloco"
        [value]="search()"
        (input)="search.set($any($event.target).value)"
        autocomplete="off"
      />
      <p-multiselect
        data-field="roles"
        [options]="roleOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="roles()"
        (ngModelChange)="roles.set($event ?? [])"
        [placeholder]="'npc.catalogue.roles' | transloco"
        [showToggleAll]="false"
        display="chip"
      />
      <p-inputnumber
        data-field="level-min"
        [min]="1"
        [ariaLabel]="'npc.catalogue.levelMin' | transloco"
        [placeholder]="'npc.catalogue.levelMin' | transloco"
        [ngModel]="levelMin()"
        (ngModelChange)="levelMin.set($event)"
      />
      <p-inputnumber
        data-field="level-max"
        [min]="1"
        [ariaLabel]="'npc.catalogue.levelMax' | transloco"
        [placeholder]="'npc.catalogue.levelMax' | transloco"
        [ngModel]="levelMax()"
        (ngModelChange)="levelMax.set($event)"
      />
      <button
        pButton
        type="button"
        data-action="create"
        icon="pi pi-plus"
        [label]="'npc.catalogue.create' | transloco"
        (click)="create.emit()"
      ></button>
    </div>

    @if (shown().length) {
      <div class="grid">
        @for (npc of shown(); track npc.id) {
          <div class="entry">
            <app-npc-card [npc]="npc" [world]="world()" />
            <div class="actions">
              <button
                pButton
                type="button"
                data-action="edit"
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                [attr.aria-label]="'npc.catalogue.edit' | transloco"
                (click)="edit.emit(npc)"
              ></button>
              @if (showControls()) {
                <button
                  pButton
                  type="button"
                  data-action="show"
                  icon="pi pi-eye"
                  severity="secondary"
                  [text]="true"
                  [disabled]="showDisabled()"
                  [attr.aria-label]="'npc.catalogue.show' | transloco"
                  [attr.title]="
                    showDisabled() ? ('npc.catalogue.showDuringCombat' | transloco) : null
                  "
                  (click)="show.emit(npc)"
                ></button>
              }
              <button
                pButton
                type="button"
                data-action="duplicate"
                icon="pi pi-copy"
                severity="secondary"
                [text]="true"
                [label]="'npc.catalogue.duplicate' | transloco"
                (click)="duplicate.emit(npc)"
              ></button>
              <button
                pButton
                type="button"
                data-action="delete"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [attr.aria-label]="'npc.catalogue.delete' | transloco"
                (click)="askDelete(npc)"
              ></button>
            </div>
          </div>
        }
      </div>
    } @else {
      <p class="empty">{{ 'npc.catalogue.empty' | transloco }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    .toolbar p-inputnumber {
      width: 10rem;
    }
    .toolbar p-inputnumber ::ng-deep input {
      width: 100%;
      min-width: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
      gap: 1rem;
    }
    .entry {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .actions {
      display: flex;
      justify-content: space-between;
    }
    .empty {
      color: var(--p-text-muted-color);
    }
  `,
})
export class NpcCatalogueComponent {
  private readonly confirmation = inject(ConfirmationService);
  private readonly language = inject(LanguageBusiness);

  readonly world = input.required<World>();
  /** "Show on the table" can't start an encounter (a combat is running). */
  readonly showDisabled = input(false);
  /** Whether there is a table to show NPCs on (not in the sandbox tool). */
  readonly showControls = input(true);

  readonly create = output<void>();
  readonly edit = output<Npc>();
  readonly duplicate = output<Npc>();
  readonly remove = output<Npc>();
  readonly show = output<Npc>();

  protected readonly search = signal('');
  protected readonly roles = signal<NpcRole[]>([]);
  /** Field values: null means no bound. */
  protected readonly levelMin = signal<number | null>(null);
  protected readonly levelMax = signal<number | null>(null);

  protected readonly shown = computed(() => {
    const min = Math.trunc(this.levelMin() ?? NaN);
    const max = Math.trunc(this.levelMax() ?? NaN);
    return filterNpcs(this.world().npcs, {
      search: this.search(),
      roles: this.roles(),
      minLevel: Number.isNaN(min) ? 0 : min,
      maxLevel: Number.isNaN(max) ? Infinity : max,
    });
  });
  protected readonly roleOptions = computed(() =>
    NPC_ROLES.map((value) => ({
      value,
      label: this.language.t('npc.role.' + value),
    })),
  );

  protected askDelete(npc: Npc): void {
    this.confirmation.confirm({
      header: this.language.t('npc.catalogue.deleteTitle'),
      message: this.language.t('npc.catalogue.deleteMessage', {
        name: npc.name,
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('npc.catalogue.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => this.remove.emit(npc),
    });
  }
}
