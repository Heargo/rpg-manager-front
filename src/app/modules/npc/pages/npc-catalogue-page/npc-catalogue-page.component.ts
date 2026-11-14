import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RoomBusiness } from '../../../room/business/room.business';
import { TableBusiness } from '../../../table/business/table.business';
import { NpcCatalogueBusiness } from '../../business/npc-catalogue.business';
import { NpcCatalogueComponent } from '../../components/npc-catalogue/npc-catalogue.component';
import { NpcSheetDialogComponent } from '../../components/npc-sheet-dialog/npc-sheet-dialog.component';
import { Npc } from '../../models/npc';

/** The NPC catalogue: the hosted world's for the game master, or the sandbox world's in the Tools. */
@Component({
  selector: 'app-npc-catalogue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    NpcCatalogueComponent,
    NpcSheetDialogComponent,
  ],
  template: `
    <div class="main-container catalogue">
      <header>
        <h1>{{ 'npc.catalogue.title' | transloco }}</h1>
        @if (tool) {
          <p class="hint">{{ 'npc.catalogue.toolIntro' | transloco }}</p>
        } @else {
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            [label]="'npc.catalogue.back' | transloco"
            routerLink="/room"
          />
        }
      </header>
      @if (catalogue.$world(); as world) {
        <app-npc-catalogue
          [world]="world"
          [showDisabled]="table.$combatRunning()"
          [showControls]="!tool"
          (show)="run(table.showOnTable($event.id))"
          (view)="viewedNpcId.set($event.id)"
          (create)="openEditor()"
          (edit)="openEditor($event.id)"
          (duplicate)="run(catalogue.duplicate($event.id))"
          (remove)="run(catalogue.remove($event.id))"
        />
        <app-npc-sheet-dialog [(npcId)]="viewedNpcId" />
      } @else {
        <p-message severity="info">{{
          'npc.catalogue.notHosting' | transloco
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
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class NpcCataloguePageComponent {
  protected readonly catalogue = inject(NpcCatalogueBusiness);
  protected readonly tool = !!inject(ActivatedRoute).snapshot.data['tool'];
  protected readonly table = inject(TableBusiness);
  /** The NPC whose sheet is open. */
  protected readonly viewedNpcId = signal<string | null>(null);
  private readonly router = inject(Router);
  private readonly room = inject(RoomBusiness);
  private readonly messages = inject(MessageService);

  protected openEditor(id?: string): Promise<boolean> {
    const base = this.tool ? '/tools/npc-editor' : '/room/npcs/editor';
    return this.router.navigate(id ? [base, id] : [base]);
  }

  protected async run(action: Promise<unknown>): Promise<void> {
    try {
      await action;
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.table.describeError(error),
        life: 4000,
      });
    }
  }
}
