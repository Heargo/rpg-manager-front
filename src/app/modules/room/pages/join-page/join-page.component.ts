import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, fromEvent } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { MessageModule } from '@openng/optimus-ui/message';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RoomBusiness } from '../../business/room.business';

/** Opened from an invite link: makes the answer code, shows it to send back, then enters the room. */
@Component({
  selector: 'app-join-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, ButtonModule, CardModule, MessageModule, ProgressSpinnerModule, TextareaModule],
  template: `
    <div class="main-container flex-col center middle">
      <p-card styleClass="join">
        <div class="stack">
          <h1>{{ 'room.join.title' | transloco }}</h1>
          @if (room.$joinState() === 'failed' && room.$failedWhileAway()) {
            <p-message severity="error">{{ 'room.join.failedAway' | transloco }}</p-message>
            <a routerLink="/play">{{ 'play.title' | transloco }}</a>
          } @else if (error()) {
            <p-message severity="error">{{ error() }}</p-message>
            <a routerLink="/play">{{ 'play.title' | transloco }}</a>
          } @else if (!answerCode()) {
            <div class="row"><p-progress-spinner styleClass="spinner" strokeWidth="6" /> {{ 'room.join.preparing' | transloco }}</div>
          } @else {
            <label for="answer-code">{{ 'room.join.step' | transloco }}</label>
            <textarea pTextarea id="answer-code" readonly rows="4" [value]="answerCode()" (focus)="select($event)"></textarea>
            <div class="actions">
              <p-button icon="pi pi-send" [label]="'room.join.send' | transloco" size="large" (onClick)="send()" />
              <p-button icon="pi pi-copy" [label]="'room.invite.copy' | transloco" severity="secondary" (onClick)="copy()" />
            </div>
            @if (qr(); as qrUrl) {
              <img class="qr" [src]="qrUrl" [alt]="'room.join.qrAlt' | transloco" />
            }
            @if (sent()) {
              <p-message severity="info">{{ 'room.join.comeBack' | transloco }}</p-message>
            } @else {
              <p class="hint">{{ 'room.join.hint' | transloco }}</p>
            }
            <div class="row">
              <p-progress-spinner styleClass="spinner" strokeWidth="6" />
              {{ (returned() ? 'room.join.stillWaiting' : 'room.join.waiting') | transloco }}
            </div>
          }
        </div>
      </p-card>
    </div>
  `,
  styles: `
    :host ::ng-deep .join { width: min(32rem, 100%); }
    .stack { display: flex; flex-direction: column; gap: 0.75rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    textarea { width: 100%; font-family: monospace; font-size: 0.8rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .qr { width: min(26rem, 100%); align-self: center; image-rendering: pixelated; background: #fff; }
    .hint { margin: 0; color: var(--p-text-muted-color); }
    .row { display: flex; align-items: center; gap: 0.75rem; }
    :host ::ng-deep .spinner { width: 1.5rem; height: 1.5rem; }
  `,
})
export class JoinPageComponent {
  protected readonly room = inject(RoomBusiness);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageBusiness);
  private readonly clipboard = inject(Clipboard);
  private readonly messages = inject(MessageService);
  private readonly document = inject(DOCUMENT);

  protected readonly answerCode = signal('');
  protected readonly qr = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  protected readonly sent = signal(false);
  /** True once the player came back to the page after sending the code. */
  protected readonly returned = signal(false);

  constructor() {
    // After sending the code the player switches apps: on return the page shows where things stand.
    fromEvent(this.document, 'visibilitychange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.document.visibilityState === 'visible' && this.sent()) this.returned.set(true);
      });
    // Follow the fragment, not a snapshot: opening another invite link while on /join only changes the `#` part.
    this.route.fragment
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((code) => void this.start(code));
  }

  private async start(code: string | null): Promise<void> {
    this.answerCode.set('');
    this.sent.set(false);
    this.returned.set(false);
    this.qr.set(null);
    this.error.set(null);
    if (!code) {
      this.error.set(this.language.t('room.join.noCode'));
      return;
    }
    try {
      const { answerCode, joined } = await this.room.join(code);
      this.answerCode.set(answerCode);
      this.qr.set(await this.room.qrCode(answerCode));
      joined.then(
        () => this.router.navigate(['/room']),
        (error: unknown) => this.error.set(this.room.describeError(error)),
      );
    } catch (error) {
      this.error.set(this.room.describeError(error));
    }
  }

  /** One tap: the share sheet where there is one, the clipboard otherwise, then the come-back step. */
  protected async send(): Promise<void> {
    if (this.canShare) {
      try {
        await navigator.share({ text: this.answerCode() });
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return; // Cancelled by the user.
        this.copy();
      }
    } else {
      this.copy();
    }
    this.sent.set(true);
  }

  protected select(event: FocusEvent): void {
    (event.target as HTMLTextAreaElement).select();
  }

  protected copy(): void {
    if (this.clipboard.copy(this.answerCode())) {
      this.messages.add({ severity: MessageLevel.Success, summary: this.language.t('room.invite.copied'), life: 1500 });
    }
  }

}
