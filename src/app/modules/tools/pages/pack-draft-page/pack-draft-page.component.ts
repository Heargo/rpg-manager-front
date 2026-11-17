import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  PendingTasks,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import {
  FileUploadHandlerEvent,
  FileUploadModule,
} from '@openng/optimus-ui/fileupload';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { PanelModule } from '@openng/optimus-ui/panel';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import {
  DraftIssue,
  KnownKeys,
  PackDraftFormBusiness,
} from '../../../../core/business/pack-draft-form.business';
import { CommonWordsEditorComponent } from '../../components/pack-draft/common-words-editor/common-words-editor.component';
import { DomainKindsEditorComponent } from '../../components/pack-draft/domain-kinds-editor/domain-kinds-editor.component';
import { DomainTextsEditorComponent } from '../../components/pack-draft/domain-texts-editor/domain-texts-editor.component';
import { KindsEditorComponent } from '../../components/pack-draft/kinds-editor/kinds-editor.component';
import { ParamsEditorComponent } from '../../components/pack-draft/params-editor/params-editor.component';
import { TemplatesEditorComponent } from '../../components/pack-draft/templates-editor/templates-editor.component';
import { TintsEditorComponent } from '../../components/pack-draft/tints-editor/tints-editor.component';
import { kindOptions } from '../../../../core/packs/kind-label';
import { SUPPORTED_LANGUAGES } from '../../../../core/constants/languages';
import { downloadBlob } from '../../../../core/helpers/download';
import { MessageLevel } from '../../../../core/models/toast-level';
import {
  PACK_GENERATORS,
  PackGenerator,
  SPRITE_KINDS,
} from '../../../../core/packs/pack';
import {
  DraftDetails,
  DraftSprite,
  PackDraft,
  slugifyPackId,
} from '../../../../core/packs/pack-draft';
import { STRUCTURED_DOMAINS } from '../../../../core/packs/pack-draft-edits';
import { SpriteSet } from '../../../sprite/models/sprite-set';

type Tab =
  | 'details'
  | 'common'
  | 'items'
  | 'npcs'
  | 'skills'
  | 'classes'
  | 'sprites'
  | 'publish';

const LIST_TABS: readonly Tab[] = [
  'common',
  'items',
  'npcs',
  'skills',
  'classes',
];

const SAVE_DELAY_MS = 500;
/** Sprites shown per page: a row holds three selects, so all of them at once freezes the editor. */
const SPRITES_PER_PAGE = 12;

/** The pack editor: details, word lists, sprites, then install or export. Changes are saved as they are made. */
@Component({
  selector: 'app-pack-draft-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    FileUploadModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    CommonWordsEditorComponent,
    DomainKindsEditorComponent,
    DomainTextsEditorComponent,
    KindsEditorComponent,
    PanelModule,
    PaginatorModule,
    ParamsEditorComponent,
    SelectModule,
    TemplatesEditorComponent,
    TintsEditorComponent,
    TabsModule,
    TextareaModule,
  ],
  template: `
    <div class="main-container draft">
      <header>
        <h1>{{ 'packs.creator.editTitle' | translate }}</h1>
        <a routerLink="/tools/pack-creator">{{
          'packs.creator.backToDrafts' | translate
        }}</a>
      </header>
      @if (draft(); as current) {
        <ng-template #advanced let-generator>
          <section class="list">
            <p-panel
              [header]="'packs.creator.lists.advanced' | translate"
              [toggleable]="true"
              [collapsed]="true"
            >
              <p class="hint">
                {{ 'packs.creator.lists.advancedHint' | translate }}
              </p>
              <section class="list">
                <h3>{{ 'packs.generator.' + generator | translate }}</h3>
                <textarea
                  pTextarea
                  class="json"
                  rows="6"
                  [attr.data-test]="'wordlist-' + generator"
                  [attr.aria-label]="'packs.generator.' + generator | translate"
                  [ngModel]="text(generator)"
                  (ngModelChange)="setText(generator, $event)"
                ></textarea>
                @if (listErrors(generator); as errors) {
                  <ul
                    class="errors"
                    [attr.data-test]="'wordlist-error-' + generator"
                  >
                    @for (error of errors; track error) {
                      <li>{{ error }}</li>
                    }
                  </ul>
                }
                <div class="actions">
                  <p-fileupload
                    mode="basic"
                    accept=".json,application/json"
                    [auto]="true"
                    [customUpload]="true"
                    chooseIcon="pi pi-upload"
                    [chooseLabel]="'packs.creator.importFile' | translate"
                    (uploadHandler)="importFile(generator, $event)"
                  />
                  <p-button
                    severity="secondary"
                    icon="pi pi-copy"
                    [label]="'packs.creator.copyBase' | translate"
                    (onClick)="copyBase(generator)"
                  />
                  <p-button
                    severity="secondary"
                    outlined
                    icon="pi pi-times"
                    [label]="'packs.creator.clear' | translate"
                    (onClick)="setText(generator, '')"
                  />
                </div>
              </section>
            </p-panel>
          </section>
        </ng-template>
        <p-tabs [value]="tab()" (valueChange)="tab.set($any($event))">
          <p-tablist>
            <p-tab value="details">{{
              'packs.creator.tabs.details' | translate
            }}</p-tab>
            @if (current.details.language !== undefined) {
              <p-tab value="common">{{
                'packs.creator.tabs.common' | translate
              }}</p-tab>
            }
            <p-tab value="items">{{
              'packs.generator.items' | translate
            }}</p-tab>
            @for (domain of structuredDomains; track domain) {
              <p-tab [value]="domain">{{
                'packs.generator.' + domain | translate
              }}</p-tab>
            }
            <p-tab value="sprites">{{
              'packs.creator.tabs.sprites' | translate
            }}</p-tab>
            <p-tab value="publish">{{
              'packs.creator.tabs.publish' | translate
            }}</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="details">
              <div class="form">
                <label for="draft-language">{{
                  'packs.creator.language' | translate
                }}</label>
                <p-select
                  inputId="draft-language"
                  data-test="draft-language"
                  [options]="languageOptions"
                  optionLabel="label"
                  optionValue="code"
                  [ngModel]="current.details.language"
                  (ngModelChange)="patchDetails({ language: $event })"
                />
                <label for="draft-name">{{
                  'packs.creator.name' | translate
                }}</label>
                <input
                  pInputText
                  id="draft-name"
                  data-test="draft-name"
                  type="text"
                  [ngModel]="current.details.name"
                  (ngModelChange)="setName($event)"
                />
                <label for="draft-id">{{
                  'packs.creator.packId' | translate
                }}</label>
                <div class="stack">
                  <input
                    pInputText
                    id="draft-id"
                    data-test="draft-id"
                    type="text"
                    [ngModel]="current.details.id"
                    (ngModelChange)="patchDetails({ id: $event })"
                  />
                  <small class="hint">{{
                    'packs.creator.packIdHint' | translate
                  }}</small>
                  @if (idWarning(); as warning) {
                    <p-message data-test="draft-id-warning" severity="warn">{{
                      'packs.creator.idWarning.' + warning | translate
                    }}</p-message>
                  }
                </div>
                <label for="draft-description">{{
                  'packs.creator.description' | translate
                }}</label>
                <textarea
                  pTextarea
                  id="draft-description"
                  data-test="draft-description"
                  rows="3"
                  [ngModel]="current.details.description"
                  (ngModelChange)="patchDetails({ description: $event })"
                ></textarea>
                <label for="draft-version">{{
                  'packs.creator.version' | translate
                }}</label>
                <input
                  pInputText
                  id="draft-version"
                  data-test="draft-version"
                  type="text"
                  [ngModel]="current.details.version"
                  (ngModelChange)="patchDetails({ version: $event })"
                />
                <label for="draft-author">{{
                  'packs.creator.author' | translate
                }}</label>
                <input
                  pInputText
                  id="draft-author"
                  data-test="draft-author"
                  type="text"
                  [ngModel]="current.details.author"
                  (ngModelChange)="patchDetails({ author: $event })"
                />
                <label for="draft-license">{{
                  'packs.creator.license' | translate
                }}</label>
                <input
                  pInputText
                  id="draft-license"
                  data-test="draft-license"
                  type="text"
                  [ngModel]="current.details.license"
                  (ngModelChange)="patchDetails({ license: $event })"
                />
                <label for="draft-license-url">{{
                  'packs.creator.licenseUrl' | translate
                }}</label>
                <input
                  pInputText
                  id="draft-license-url"
                  data-test="draft-license-url"
                  type="url"
                  [ngModel]="current.details.licenseUrl"
                  (ngModelChange)="patchDetails({ licenseUrl: $event })"
                />
                <label for="draft-homepage">{{
                  'packs.creator.homepage' | translate
                }}</label>
                <input
                  pInputText
                  id="draft-homepage"
                  data-test="draft-homepage"
                  type="url"
                  [ngModel]="current.details.homepage ?? ''"
                  (ngModelChange)="patchDetails({ homepage: $event })"
                />
              </div>
            </p-tabpanel>
            @if (current.details.language !== undefined) {
              <p-tabpanel value="common">
                @if (tab() === 'common') {
                  <p class="hint">
                    {{ 'packs.creator.listsIntro' | translate }}
                  </p>
                  <section class="list">
                    <h3>{{ 'packs.creator.params.title' | translate }}</h3>
                    <app-params-editor
                      [draft]="current"
                      [issues]="issues()"
                      (changed)="edited($event)"
                    />
                  </section>
                  <section class="list">
                    <p-panel
                      [header]="'packs.creator.lists.advanced' | translate"
                      [toggleable]="true"
                      [collapsed]="true"
                    >
                      <p class="hint">
                        {{ 'packs.creator.lists.advancedHint' | translate }}
                      </p>
                      <section class="list">
                        <h3>common.json</h3>
                        <textarea
                          pTextarea
                          class="json"
                          rows="6"
                          data-test="common-json"
                          aria-label="common.json"
                          [ngModel]="commonText()"
                          (ngModelChange)="setCommonText($event)"
                        ></textarea>
                        @if (commonErrors(); as errors) {
                          <ul class="errors" data-test="common-error">
                            @for (error of errors; track error) {
                              <li>{{ error }}</li>
                            }
                          </ul>
                        }
                        <div class="actions">
                          <p-fileupload
                            mode="basic"
                            accept=".json,application/json"
                            [auto]="true"
                            [customUpload]="true"
                            chooseIcon="pi pi-upload"
                            [chooseLabel]="
                              'packs.creator.importFile' | translate
                            "
                            (uploadHandler)="importCommon($event)"
                          />
                          <p-button
                            severity="secondary"
                            icon="pi pi-copy"
                            [label]="'packs.creator.copyBase' | translate"
                            (onClick)="copyBaseCommon()"
                          />
                          <p-button
                            severity="secondary"
                            outlined
                            icon="pi pi-times"
                            [label]="'packs.creator.clear' | translate"
                            (onClick)="setCommonText('')"
                          />
                        </div>
                      </section>
                    </p-panel>
                  </section>
                }
              </p-tabpanel>
            }
            <p-tabpanel value="items">
              @if (tab() === 'items') {
                <p class="hint">{{ 'packs.creator.listsIntro' | translate }}</p>
                <section class="list">
                  <h4>{{ 'packs.creator.kinds.title' | translate }}</h4>
                  <app-kinds-editor
                    [draft]="current"
                    [issues]="issues()"
                    (changed)="edited($event)"
                  />
                  <h4>{{ 'packs.creator.tints.title' | translate }}</h4>
                  <app-tints-editor
                    [draft]="current"
                    [issues]="issues()"
                    (changed)="edited($event)"
                  />
                  <app-common-words-editor
                    [draft]="current"
                    [issues]="issues()"
                    (changed)="edited($event)"
                  />
                  <p-panel
                    [header]="'packs.creator.templates.title' | translate"
                    [toggleable]="true"
                    [collapsed]="true"
                  >
                    <app-templates-editor
                      [draft]="current"
                      [issues]="issues()"
                      (changed)="edited($event)"
                    />
                  </p-panel>
                </section>
                <ng-container
                  *ngTemplateOutlet="advanced; context: { $implicit: 'items' }"
                />
              }
            </p-tabpanel>
            @for (domain of structuredDomains; track domain) {
              <p-tabpanel [value]="domain">
                @if (tab() === domain) {
                  <p class="hint">
                    {{ 'packs.creator.listsIntro' | translate }}
                  </p>
                  <section class="list" [attr.data-test]="'domain-' + domain">
                    <h4>{{ 'packs.creator.kinds.title' | translate }}</h4>
                    <app-domain-kinds-editor
                      [draft]="current"
                      [issues]="issues()"
                      [domain]="domain"
                      (changed)="edited($event)"
                    />
                    @if (current.details.language !== undefined) {
                      <h4>
                        {{ 'packs.creator.domain.textsTitle' | translate }}
                      </h4>
                      <app-domain-texts-editor
                        [draft]="current"
                        [issues]="issues()"
                        [domain]="domain"
                        (changed)="edited($event)"
                      />
                    }
                  </section>
                  <ng-container
                    *ngTemplateOutlet="advanced; context: { $implicit: domain }"
                  />
                }
              </p-tabpanel>
            }
            <p-tabpanel value="sprites">
              @if (tab() === 'sprites') {
                <p class="hint">
                  {{ 'packs.creator.spritesIntro' | translate }}
                </p>
                <div class="actions">
                  <p-fileupload
                    mode="basic"
                    accept="image/png"
                    [auto]="true"
                    [customUpload]="true"
                    chooseIcon="pi pi-image"
                    [chooseLabel]="'packs.creator.addPng' | translate"
                    (uploadHandler)="addPng($event)"
                  />
                  <p-select
                    [options]="spriteSets()"
                    optionLabel="name"
                    optionValue="id"
                    [ngModel]="chosenSet()"
                    (ngModelChange)="chosenSet.set($event)"
                    [placeholder]="'packs.creator.fromMine' | translate"
                    [emptyMessage]="'packs.creator.noSets' | translate"
                    [ariaLabel]="'packs.creator.fromMine' | translate"
                  />
                  <p-button
                    severity="secondary"
                    icon="pi pi-plus"
                    [label]="'packs.creator.addSet' | translate"
                    [disabled]="!chosenSet()"
                    (onClick)="addSet()"
                  />
                </div>
                @if (spriteErrors().length) {
                  <ul class="errors" data-test="sprite-errors">
                    @for (error of spriteErrors(); track error) {
                      <li>{{ error }}</li>
                    }
                  </ul>
                }
                @if (current.sprites.length > perPage) {
                  <p-paginator
                    [rows]="perPage"
                    [first]="firstSprite()"
                    [totalRecords]="current.sprites.length"
                    (onPageChange)="spriteFirst.set($event.first ?? 0)"
                  />
                }
                <ul class="sprites">
                  @for (entry of pageSprites(); track entry.index) {
                    <li class="sprite" data-test="sprite-row">
                      <img
                        [src]="preview(entry.sprite.image)"
                        alt=""
                        width="64"
                        height="64"
                      />
                      <div class="sprite-form">
                        <label>
                          {{ 'packs.creator.spriteId' | translate }}
                          <input
                            pInputText
                            type="text"
                            [ngModel]="entry.sprite.id"
                            (ngModelChange)="
                              patchSprite(entry.index, { id: $event })
                            "
                          />
                        </label>
                        @if (duplicateId(entry.sprite.id)) {
                          <small class="error">{{
                            'packs.creator.duplicateId' | translate
                          }}</small>
                        }
                        <label>
                          {{ 'packs.creator.label' | translate }}
                          <input
                            pInputText
                            type="text"
                            [ngModel]="entry.sprite.label"
                            (ngModelChange)="
                              patchSprite(entry.index, { label: $event })
                            "
                          />
                        </label>
                        <label>
                          {{ 'packs.creator.spriteKinds' | translate }}
                          <p-multiselect
                            [options]="itemKindOptions()"
                            optionLabel="label"
                            optionValue="value"
                            [ngModel]="entry.sprite.kinds"
                            (ngModelChange)="
                              patchSprite(entry.index, { kinds: $event ?? [] })
                            "
                            [showToggleAll]="false"
                            [filter]="true"
                          />
                        </label>
                        <label>
                          {{ 'packs.creator.spriteKind' | translate }}
                          <p-select
                            [options]="kindOptions(entry.sprite)"
                            optionLabel="label"
                            optionValue="value"
                            [ngModel]="entry.sprite.kind"
                            (ngModelChange)="
                              patchSprite(entry.index, { kind: $event })
                            "
                          />
                        </label>
                      </div>
                      @if (entry.sprite.kind !== 'colored') {
                        <p-button
                          severity="secondary"
                          icon="pi pi-palette"
                          [label]="'packs.creator.editInColorizer' | translate"
                          (onClick)="editInColorizer(entry.sprite.id)"
                        />
                      }
                      <p-button
                        severity="danger"
                        icon="pi pi-trash"
                        [label]="'packs.creator.removeSprite' | translate"
                        (onClick)="removeSprite(entry.index)"
                      />
                    </li>
                  } @empty {
                    <li class="hint">
                      {{ 'packs.creator.noSprites' | translate }}
                    </li>
                  }
                </ul>
              }
            </p-tabpanel>
            <p-tabpanel value="publish">
              <p class="hint">{{ 'packs.creator.publishIntro' | translate }}</p>
              <div class="actions">
                <p-button
                  icon="pi pi-download"
                  [label]="'packs.creator.installDevice' | translate"
                  [loading]="publishing() === 'install'"
                  [disabled]="publishing() !== null"
                  (onClick)="install()"
                />
                <p-button
                  severity="secondary"
                  icon="pi pi-file-export"
                  [label]="'packs.creator.export' | translate"
                  [loading]="publishing() === 'export'"
                  [disabled]="publishing() !== null"
                  (onClick)="export()"
                />
              </div>
              @if (publishErrors().length) {
                <ul class="errors" data-test="publish-errors">
                  @for (error of publishErrors(); track error) {
                    <li>{{ error }}</li>
                  }
                </ul>
              }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      } @else if (missing()) {
        <p class="hint">{{ 'packs.creator.notFound' | translate }}</p>
      }
    </div>
  `,
  styles: `
    .draft {
      max-width: 56rem;
    }
    .form {
      display: grid;
      grid-template-columns: minmax(8rem, 14rem) 1fr;
      gap: 0.75rem 1rem;
      align-items: start;
    }
    .form label {
      padding-top: 0.5rem;
    }
    .form > *,
    .sprite-form > *,
    .stack > * {
      min-width: 0;
    }
    .form input,
    .form textarea,
    .sprite-form input,
    .sprite-form p-select {
      width: 100%;
      box-sizing: border-box;
    }
    @media (max-width: 600px) {
      .form {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.25rem;
      }
      .form label {
        padding-top: 0.5rem;
      }
      .sprite {
        flex-wrap: wrap;
      }
      .sprite-form {
        flex-basis: 100%;
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .list {
      margin-bottom: 1.5rem;
    }
    .list .json {
      width: 100%;
      font-family: monospace;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
    .errors,
    .error {
      color: var(--p-red-500);
    }
    .sprites {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
    }
    .sprite {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .sprite img {
      object-fit: contain;
      image-rendering: pixelated;
    }
    .sprite-form {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 0.5rem;
    }
    .sprite-form label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  `,
})
export class PackDraftPageComponent {
  /** The draft to edit; bound from the route (`:draftId`). */
  readonly draftId = input.required<string>();

  private readonly creator = inject(PackCreatorBusiness);
  private readonly form = inject(PackDraftFormBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);
  private readonly pending = inject(PendingTasks);
  private readonly router = inject(Router);

  protected readonly languageOptions = [...SUPPORTED_LANGUAGES];
  protected readonly structuredDomains = STRUCTURED_DOMAINS;
  protected readonly tab = signal<Tab>('details');
  protected readonly draft = signal<PackDraft | null>(null);
  protected readonly missing = signal(false);
  protected readonly idWarning = signal<'official' | 'link' | null>(null);
  protected readonly spriteSets = signal<SpriteSet[]>([]);
  protected readonly chosenSet = signal<string | null>(null);
  protected readonly spriteErrors = signal<string[]>([]);
  protected readonly publishErrors = signal<string[]>([]);
  protected readonly publishing = signal<'install' | 'export' | null>(null);
  /** The word list text of each language and generator, as typed. */
  private readonly texts = signal<Record<string, string>>({});
  protected readonly perPage = SPRITES_PER_PAGE;
  protected readonly spriteFirst = signal(0);
  /** Index of the first sprite shown, kept inside the draft when sprites are removed. */
  protected readonly firstSprite = computed(() => {
    const count = this.draft()?.sprites.length ?? 0;
    const last = Math.max(0, Math.ceil(count / SPRITES_PER_PAGE) - 1);
    return Math.min(this.spriteFirst(), last * SPRITES_PER_PAGE);
  });
  /** The sprites of the current page, with their index in the draft. */
  protected readonly pageSprites = computed(() => {
    const first = this.firstSprite();
    return (this.draft()?.sprites ?? [])
      .slice(first, first + SPRITES_PER_PAGE)
      .map((sprite, i) => ({ sprite, index: first + i }));
  });

  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly previews = new Map<Blob, string>();
  private readonly checked = new Map<
    string,
    { text: string; errors: string[] | null }
  >();

  /** The kinds, tints and params of the installed packs and of the draft. */
  private readonly known = signal<KnownKeys>({
    kinds: [],
    tints: [],
    params: [],
    domainKinds: { npcs: [], skills: [], classes: [] },
  });
  /** The validation messages of the draft, each with the field it is about. */
  protected readonly issues = signal<DraftIssue[]>([]);
  /** The text of `common.json` as typed. */
  protected readonly commonText = signal('');
  private issueLoads = 0;
  /** The kinds a sprite can have, as `id — first noun`. */
  protected readonly itemKindOptions = computed(() =>
    kindOptions(
      this.known().kinds,
      this.draft()?.sprites.flatMap((s) => s.kinds) ?? [],
    ),
  );

  constructor() {
    effect(() => {
      const id = this.draftId();
      // Save the previous draft's pending edits before another one replaces it.
      // Untracked: the draft changing must not reload it.
      void untracked(() => this.flush()).then(() => this.load(id));
    });
    effect(() => {
      const id = this.draft()?.details.id ?? '';
      void this.creator.idWarning(id).then((w) => this.idWarning.set(w));
    });
    effect(() => {
      const draft = this.draft();
      if (!draft) return;
      const load = ++this.issueLoads;
      void this.form.knownKeys(draft).then(
        (known) => load === this.issueLoads && this.known.set(known),
        () => undefined,
      );
      if (LIST_TABS.includes(this.tab()))
        void this.form.issues(draft).then(
          (issues) => load === this.issueLoads && this.issues.set(issues),
          () => undefined,
        );
    });
    void this.creator.listSpriteSets().then(
      (sets) => this.spriteSets.set(sets),
      () => undefined,
    );
    inject(DestroyRef).onDestroy(() => {
      if (this.saveTimer !== undefined) void this.flush();
      for (const url of this.previews.values()) URL.revokeObjectURL(url);
      this.previews.clear();
    });
  }

  private async load(id: string): Promise<void> {
    this.missing.set(false);
    this.spriteFirst.set(0);
    try {
      const draft = await this.creator.getDraft(id);
      if (!draft) {
        this.draft.set(null);
        this.missing.set(true);
        return;
      }
      const texts: Record<string, string> = {};
      for (const generator of PACK_GENERATORS) {
        const value = draft.generators[generator];
        if (value !== undefined)
          texts[generator] =
            typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      }
      this.texts.set(texts);
      this.commonText.set(this.stringify(draft.common));
      this.draft.set(draft);
    } catch (error) {
      this.fail(error);
    }
  }

  private stringify(value: unknown): string {
    if (value === undefined) return '';
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  /** Opens a sprite in the colorizer, after the pending edits are written. */
  protected async editInColorizer(spriteId: string): Promise<void> {
    // Pending edits are written first, so the colorizer reads the saved draft.
    if (this.saveTimer !== undefined) await this.flush();
    await this.router.navigate(['/tools/sprite-colorizer'], {
      queryParams: { draft: this.draftId(), sprite: spriteId },
    });
  }

  // --- saving -----------------------------------------------------------------------------------------------

  private change(update: (draft: PackDraft) => PackDraft): void {
    const draft = this.draft();
    if (!draft) return;
    this.draft.set(update(draft));
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DELAY_MS);
  }

  /** Writes the pending changes now, so the business reads the draft as it is on screen. */
  private flush(): Promise<unknown> {
    const dirty = this.saveTimer !== undefined;
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    const draft = this.draft();
    // Nothing changed: don't write (it would bump updatedAt, or bring back a draft deleted elsewhere).
    if (!draft || !dirty) return this.queue;
    this.queue = this.queue
      .then(() => this.creator.saveDraft(draft))
      .catch((error: unknown) => this.fail(error));
    return this.queue;
  }

  // --- details ----------------------------------------------------------------------------------------------

  protected patchDetails(patch: Partial<DraftDetails>): void {
    this.change((d) => ({ ...d, details: { ...d.details, ...patch } }));
  }

  protected setName(name: string): void {
    this.change((d) => {
      const { details } = d;
      // The id follows the name until the author edits it.
      const follows = details.id === slugifyPackId(details.name);
      return {
        ...d,
        details: {
          ...details,
          name,
          ...(follows ? { id: slugifyPackId(name) } : {}),
        },
      };
    });
  }

  // --- word lists -------------------------------------------------------------------------------------------

  protected text(generator: PackGenerator): string {
    return this.texts()[generator] ?? '';
  }

  protected setText(generator: PackGenerator, text: string): void {
    this.texts.update((t) => ({ ...t, [generator]: text }));
    const empty = text.trim() === '';
    let value: unknown = text;
    if (!empty) {
      try {
        value = JSON.parse(text);
      } catch {
        // Kept as text: the editor shows the error, and the pack cannot be built until it is fixed.
      }
    }
    this.change((d) => {
      const generators = { ...d.generators };
      if (empty) delete generators[generator];
      else generators[generator] = value;
      return { ...d, generators };
    });
  }

  /** A structured editor changed the draft: the JSON texts of the Advanced panel follow. */
  protected edited(draft: PackDraft): void {
    this.change(() => draft);
    this.texts.update((t) => {
      const next = { ...t };
      for (const generator of PACK_GENERATORS) {
        const value = draft.generators[generator];
        if (value === undefined) delete next[generator];
        else next[generator] = this.stringify(value);
      }
      return next;
    });
    this.commonText.set(this.stringify(draft.common));
  }

  protected setCommonText(text: string): void {
    this.commonText.set(text);
    const empty = text.trim() === '';
    let value: unknown = text;
    if (!empty) {
      try {
        value = JSON.parse(text);
      } catch {
        // Kept as text, like the word lists: the editor shows the error.
      }
    }
    this.change((d) => {
      const { common: _common, ...rest } = d;
      return empty ? rest : { ...rest, common: value };
    });
  }

  /** The problems of `common.json` as typed, or null when it is empty or valid. */
  protected commonErrors(): string[] | null {
    const text = this.commonText();
    if (text.trim() === '') return null;
    try {
      const problems = this.creator.commonErrors(JSON.parse(text));
      return problems.length ? problems : null;
    } catch {
      return [this.language.t('packs.creator.invalidJson')];
    }
  }

  protected async importCommon(event: FileUploadHandlerEvent): Promise<void> {
    const file = event.files[0];
    if (!file) return;
    try {
      this.setCommonText(await file.text());
    } catch (error) {
      this.fail(error);
    }
  }

  protected async copyBaseCommon(): Promise<void> {
    try {
      await this.flush();
      const value = await this.creator.copyBaseCommon(this.draftId());
      this.setCommonText(JSON.stringify(value, null, 2));
    } catch (error) {
      this.fail(error);
    }
  }

  /** The problems of a list as typed, or null when it is empty or valid. */
  protected listErrors(generator: PackGenerator): string[] | null {
    const key = generator;
    const text = this.text(generator);
    const known = this.checked.get(key);
    if (known?.text === text) return known.errors;
    let errors: string[] | null = null;
    if (text.trim() !== '') {
      try {
        const problems = this.creator.wordListErrors(
          generator,
          JSON.parse(text),
        );
        errors = problems.length ? problems : null;
      } catch {
        errors = [this.language.t('packs.creator.invalidJson')];
      }
    }
    this.checked.set(key, { text, errors });
    return errors;
  }

  protected async importFile(
    generator: PackGenerator,
    event: FileUploadHandlerEvent,
  ): Promise<void> {
    const file = event.files[0];
    if (!file) return;
    try {
      this.setText(generator, await file.text());
    } catch (error) {
      this.fail(error);
    }
  }

  protected async copyBase(generator: PackGenerator): Promise<void> {
    try {
      await this.flush();
      const value = await this.creator.copyBaseList(this.draftId(), generator);
      this.setText(generator, JSON.stringify(value, null, 2));
    } catch (error) {
      this.fail(error);
    }
  }

  // --- sprites ----------------------------------------------------------------------------------------------

  protected preview(image: Blob): string {
    let url = this.previews.get(image);
    if (!url) {
      url = URL.createObjectURL(image);
      this.previews.set(image, url);
    }
    return url;
  }

  protected duplicateId(id: string): boolean {
    return (this.draft()?.sprites.filter((s) => s.id === id).length ?? 0) > 1;
  }

  protected kindOptions(sprite: DraftSprite) {
    return SPRITE_KINDS.filter(
      (kind) => kind !== 'masked' || sprite.materials !== undefined,
    ).map((value) => ({
      value,
      label: this.language.t(`sprite.kind.${value}`),
    }));
  }

  protected patchSprite(index: number, patch: Partial<DraftSprite>): void {
    this.change((d) => ({
      ...d,
      sprites: d.sprites.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  protected removeSprite(index: number): void {
    this.change((d) => ({
      ...d,
      sprites: d.sprites.filter((_, i) => i !== index),
    }));
  }

  private adopt(sprite: DraftSprite): void {
    this.change((d) => ({ ...d, sprites: [...d.sprites, sprite] }));
    const count = this.draft()?.sprites.length ?? 0;
    this.spriteFirst.set(
      Math.floor((count - 1) / SPRITES_PER_PAGE) * SPRITES_PER_PAGE,
    );
  }

  protected async addPng(event: FileUploadHandlerEvent): Promise<void> {
    const file = event.files[0];
    if (!file) return;
    this.spriteErrors.set([]);
    const name = file.name.replace(/\.[^.]*$/, '');
    const taken = new Set(this.draft()?.sprites.map((s) => s.id));
    let id = slugifyPackId(name) || 'sprite';
    for (let n = 2; taken.has(id); n++)
      id = `${slugifyPackId(name) || 'sprite'}-${n}`;
    try {
      await this.flush();
      this.adopt(
        await this.creator.addPng(this.draftId(), file, {
          id,
          label: name,
          kinds: ['item'],
          kind: 'grayscale',
        }),
      );
    } catch (error) {
      this.spriteErrors.set(this.errorList(error));
    }
  }

  protected async addSet(): Promise<void> {
    const id = this.chosenSet();
    if (!id) return;
    this.spriteErrors.set([]);
    try {
      await this.flush();
      this.adopt(await this.creator.addFromSpriteSet(this.draftId(), id));
      this.chosenSet.set(null);
    } catch (error) {
      this.spriteErrors.set(this.errorList(error));
    }
  }

  // --- publishing -------------------------------------------------------------------------------------------

  protected install(): Promise<void> {
    return this.track(() => this.doInstall());
  }

  private async doInstall(): Promise<void> {
    this.publishErrors.set([]);
    this.publishing.set('install');
    try {
      await this.flush();
      await this.creator.install(this.draftId());
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('packs.creator.installed'),
        life: 4000,
      });
    } catch (error) {
      this.publishErrors.set(this.errorList(error));
    } finally {
      this.publishing.set(null);
    }
  }

  protected export(): Promise<void> {
    return this.track(() => this.doExport());
  }

  private async doExport(): Promise<void> {
    this.publishErrors.set([]);
    this.publishing.set('export');
    try {
      await this.flush();
      const { fileName, bytes } = await this.creator.exportZip(this.draftId());
      downloadBlob(
        new Blob([bytes as BlobPart], { type: 'application/zip' }),
        fileName,
      );
    } catch (error) {
      this.publishErrors.set(this.errorList(error));
    } finally {
      this.publishing.set(null);
    }
  }

  private errorList(error: unknown): string[] {
    const list = (error as { errors?: string[] }).errors;
    return list?.length
      ? list
      : [error instanceof Error ? error.message : String(error)];
  }

  /** Keeps the app unstable while the work runs, so `whenStable` waits for it. */
  private async track<T>(work: () => Promise<T>): Promise<T> {
    const done = this.pending.add();
    try {
      return await work();
    } finally {
      done();
    }
  }

  private fail(error: unknown): void {
    this.messages.add({
      severity: MessageLevel.Error,
      summary: this.language.t('packs.errorTitle'),
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
