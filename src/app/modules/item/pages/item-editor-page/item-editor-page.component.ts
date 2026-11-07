import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RoomBusiness } from '../../../room/business/room.business';
import { Item } from '../../../world/models/world';
import { ItemCatalogueBusiness } from '../../business/item-catalogue.business';
import { ItemEditorComponent } from '../../components/item-editor/item-editor.component';

/** Game master: create an item or edit one of the hosted world's catalogue; saved with the world. */
@Component({
  selector: 'app-item-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    ItemEditorComponent,
  ],
  template: `
    <div class="main-container editor">
      <header>
        <h1>{{ 'item.editor.title' | transloco }}</h1>
        <p-button
          icon="pi pi-arrow-left"
          severity="secondary"
          [text]="true"
          [label]="'item.editor.back' | transloco"
          routerLink="/room/items"
        />
      </header>
      @if (catalogue.$world(); as world) {
        @if (itemId && !item()) {
          <p-message severity="warn">{{
            'item.editor.notFound' | transloco
          }}</p-message>
        } @else {
          <app-item-editor
            [world]="world"
            [item]="item()"
            (save)="save($event)"
          />
        }
      } @else {
        <p-message severity="info">{{
          'item.editor.notHosting' | transloco
        }}</p-message>
      }
    </div>
  `,
  styles: `
    .editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 48rem;
      margin-inline: auto;
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
  `,
})
export class ItemEditorPageComponent {
  protected readonly catalogue = inject(ItemCatalogueBusiness);
  private readonly router = inject(Router);
  private readonly room = inject(RoomBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);

  protected readonly itemId =
    inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected item(): Item | undefined {
    return this.catalogue
      .$world()
      ?.items.find((item) => item.id === this.itemId);
  }

  protected async save(item: Item): Promise<void> {
    try {
      const saved = await this.catalogue.save(item);
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('item.editor.saved', { name: saved.name }),
        life: 2500,
      });
      await this.router.navigate(['/room/items']);
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.room.describeError(error),
        life: 4000,
      });
    }
  }
}
