import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RoomBusiness } from '../../../room/business/room.business';
import { NpcCatalogueBusiness } from '../../business/npc-catalogue.business';
import { NpcEditorComponent } from '../../components/npc-editor/npc-editor.component';
import { Npc } from '../../models/npc';

/** Create an NPC or edit one: the hosted world's for the game master, or the sandbox world's in the Tools. */
@Component({
  selector: 'app-npc-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    NpcEditorComponent,
  ],
  template: `
    <div class="main-container editor">
      <header>
        <h1>{{ 'npc.editor.title' | transloco }}</h1>
        @if (tool) {
          <p class="hint">
            {{
              (npcId ? 'npc.editor.toolIntroEdit' : 'npc.editor.toolIntro')
                | transloco
            }}
          </p>
        }
        <p-button
          icon="pi pi-arrow-left"
          severity="secondary"
          [text]="true"
          [label]="'npc.editor.back' | transloco"
          [routerLink]="listPath"
        />
      </header>
      @if (catalogue.$world(); as world) {
        @if (npcId && !npc()) {
          <p-message severity="warn">{{
            'npc.editor.notFound' | transloco
          }}</p-message>
        } @else {
          <app-npc-editor [world]="world" [npc]="npc()" (save)="save($event)" />
        }
      } @else {
        <p-message severity="info">{{
          'npc.editor.notHosting' | transloco
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
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class NpcEditorPageComponent {
  protected readonly catalogue = inject(NpcCatalogueBusiness);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly room = inject(RoomBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);

  protected readonly tool = !!this.route.snapshot.data['tool'];
  protected readonly listPath = this.tool
    ? '/tools/npc-catalogue'
    : '/room/npcs';
  protected readonly npcId = this.route.snapshot.paramMap.get('id');

  protected npc(): Npc | undefined {
    return this.catalogue.$world()?.npcs.find((npc) => npc.id === this.npcId);
  }

  protected async save(npc: Npc): Promise<void> {
    try {
      const saved = await this.catalogue.save(npc);
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('npc.editor.saved', { name: saved.name }),
        life: 2500,
      });
      await this.router.navigate([this.listPath]);
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.room.describeError(error),
        life: 4000,
      });
    }
  }
}
