import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { FileUploadHandlerEvent, FileUploadModule } from '@openng/optimus-ui/fileupload';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { StepperModule } from '@openng/optimus-ui/stepper';
import { TagModule } from '@openng/optimus-ui/tag';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { WorldCardComponent } from '../../components/world-card/world-card.component';
import { DEFAULT_OFFLINE_FEATURES } from '../../helpers/world.factory';
import { ATTRIBUTE_NAME_MAX_LENGTH, WORLD_NAME_MAX_LENGTH } from '../../helpers/world-draft.rules';
import { MoneyFormat, OfflineFeatures, WorldDraft } from '../../models/world';

interface AttributeRow {
  key: number;
  name: string;
  baseValue: number;
}

type MoneyKind = MoneyFormat['kind'];

const MONEY_KINDS: MoneyKind[] = ['coins', 'dollars', 'euros', 'pounds', 'yen', 'custom'];
const OFFLINE_FEATURES = Object.keys(DEFAULT_OFFLINE_FEATURES) as (keyof OfflineFeatures)[];

/** New game wizard: identity → attributes → rules, with a live preview. */
import { DEFAULT_ATTRIBUTES } from '../../helpers/default-world';
@Component({
  selector: 'app-world-new-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CheckboxModule,
    FileUploadModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    StepperModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    WorldCardComponent,
  ],
  templateUrl: './world-new-page.component.html',
  styleUrl: './world-new-page.component.scss',
})
export class WorldNewPageComponent {
  private readonly library = inject(WorldLibraryBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly nameMax = WORLD_NAME_MAX_LENGTH;
  protected readonly attributeMax = ATTRIBUTE_NAME_MAX_LENGTH;
  protected readonly offlineFeatures = OFFLINE_FEATURES;

  protected readonly step = signal(1);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly imageId = signal<string | undefined>(undefined);
  protected readonly uploading = signal(false);
  protected readonly attributes = signal<AttributeRow[]>(this.defaultAttributes());
  protected readonly lifeBar = signal<string | null>(this.attributes()[0]?.name ?? null);
  protected readonly manaBar = signal<string | null>(this.attributes()[1]?.name ?? null);
  protected readonly startingStatPoints = signal(5);
  protected readonly startingMoney = signal(50);
  protected readonly moneyKind = signal<MoneyKind>('coins');
  protected readonly moneySymbol = signal('');
  protected readonly starterItems = signal(true);
  protected readonly offline = signal<OfflineFeatures>({ ...DEFAULT_OFFLINE_FEATURES });
  protected readonly creating = signal(false);
  private nextKey = 100;

  protected readonly moneyOptions = computed(() => {
    this.language.$language();
    return MONEY_KINDS.map((kind) => ({ value: kind, label: this.language.t(`world.money.${kind}`) }));
  });
  protected readonly attributeNames = computed(() =>
    this.attributes()
      .map((attribute) => attribute.name.trim())
      .filter(Boolean),
  );
  protected readonly draft = computed<WorldDraft>(() => ({
    name: this.name(),
    description: this.description(),
    imageId: this.imageId(),
    attributes: this.attributes().map(({ name, baseValue }) => ({ name, baseValue })),
    barAttributes: {
      life: this.attributeNames().includes(this.lifeBar() ?? '') ? (this.lifeBar() ?? undefined) : undefined,
      mana: this.attributeNames().includes(this.manaBar() ?? '') ? (this.manaBar() ?? undefined) : undefined,
    },
    startingStatPoints: this.startingStatPoints(),
    startingMoney: this.startingMoney(),
    moneyFormat: this.moneyKind() === 'custom' ? { kind: 'custom', symbol: this.moneySymbol() } : { kind: this.moneyKind() as Exclude<MoneyKind, 'custom'> },
    offlineFeatures: this.offline(),
  }));
  protected readonly errors = computed(() => this.library.validateDraft(this.draft()));
  protected readonly stepValid = computed(() => {
    const errors = this.errors();
    return {
      1: !errors.name,
      2: !errors.attributes,
      3: !errors.startingStatPoints && !errors.startingMoney && !errors.moneySymbol,
    } as Record<number, boolean>;
  });
  protected readonly canCreate = computed(() => Object.keys(this.errors()).length === 0);

  protected async upload(event: FileUploadHandlerEvent): Promise<void> {
    const file = event.files[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      this.imageId.set(await this.library.uploadImage(file));
    } catch (error) {
      console.error('Image upload failed', error);
      this.messages.add({ severity: MessageLevel.Error, summary: this.language.t('world.errors.image'), life: 4000 });
    } finally {
      this.uploading.set(false);
    }
  }

  protected addAttribute(): void {
    this.attributes.update((rows) => [...rows, { key: this.nextKey++, name: '', baseValue: 0 }]);
  }

  protected removeAttribute(key: number): void {
    this.attributes.update((rows) => rows.filter((row) => row.key !== key));
  }

  protected updateAttribute(key: number, change: Partial<AttributeRow>): void {
    this.attributes.update((rows) => rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  protected setOffline(feature: keyof OfflineFeatures, enabled: boolean): void {
    this.offline.update((features) => ({ ...features, [feature]: enabled }));
  }

  protected async create(): Promise<void> {
    if (!this.canCreate()) return;
    this.creating.set(true);
    try {
      await this.library.create(this.draft(), { starterItems: this.starterItems() });
      this.messages.add({ severity: MessageLevel.Success, summary: this.language.t('world.created', { name: this.name().trim() }), life: 2500 });
      await this.router.navigate(['/play']);
    } catch (error) {
      console.error('World creation failed', error);
      this.messages.add({ severity: MessageLevel.Error, summary: this.language.t('room.errors.generic'), life: 4000 });
    } finally {
      this.creating.set(false);
    }
  }

  private defaultAttributes(): AttributeRow[] {
    return DEFAULT_ATTRIBUTES.map(({ nameKey, baseValue }, index) => ({ key: index + 1, name: this.language.t(nameKey), baseValue }));
  }
}
