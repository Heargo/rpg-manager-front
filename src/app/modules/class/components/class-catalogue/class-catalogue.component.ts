import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { Skill } from '../../../skill/models/skill';
import { Item } from '../../../world/models/world';
import { filterClasses } from '../../helpers/class.rules';
import { CharacterClass } from '../../models/class';
import { SkillTreeComponent } from '../skill-tree/skill-tree.component';

/** A world's class catalogue: search, a list row per class, with edit, duplicate and delete. */
@Component({
  selector: 'app-class-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    StoredImageComponent,
    SkillTreeComponent,
  ],
  template: `
    <div class="toolbar">
      <input
        pInputText
        data-field="search"
        type="search"
        [attr.aria-label]="'class.catalogue.search' | transloco"
        [placeholder]="'class.catalogue.search' | transloco"
        [value]="search()"
        (input)="search.set($any($event.target).value)"
        autocomplete="off"
      />
      <button
        pButton
        type="button"
        data-action="create"
        icon="pi pi-plus"
        [label]="'class.catalogue.create' | transloco"
        (click)="create.emit()"
      ></button>
      <button
        pButton
        type="button"
        data-action="add-defaults"
        icon="pi pi-plus"
        severity="secondary"
        [label]="'class.catalogue.addDefaults' | transloco"
        (click)="addDefaults.emit()"
      ></button>
    </div>

    @if (shown().length) {
      <ul class="list">
        @for (entry of shown(); track entry.id) {
          <li class="row" data-field="class">
            @if (entry.imageId) {
              <app-stored-image
                class="thumb"
                [imageId]="entry.imageId"
                [alt]="entry.name"
              />
            }
            <div class="main">
              <div class="line">
                <strong data-field="class-name">{{ entry.name }}</strong>
                <span class="meta" data-field="class-bonuses">{{
                  bonusSummary(entry)
                }}</span>
                <span class="meta" data-field="class-skill-count">{{
                  'class.catalogue.skills'
                    | transloco: { count: entry.tree.length }
                }}</span>
              </div>
              <p class="hint">{{ entry.description }}</p>
            </div>
            <div class="actions">
              <button
                pButton
                type="button"
                data-action="view"
                icon="pi pi-eye"
                severity="secondary"
                size="small"
                [label]="'class.catalogue.view' | transloco"
                (click)="viewing.set(entry)"
              ></button>
              <button
                pButton
                type="button"
                data-action="edit"
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                [attr.aria-label]="'class.catalogue.edit' | transloco"
                (click)="edit.emit(entry)"
              ></button>
              <button
                pButton
                type="button"
                data-action="duplicate"
                icon="pi pi-copy"
                severity="secondary"
                [text]="true"
                [attr.aria-label]="'class.catalogue.duplicate' | transloco"
                (click)="duplicate.emit(entry)"
              ></button>
              <button
                pButton
                type="button"
                data-action="delete"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [attr.aria-label]="'class.catalogue.delete' | transloco"
                (click)="askDelete(entry)"
              ></button>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="hint">{{ 'class.catalogue.empty' | transloco }}</p>
    }

    <p-dialog
      [visible]="!!viewing()"
      (visibleChange)="$event || viewing.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [header]="'class.catalogue.detailsTitle' | transloco"
      [style]="{ width: '48rem', maxWidth: '96vw' }"
    >
      @if (viewing(); as details) {
        <div class="details" data-field="class-details">
          <div class="identity">
            @if (details.imageId) {
              <app-stored-image
                class="portrait"
                [imageId]="details.imageId"
                [alt]="details.name"
              />
            }
            <div class="text">
              <h2 data-field="details-name">{{ details.name }}</h2>
              <p class="description" data-field="details-description">
                {{ details.description }}
              </p>
            </div>
          </div>

          @if (details.bonuses?.length) {
            <section>
              <h3>{{ 'class.catalogue.bonuses' | transloco }}</h3>
              <ul class="chips">
                @for (bonus of details.bonuses; track bonus.attribute) {
                  <li class="chip" data-field="details-bonus">
                    {{ bonus.attribute }}
                    <strong
                      >{{ bonus.value > 0 ? '+' : '' }}{{ bonus.value }}</strong
                    >
                  </li>
                }
              </ul>
            </section>
          }

          @if (startingItems().length) {
            <section>
              <h3>{{ 'class.catalogue.startingItems' | transloco }}</h3>
              <ul class="chips">
                @for (item of startingItems(); track item) {
                  <li class="chip" data-field="details-item">{{ item }}</li>
                }
              </ul>
            </section>
          }

          <section>
            <h3>{{ 'class.catalogue.tree' | transloco }}</h3>
            <app-skill-tree
              class="tree"
              [tree]="details.tree"
              [skills]="skills()"
              (nodeSelected)="scrollToSkill($event)"
            />
          </section>

          <section>
            <h3>{{ 'class.catalogue.skillList' | transloco }}</h3>
            <div class="skill-list">
              @for (skill of viewedSkills(); track skill.id) {
                <article class="skill" [attr.data-skill]="skill.id">
                  <header>
                    <strong>{{ skill.name }}</strong>
                    <span class="hint">{{
                      'class.catalogue.maxRank'
                        | transloco: { count: skill.maxRank }
                    }}</span>
                  </header>
                  <p class="hint">{{ skill.description }}</p>
                </article>
              }
            </div>
          </section>
        </div>
      }
    </p-dialog>
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
    /* one card per entry, so a long list keeps some relief */
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.75rem;
      background: var(--p-content-background);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .row:hover {
      border-color: var(--p-primary-color);
      box-shadow: 0 3px 10px rgb(0 0 0 / 0.12);
    }
    .thumb {
      flex: none;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.4rem;
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.75rem;
    }
    .meta {
      color: var(--p-text-muted-color);
      font-size: 0.85rem;
    }
    .actions {
      flex: none;
      display: flex;
      align-items: center;
    }
    .main .hint {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .details {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-height: 70vh;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .identity {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .portrait {
      flex: none;
      width: 6rem;
      height: 6rem;
      border-radius: 0.75rem;
    }
    h2,
    h3 {
      margin: 0;
    }
    h3 {
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-text-muted-color);
    }
    .description {
      margin: 0.25rem 0 0;
      white-space: pre-line;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .chip {
      padding: 0.15rem 0.65rem;
      border-radius: 999px;
      background: var(--p-highlight-background);
      color: var(--p-primary-color);
    }
    .tree {
      padding: 0.5rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.75rem;
      max-width: 100%;
    }
    .skill-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .skill {
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.6rem;
    }
    .skill header {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class ClassCatalogueComponent {
  private readonly confirmation = inject(ConfirmationService);
  private readonly language = inject(LanguageBusiness);

  private readonly document = inject(DOCUMENT);

  readonly classes = input.required<CharacterClass[]>();
  /** The world's skill catalogue, to draw the trees and describe the skills. */
  readonly skills = input<Skill[]>([]);
  /** The world's item catalogue, to name the starting items. */
  readonly items = input<Item[]>([]);

  readonly create = output<void>();
  readonly addDefaults = output<void>();
  readonly edit = output<CharacterClass>();
  readonly duplicate = output<CharacterClass>();
  readonly remove = output<CharacterClass>();

  protected readonly search = signal('');
  /** The class whose details are open. */
  protected readonly viewing = signal<CharacterClass | null>(null);

  protected readonly startingItems = computed(() =>
    (this.viewing()?.startingItems ?? []).map(
      (id) => this.items().find((item) => item.id === id)?.name ?? id,
    ),
  );
  protected readonly viewedSkills = computed(() => {
    const skills = this.skills();
    return (this.viewing()?.tree ?? []).flatMap((node) => {
      const skill = skills.find((entry) => entry.id === node.skillId);
      return skill ? [skill] : [];
    });
  });

  protected readonly shown = computed(() =>
    filterClasses(this.classes(), { search: this.search() }),
  );

  protected bonusSummary(entry: CharacterClass): string {
    return (entry.bonuses ?? [])
      .map((b) => `${b.attribute} ${b.value > 0 ? '+' : ''}${b.value}`)
      .join(', ');
  }

  protected askDelete(entry: CharacterClass): void {
    this.confirmation.confirm({
      header: this.language.t('class.catalogue.deleteTitle'),
      message: this.language.t('class.catalogue.deleteMessage', {
        name: entry.name,
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('class.catalogue.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => this.remove.emit(entry),
    });
  }

  protected scrollToSkill(skillId: string): void {
    this.document
      .querySelector(
        `[data-field="class-details"] [data-skill="${CSS.escape(skillId)}"]`,
      )
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
