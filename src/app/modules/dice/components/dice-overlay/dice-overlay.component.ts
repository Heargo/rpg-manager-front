import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DICE_OVERLAY_Z_INDEX } from '../../models/dice-api';
import { DiceRollBusiness } from '../../business/dice-roll.business';

type Scene = Awaited<ReturnType<DiceRollBusiness['createScene']>>;

/** Full-screen table over the page: the dice are thrown, bounce off the screen edges, and land on their values. */
@Component({
  selector: 'app-dice-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ButtonModule],
  host: { '(document:keydown.escape)': 'escape()' },
  template: `
    @if (dice.$current(); as roll) {
      <div
        class="overlay"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'dice.title' | transloco"
      >
        <canvas
          #canvas
          (click)="skip()"
          [attr.aria-label]="'dice.skip' | transloco"
        ></canvas>
        @if (loading()) {
          <div class="loading"><i class="pi pi-spin pi-spinner"></i></div>
        }
        <div class="bar" #bar [class.settled]="dice.$settled()">
          <div class="values" aria-live="polite">
            @if (roll.shared && !roll.shared.mine) {
              <span class="by">{{
                'dice.rolledBy' | transloco: { name: roll.shared.name }
              }}</span>
            }
            @if (dice.$settled()) {
              <span class="notation">{{ roll.count }}d{{ roll.sides }}</span>
              @if (roll.values.length > 1) {
                <span class="list">{{ roll.values.join(' + ') }} =</span>
              }
              <strong class="total" [style.color]="totalColor(roll.ratio)">{{
                roll.total
              }}</strong>
            } @else {
              <span class="hint">{{ 'dice.rolling' | transloco }}</span>
            }
          </div>
          <div class="actions">
            @if (!roll.combat && (!roll.shared || roll.shared.mine)) {
              <p-button
                data-action="again-dice"
                icon="pi pi-refresh"
                [label]="'dice.again' | transloco"
                (onClick)="again()"
              />
            }
            @if (roll.combat) {
              <ng-content select="[diceActions]" />
            } @else {
              <p-button
                data-action="close-dice"
                icon="pi pi-times"
                [label]="'dice.close' | transloco"
                severity="secondary"
                (onClick)="close()"
              />
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: ${DICE_OVERLAY_Z_INDEX};
      background: color-mix(in srgb, var(--p-surface-900) 35%, transparent);
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: pointer;
    }
    .loading {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 2rem;
      color: var(--p-surface-0);
    }
    .bar {
      position: absolute;
      left: 50%;
      bottom: 1rem;
      transform: translateX(-50%);
      width: min(40rem, calc(100% - 2rem));
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      background: var(--p-surface-0);
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
    }
    .values {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: baseline;
      min-width: 0;
    }
    .by {
      font-weight: 600;
    }
    .notation,
    .hint {
      color: var(--p-text-muted-color);
    }
    .list {
      overflow-wrap: anywhere;
    }
    .total {
      font-size: 1.75rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
    }
  `,
})
export class DiceOverlayComponent {
  protected readonly dice = inject(DiceRollBusiness);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');
  protected readonly loading = signal(false);
  private scene?: Scene;
  private sceneCanvas?: HTMLCanvasElement;

  constructor() {
    // A roll the table made (a combat action included) is thrown here, whatever the page.
    effect(() => {
      const shared = this.dice.takeUnseenTableRoll();
      if (shared) this.dice.presentShared(shared);
    });
    effect(() => {
      const roll = this.dice.$current();
      const canvas = this.canvas()?.nativeElement;
      if (roll && canvas) void this.show(canvas, roll.id);
    });
    inject(DestroyRef).onDestroy(() => this.scene?.dispose());
  }

  private async show(canvas: HTMLCanvasElement, rollId: string): Promise<void> {
    if (this.sceneCanvas !== canvas) {
      this.scene?.dispose();
      this.scene = undefined;
      this.loading.set(true);
      try {
        this.scene = await this.dice.createScene(canvas);
        this.sceneCanvas = canvas;
      } finally {
        this.loading.set(false);
      }
    }
    const roll = this.dice.$current();
    if (!roll || roll.id !== rollId || !this.scene) return;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    // Keep the dice out from under the result bar.
    const bar = this.bar()?.nativeElement;
    const bottomInsetPx = bar
      ? window.innerHeight - bar.getBoundingClientRect().top + 8
      : 0;
    await this.scene.play(roll.plan, { reducedMotion, bottomInsetPx });
    if (this.dice.$current()?.id === rollId) this.dice.markSettled();
  }

  protected skip(): void {
    this.scene?.skip();
  }

  protected again(): void {
    this.dice
      .rollAgain()
      .catch((error) => console.error('Roll again failed', error));
  }

  /** A combat roll is decided in the slot: Escape leaves it. */
  protected escape(): void {
    if (!this.dice.$current()?.combat) this.close();
  }

  protected close(): void {
    if (!this.dice.$current()) return;
    this.dice.close();
    this.scene?.dispose();
    this.scene = undefined;
    this.sceneCanvas = undefined;
  }

  /** Red for low totals through amber to green for high ones. */
  protected totalColor(ratio: number): string {
    return `hsl(${Math.round(ratio * 120)} 65% 38%)`;
  }
}
