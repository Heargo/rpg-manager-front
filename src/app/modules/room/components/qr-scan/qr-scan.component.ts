import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { QrScanBusiness } from '../../business/qr-scan.business';
import { ScanPlace } from '../../helpers/qr-scan.rules';
import { QrScanError, QrScanSession } from '../../services/qr-scanner.service';

/** Camera scanner for an invite or answer QR code, with a paste fallback when the camera is unavailable. */
@Component({
  selector: 'app-qr-scan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    MessageModule,
    TextareaModule,
  ],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [closable]="true"
      [closeOnEscape]="true"
      [draggable]="false"
      [header]="'room.scan.title' | transloco"
      [style]="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      (visibleChange)="!$event && close()"
    >
      <div class="panel">
        <p>
          {{
            (place() === 'join-entry'
              ? 'room.scan.hintInvite'
              : 'room.scan.hintAnswer'
            ) | transloco
          }}
        </p>
        <video
          #video
          muted
          playsinline
          [hidden]="!!fallback()"
          [attr.aria-label]="'room.scan.video' | transloco"
        ></video>
        @if (fallback(); as reason) {
          <p-message severity="warn" size="small" variant="simple">{{
            (reason === 'denied' ? 'room.scan.denied' : 'room.scan.noCamera')
              | transloco
          }}</p-message>
          <label for="scan-paste">{{ 'room.scan.paste' | transloco }}</label>
          <textarea
            pTextarea
            id="scan-paste"
            rows="3"
            data-test="scan-paste"
            [ngModel]="pasted()"
            (input)="pasted.set($any($event.target).value)"
          ></textarea>
          <button
            pButton
            type="button"
            data-test="scan-use"
            icon="pi pi-check"
            [label]="'room.scan.use' | transloco"
            [disabled]="!pasted().trim()"
            (click)="use()"
          ></button>
        }
        @if (error(); as message) {
          <p class="scan-error" role="alert">{{ message }}</p>
        }
        <div class="end">
          <button
            pButton
            type="button"
            data-test="scan-close"
            icon="pi pi-times"
            severity="secondary"
            [text]="true"
            [label]="'room.scan.close' | transloco"
            (click)="close()"
          ></button>
        </div>
      </div>
    </p-dialog>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    video {
      width: 100%;
      border-radius: 0.5rem;
      background: #000;
    }
    textarea {
      width: 100%;
      font-family: monospace;
    }
    .scan-error {
      margin: 0;
      color: var(--p-red-500, #ef4444);
    }
    .end {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class QrScanComponent implements AfterViewInit {
  private readonly scan = inject(QrScanBusiness);
  private readonly language = inject(LanguageBusiness);

  readonly place = input.required<ScanPlace>();
  readonly scanned = output<string>();
  readonly closed = output<void>();

  private readonly video =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private session: QrScanSession | null = null;
  /** Set as soon as the camera must stop, even if the session is not stored yet (early scan, close, destroy). */
  private stopRequested = false;

  protected readonly fallback = signal<'denied' | 'no-camera' | null>(null);
  protected readonly pasted = signal('');
  private readonly problem = signal<'wrong-kind' | 'unknown' | null>(null);
  protected readonly error = computed(() => {
    const problem = this.problem();
    return problem
      ? this.language.t(
          problem === 'wrong-kind'
            ? 'room.scan.wrongKind'
            : 'room.scan.unknown',
        )
      : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stop();
    });
  }

  ngAfterViewInit(): void {
    void this.begin();
  }

  private async begin(): Promise<void> {
    try {
      const session = await this.scan.start(
        this.video().nativeElement,
        (text) => this.handle(text),
      );
      if (this.stopRequested) session.stop();
      else this.session = session;
    } catch (error) {
      this.fallback.set(
        error instanceof QrScanError ? error.reason : 'no-camera',
      );
    }
  }

  private handle(text: string): void {
    const verdict = this.scan.accept(text, this.place());
    if (!verdict.accepted) {
      this.problem.set(verdict.reason);
      return;
    }
    this.problem.set(null);
    this.stop();
    this.scanned.emit(verdict.text);
  }

  protected use(): void {
    const verdict = this.scan.accept(this.pasted(), this.place());
    if (!verdict.accepted) {
      this.problem.set(verdict.reason);
      return;
    }
    this.scanned.emit(verdict.text);
  }

  protected close(): void {
    this.stop();
    this.closed.emit();
  }

  private stop(): void {
    this.stopRequested = true;
    this.session?.stop();
    this.session = null;
  }
}
