import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { PendingInvite, RoomBusiness } from '../../business/room.business';

/** One pending invite on the host: send the link (copy, share, QR), then paste the player's answer. */
@Component({
  selector: 'app-invite-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, ButtonModule, CardModule, InputTextModule, MessageModule, TextareaModule],
  template: `
    <p-card styleClass="invite">
      <div class="steps">
        <label [for]="'link-' + invite().id">{{ 'room.invite.step1' | transloco }}</label>
        <input pInputText readonly [id]="'link-' + invite().id" [value]="link()" (focus)="select($event)" />
        <div class="actions">
          <p-button icon="pi pi-copy" [label]="'room.invite.copy' | transloco" size="small" (onClick)="copy()" />
          @if (canShare) {
            <p-button icon="pi pi-share-alt" [label]="'room.invite.share' | transloco" size="small" severity="secondary" (onClick)="share()" />
          }
          <p-button
            icon="pi pi-qrcode"
            [label]="(qr() ? 'room.invite.hideQr' : 'room.invite.showQr') | transloco"
            size="small"
            severity="secondary"
            [text]="true"
            (onClick)="toggleQr()"
          />
        </div>
        @if (qr(); as qrUrl) {
          <img class="qr" [src]="qrUrl" [alt]="'room.invite.qrAlt' | transloco" />
        }
        <small class="privacy">{{ 'room.invite.privacy' | transloco }}</small>

        <label [for]="'answer-' + invite().id">{{ 'room.invite.step2' | transloco }}</label>
        <textarea
          pTextarea
          rows="3"
          [id]="'answer-' + invite().id"
          [placeholder]="'room.invite.answerPlaceholder' | transloco"
          [(ngModel)]="answer"
        ></textarea>
        @if (error()) {
          <p-message severity="error" size="small" variant="simple">{{ error() }}</p-message>
        }
        <div class="actions end">
          <p-button [label]="'room.invite.cancel' | transloco" severity="secondary" [text]="true" size="small" (onClick)="cancel()" />
          <p-button
            icon="pi pi-link"
            [label]="'room.invite.accept' | transloco"
            size="small"
            [loading]="connecting()"
            [disabled]="!answer().trim()"
            (onClick)="accept()"
          />
        </div>
      </div>
    </p-card>
  `,
  styles: `
    .steps { display: flex; flex-direction: column; gap: 0.5rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .actions.end { justify-content: flex-end; }
    input, textarea { width: 100%; font-family: monospace; font-size: 0.8rem; }
    .qr { width: min(16rem, 100%); align-self: center; image-rendering: pixelated; }
    .privacy { color: var(--p-text-muted-color); }
    label { font-weight: 600; margin-top: 0.5rem; }
  `,
})
export class InviteCardComponent {
  private readonly room = inject(RoomBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly clipboard = inject(Clipboard);
  private readonly messages = inject(MessageService);

  readonly invite = input.required<PendingInvite>();

  protected readonly link = computed(() => this.room.inviteLink(this.invite().offerCode));
  protected readonly answer = signal('');
  protected readonly qr = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly connecting = signal(false);
  protected readonly canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  protected select(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  protected copy(): void {
    if (this.clipboard.copy(this.link())) {
      this.messages.add({ severity: MessageLevel.Success, summary: this.language.t('room.invite.copied'), life: 1500 });
    }
  }

  protected async share(): Promise<void> {
    try {
      await navigator.share({ title: this.language.t('room.invite.shareTitle'), url: this.link() });
    } catch {
      // Cancelled by the user.
    }
  }

  protected async toggleQr(): Promise<void> {
    this.qr.set(this.qr() ? null : await this.room.qrCode(this.link()));
  }

  protected async accept(): Promise<void> {
    this.error.set(null);
    this.connecting.set(true);
    try {
      await this.room.accept(this.invite().id, this.answer());
    } catch (error) {
      this.error.set(this.room.describeError(error));
    } finally {
      this.connecting.set(false);
    }
  }

  protected cancel(): void {
    this.room.cancelInvite(this.invite().id);
  }
}
