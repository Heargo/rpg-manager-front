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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import {
  FileUploadHandlerEvent,
  FileUploadModule,
} from '@openng/optimus-ui/fileupload';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { downloadBlob } from '../../../../core/helpers/download';
import { EQUIPMENT_SLOTS, ITEM_TYPES } from '../../../../core/models/item';
import { MessageLevel } from '../../../../core/models/toast-level';
import {
  PACK_GENERATORS,
  PACK_LANGUAGES,
  PackGenerator,
  PackLanguage,
  SPRITE_KINDS,
} from '../../../../core/packs/pack';
import {
  DraftDetails,
  DraftSprite,
  PackDraft,
  slugifyPackId,
} from '../../../../core/packs/pack-draft';
import { SpriteSet } from '../../../sprite/models/sprite-set';

type Tab = 'details' | 'lists' | 'sprites' | 'publish';

const SAVE_DELAY_MS = 500;
const slotKey = (lang: PackLanguage, generator: PackGenerator) =>
  `${lang}-${generator}`;

/** The pack editor: details, word lists, sprites, then install or export. Changes are saved as they are made. */
@Component({
  selector: 'app-pack-draft-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    FileUploadModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
    TextareaModule,
  ],
  template: `
    <div class="main-container draft">
      <header>
        <h1>{{ 'packs.creator.editTitle' | transloco }}</h1>
        <a routerLink="/tools/pack-creator">{{
          'packs.creator.backToDrafts' | transloco
        }}</a>
      </header>
      @if (draft(); as current) {
        <p-tabs [value]="tab()" (valueChange)="tab.set($any($event))">
          <p-tablist>
            <p-tab value="details">{{
              'packs.creator.tabs.details' | transloco
            }}</p-tab>
            <p-tab value="lists">{{
              'packs.creator.tabs.lists' | transloco
            }}</p-tab>
            <p-tab value="sprites">{{
              'packs.creator.tabs.sprites' | transloco
            }}</p-tab>
            <p-tab value="publish">{{
              'packs.creator.tabs.publish' | transloco
            }}</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="details">
              <div class="form">
                <label for="draft-name-en">{{
                  'packs.creator.nameEn' | transloco
                }}</label>
                <input
                  pInputText
                  id="draft-name-en"
                  data-test="draft-name-en"
                  type="text"
                  [ngModel]="current.details.name.en"
                  (ngModelChange)="setName('en', $event)"
                />
                <label for="draft-name-fr">{{
                  'packs.creator.nameFr' | transloco
                }}</label>
                <input
                  pInputText
                  id="draft-name-fr"
                  data-test="draft-name-fr"
                  type="text"
                  [ngModel]="current.details.name.fr"
                  (ngModelChange)="setName('fr', $event)"
                />
                <label for="draft-id">{{
                  'packs.creator.packId' | transloco
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
                    'packs.creator.packIdHint' | transloco
                  }}</small>
                  @if (idWarning(); as warning) {
                    <p-message data-test="draft-id-warning" severity="warn">{{
                      'packs.creator.idWarning.' + warning | transloco
                    }}</p-message>
                  }
                </div>
                <label for="draft-description-en">{{
                  'packs.creator.descriptionEn' | transloco
                }}</label>
                <textarea
                  pTextarea
                  id="draft-description-en"
                  data-test="draft-description-en"
                  rows="3"
                  [ngModel]="current.details.description.en"
                  (ngModelChange)="setDescription('en', $event)"
                ></textarea>
                <label for="draft-description-fr">{{
                  'packs.creator.descriptionFr' | transloco
                }}</label>
                <textarea
                  pTextarea
                  id="draft-description-fr"
                  data-test="draft-description-fr"
                  rows="3"
                  [ngModel]="current.details.description.fr"
                  (ngModelChange)="setDescription('fr', $event)"
                ></textarea>
                <label for="draft-version">{{
                  'packs.creator.version' | transloco
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
                  'packs.creator.author' | transloco
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
                  'packs.creator.license' | transloco
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
                  'packs.creator.licenseUrl' | transloco
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
                  'packs.creator.homepage' | transloco
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
            <p-tabpanel value="lists">
              <p class="hint">{{ 'packs.creator.listsIntro' | transloco }}</p>
              @for (lang of languages; track lang) {
                @for (generator of generators; track generator) {
                  <section class="list">
                    <h3>
                      {{ 'packs.lang.' + lang | transloco }} -
                      {{ 'packs.generator.' + generator | transloco }}
                    </h3>
                    <textarea
                      pTextarea
                      class="json"
                      rows="6"
                      [attr.data-test]="'wordlist-' + lang + '-' + generator"
                      [attr.aria-label]="'packs.lang.' + lang | transloco"
                      [ngModel]="text(lang, generator)"
                      (ngModelChange)="setText(lang, generator, $event)"
                    ></textarea>
                    @if (listErrors(lang, generator); as errors) {
                      <ul
                        class="errors"
                        [attr.data-test]="
                          'wordlist-error-' + lang + '-' + generator
                        "
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
                        [chooseLabel]="'packs.creator.importFile' | transloco"
                        (uploadHandler)="importFile(lang, generator, $event)"
                      />
                      <p-button
                        severity="secondary"
                        icon="pi pi-copy"
                        [label]="'packs.creator.copyBase' | transloco"
                        (onClick)="copyBase(lang, generator)"
                      />
                      <p-button
                        severity="secondary"
                        outlined
                        icon="pi pi-times"
                        [label]="'packs.creator.clear' | transloco"
                        (onClick)="setText(lang, generator, '')"
                      />
                    </div>
                  </section>
                }
              }
            </p-tabpanel>
            <p-tabpanel value="sprites">
              <p class="hint">{{ 'packs.creator.spritesIntro' | transloco }}</p>
              <div class="actions">
                <p-fileupload
                  mode="basic"
                  accept="image/png"
                  [auto]="true"
                  [customUpload]="true"
                  chooseIcon="pi pi-image"
                  [chooseLabel]="'packs.creator.addPng' | transloco"
                  (uploadHandler)="addPng($event)"
                />
                <p-select
                  [options]="spriteSets()"
                  optionLabel="name"
                  optionValue="id"
                  [ngModel]="chosenSet()"
                  (ngModelChange)="chosenSet.set($event)"
                  [placeholder]="'packs.creator.fromMine' | transloco"
                  [emptyMessage]="'packs.creator.noSets' | transloco"
                  [ariaLabel]="'packs.creator.fromMine' | transloco"
                />
                <p-button
                  severity="secondary"
                  icon="pi pi-plus"
                  [label]="'packs.creator.addSet' | transloco"
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
              <ul class="sprites">
                @for (sprite of current.sprites; track $index; let i = $index) {
                  <li class="sprite" data-test="sprite-row">
                    <img
                      [src]="preview(sprite.image)"
                      alt=""
                      width="64"
                      height="64"
                    />
                    <div class="sprite-form">
                      <label>
                        {{ 'packs.creator.spriteId' | transloco }}
                        <input
                          pInputText
                          type="text"
                          [ngModel]="sprite.id"
                          (ngModelChange)="patchSprite(i, { id: $event })"
                        />
                      </label>
                      @if (duplicateId(sprite.id)) {
                        <small class="error">{{
                          'packs.creator.duplicateId' | transloco
                        }}</small>
                      }
                      <label>
                        {{ 'packs.creator.labelEn' | transloco }}
                        <input
                          pInputText
                          type="text"
                          [ngModel]="sprite.en"
                          (ngModelChange)="patchSprite(i, { en: $event })"
                        />
                      </label>
                      <label>
                        {{ 'packs.creator.labelFr' | transloco }}
                        <input
                          pInputText
                          type="text"
                          [ngModel]="sprite.fr"
                          (ngModelChange)="patchSprite(i, { fr: $event })"
                        />
                      </label>
                      <label>
                        {{ 'packs.creator.spriteType' | transloco }}
                        <p-select
                          [options]="typeOptions()"
                          optionLabel="label"
                          optionValue="value"
                          [ngModel]="sprite.type"
                          (ngModelChange)="patchSprite(i, { type: $event })"
                        />
                      </label>
                      <label>
                        {{ 'packs.creator.spriteSlot' | transloco }}
                        <p-select
                          [options]="slotOptions()"
                          optionLabel="label"
                          optionValue="value"
                          [ngModel]="sprite.slot"
                          (ngModelChange)="patchSprite(i, { slot: $event })"
                        />
                      </label>
                      <label>
                        {{ 'packs.creator.spriteKind' | transloco }}
                        <p-select
                          [options]="kindOptions(sprite)"
                          optionLabel="label"
                          optionValue="value"
                          [ngModel]="sprite.kind"
                          (ngModelChange)="patchSprite(i, { kind: $event })"
                        />
                      </label>
                    </div>
                    @if (sprite.kind !== 'colored') {
                      <p-button
                        severity="secondary"
                        icon="pi pi-palette"
                        [label]="'packs.creator.editInColorizer' | transloco"
                        (onClick)="editInColorizer(sprite.id)"
                      />
                    }
                    <p-button
                      severity="danger"
                      icon="pi pi-trash"
                      [label]="'packs.creator.removeSprite' | transloco"
                      (onClick)="removeSprite(i)"
                    />
                  </li>
                } @empty {
                  <li class="hint">
                    {{ 'packs.creator.noSprites' | transloco }}
                  </li>
                }
              </ul>
            </p-tabpanel>
            <p-tabpanel value="publish">
              <p class="hint">{{ 'packs.creator.publishIntro' | transloco }}</p>
              <div class="actions">
                <p-button
                  icon="pi pi-download"
                  [label]="'packs.creator.installDevice' | transloco"
                  [loading]="publishing() === 'install'"
                  [disabled]="publishing() !== null"
                  (onClick)="install()"
                />
                <p-button
                  severity="secondary"
                  icon="pi pi-file-export"
                  [label]="'packs.creator.export' | transloco"
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
        <p class="hint">{{ 'packs.creator.notFound' | transloco }}</p>
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
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);
  private readonly pending = inject(PendingTasks);
  private readonly router = inject(Router);

  protected readonly languages = PACK_LANGUAGES;
  protected readonly generators = PACK_GENERATORS;
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

  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly previews = new Map<Blob, string>();
  private readonly checked = new Map<
    string,
    { text: string; errors: string[] | null }
  >();

  protected readonly typeOptions = computed(() =>
    ITEM_TYPES.map((value) => ({
      value,
      label: this.language.t(`item.type.${value}`),
    })),
  );
  protected readonly slotOptions = computed(() => [
    { value: 'none', label: this.language.t('packs.creator.slotNone') },
    ...EQUIPMENT_SLOTS.map((value) => ({
      value,
      label: this.language.t(`item.slot.${value}`),
    })),
  ]);

  constructor() {
    effect(() => {
      const id = this.draftId();
      // Save the previous draft's pending edits before another one replaces it.
      void this.flush().then(() => this.load(id));
    });
    effect(() => {
      const id = this.draft()?.details.id ?? '';
      void this.creator.idWarning(id).then((w) => this.idWarning.set(w));
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
    try {
      const draft = await this.creator.getDraft(id);
      if (!draft) {
        this.draft.set(null);
        this.missing.set(true);
        return;
      }
      const texts: Record<string, string> = {};
      for (const lang of PACK_LANGUAGES)
        for (const generator of PACK_GENERATORS) {
          const value = draft.generators[lang]?.[generator];
          if (value !== undefined)
            texts[slotKey(lang, generator)] =
              typeof value === 'string'
                ? value
                : JSON.stringify(value, null, 2);
        }
      this.texts.set(texts);
      this.draft.set(draft);
    } catch (error) {
      this.fail(error);
    }
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

  protected setName(lang: PackLanguage, value: string): void {
    this.change((d) => {
      const { details } = d;
      const derived = (name: DraftDetails['name']) =>
        slugifyPackId(name.en || name.fr);
      const name = { ...details.name, [lang]: value };
      // The id follows the name until the author edits it.
      const follows = details.id === derived(details.name);
      return {
        ...d,
        details: {
          ...details,
          name,
          ...(follows ? { id: derived(name) } : {}),
        },
      };
    });
  }

  protected setDescription(lang: PackLanguage, value: string): void {
    this.change((d) => ({
      ...d,
      details: {
        ...d.details,
        description: { ...d.details.description, [lang]: value },
      },
    }));
  }

  // --- word lists -------------------------------------------------------------------------------------------

  protected text(lang: PackLanguage, generator: PackGenerator): string {
    return this.texts()[slotKey(lang, generator)] ?? '';
  }

  protected setText(
    lang: PackLanguage,
    generator: PackGenerator,
    text: string,
  ): void {
    this.texts.update((t) => ({ ...t, [slotKey(lang, generator)]: text }));
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
      const slots = { ...d.generators[lang] };
      if (empty) delete slots[generator];
      else slots[generator] = value;
      return { ...d, generators: { ...d.generators, [lang]: slots } };
    });
  }

  /** The problems of a list as typed, or null when it is empty or valid. */
  protected listErrors(
    lang: PackLanguage,
    generator: PackGenerator,
  ): string[] | null {
    const key = slotKey(lang, generator);
    const text = this.text(lang, generator);
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
    lang: PackLanguage,
    generator: PackGenerator,
    event: FileUploadHandlerEvent,
  ): Promise<void> {
    const file = event.files[0];
    if (!file) return;
    try {
      this.setText(lang, generator, await file.text());
    } catch (error) {
      this.fail(error);
    }
  }

  protected async copyBase(
    lang: PackLanguage,
    generator: PackGenerator,
  ): Promise<void> {
    try {
      await this.flush();
      const value = await this.creator.copyBaseList(
        this.draftId(),
        lang,
        generator,
      );
      this.setText(lang, generator, JSON.stringify(value, null, 2));
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
          en: name,
          fr: name,
          type: 'item',
          slot: 'none',
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
