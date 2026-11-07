import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RoomBusiness } from '../../../room/business/room.business';
import { Item } from '../../../world/models/world';
import { ItemCatalogueBusiness } from '../../business/item-catalogue.business';
import { ItemCatalogueComponent } from '../../components/item-catalogue/item-catalogue.component';

/** Game master: the hosted world's catalogue, to give items to players. */
@Component({
  selector: 'app-item-catalogue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    MessageModule,
    SelectModule,
    ItemCatalogueComponent,
  ],
  template: `
    <div class="main-container catalogue">
      <header>
        <h1>{{ 'item.catalogue.title' | transloco }}</h1>
        <p-button
          icon="pi pi-arrow-left"
          severity="secondary"
          [text]="true"
          [label]="'item.catalogue.back' | transloco"
          routerLink="/room"
        />
      </header>
      @if (catalogue.$world(); as world) {
        <app-item-catalogue
          [world]="world"
          (give)="itemToGive.set($event)"
          (remove)="remove($event)"
          (addDefaults)="addDefaults()"
        />
        <p-dialog
          [visible]="!!itemToGive()"
          (visibleChange)="$event || itemToGive.set(null)"
          [modal]="true"
          [header]="
            'item.catalogue.giveTitle'
              | transloco: { name: itemToGive()?.name ?? '' }
          "
        >
          @if (world.characters.length) {
            <div class="picker">
              <label for="give-to">{{
                'item.catalogue.giveTo' | transloco
              }}</label>
              <p-select
                inputId="give-to"
                [options]="world.characters"
                optionLabel="name"
                optionValue="id"
                [ngModel]="characterId()"
                (ngModelChange)="characterId.set($event)"
              />
              <p-button
                icon="pi pi-gift"
                [label]="'item.catalogue.give' | transloco"
                [disabled]="!characterId()"
                (onClick)="give()"
              />
            </div>
          } @else {
            <p>{{ 'item.catalogue.noPlayers' | transloco }}</p>
          }
        </p-dialog>
      } @else {
        <p-message severity="info">{{
          'item.catalogue.notHosting' | transloco
        }}</p-message>
      }
    </div>
  `,
  styles: `
    .catalogue {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }
    h1 {
      margin: 0;
    }
    .picker {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 16rem;
    }
  `,
})
export class ItemCataloguePageComponent {
  protected readonly catalogue = inject(ItemCatalogueBusiness);
  private readonly room = inject(RoomBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);

  protected readonly itemToGive = signal<Item | null>(null);
  protected readonly characterId = signal<string | null>(null);

  protected async give(): Promise<void> {
    const item = this.itemToGive();
    const characterId = this.characterId();
    if (!item || !characterId) return;
    await this.run(async () => {
      const character = await this.catalogue.give(characterId, item.id);
      this.itemToGive.set(null);
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('item.catalogue.given', {
          item: item.name,
          name: character.name,
        }),
        life: 2500,
      });
    });
  }

  protected remove(item: Item): Promise<void> {
    return this.run(() => this.catalogue.remove(item.id));
  }

  protected addDefaults(): Promise<void> {
    return this.run(() => this.catalogue.addDefaults());
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.room.describeError(error),
        life: 4000,
      });
    }
  }
}
