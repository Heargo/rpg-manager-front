import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DataViewModule } from '@openng/optimus-ui/dataview';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';
import { MessageLevel } from '../../../../core/models/toast-level';
import { extractSignalCode } from '../../../../core/p2p/helpers/signal-codec';
import { WorldCardComponent } from '../../../world/components/world-card/world-card.component';
import { PlayBusiness } from '../../business/play.business';

@Component({
  selector: 'app-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalDatePipe,
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    DataViewModule,
    MessageModule,
    TextareaModule,
    WorldCardComponent,
  ],
  templateUrl: './play-page.component.html',
  styleUrl: './play-page.component.scss',
})
export class PlayPageComponent implements OnInit {
  protected readonly play = inject(PlayBusiness);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly language = inject(LanguageBusiness);

  protected readonly inviteInput = signal('');
  protected readonly busyWorld = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.play.load();
  }

  protected async host(worldId: string): Promise<void> {
    this.error.set(null);
    this.busyWorld.set(worldId);
    try {
      if (await this.play.hostWorld(worldId)) await this.router.navigate(['/room']);
      else this.error.set(this.language.t('room.errors.otherTab'));
    } catch (error) {
      this.error.set(this.play.describeError(error));
    } finally {
      this.busyWorld.set(null);
    }
  }

  /** Joining shows the answer code on /join. */
  protected async join(): Promise<void> {
    const code = extractSignalCode(this.inviteInput());
    if (code) await this.router.navigate(['/join'], { fragment: code });
  }

  protected deleteWorld(worldId: string, name: string): void {
    this.confirm.confirm({
      header: this.language.t('play.worlds.deleteTitle'),
      message: this.language.t('play.worlds.deleteMessage', { name }),
      icon: 'pi pi-trash',
      acceptButtonProps: { label: this.language.t('play.worlds.delete'), severity: 'danger' },
      rejectButtonProps: { label: this.language.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => void this.play.deleteWorld(worldId),
    });
  }

  protected forgetRoom(roomId: string, name: string): void {
    this.confirm.confirm({
      header: this.language.t('room.recent.forget'),
      message: this.language.t('play.rooms.forgetMessage', { name }),
      icon: 'pi pi-trash',
      acceptButtonProps: { label: this.language.t('room.recent.forget'), severity: 'danger' },
      rejectButtonProps: { label: this.language.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => void this.play.forgetRoom(roomId),
    });
  }

  protected async exportWorld(worldId: string): Promise<void> {
    const { blob, fileName } = await this.play.exportWorld(worldId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected async importWorld(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await this.play.importWorld(await file.text());
      this.messages.add({ severity: MessageLevel.Success, summary: this.language.t('play.worlds.imported'), life: 2500 });
    } catch (error) {
      console.error('World import failed', error);
      this.messages.add({ severity: MessageLevel.Error, summary: this.language.t('play.worlds.importFailed'), life: 5000 });
    }
  }
}
