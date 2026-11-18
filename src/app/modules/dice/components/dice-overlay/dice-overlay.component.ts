import {
  ChangeDetectionStrategy,
  computed,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DICE_OVERLAY_Z_INDEX } from '../../models/dice-api';
import { DiceRollBusiness } from '../../business/dice-roll.business';
import { DiceScreenComponent, DiceScreenStatus } from '../dice-screen/dice-screen.component';

type Scene = Awaited<ReturnType<DiceRollBusiness['createScene']>>;

/** Full-screen table over the page: the dice are thrown, bounce off the screen edges, and land on their values. */
@Component({
  selector: 'app-dice-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, DiceScreenComponent],
  host: { '(document:keydown.escape)': 'escape()' },
  template: `
    @if (dice.$current(); as roll) {
      <div
        class="overlay"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'dice.title' | translate"
      >
        <canvas
          #canvas
          (click)="skip()"
          [attr.aria-label]="'dice.skip' | translate"
        ></canvas>
        @if (loading()) {
          <div class="loading"><i class="pi pi-spin pi-spinner"></i></div>
        }
        <app-dice-screen
          dock="fixed"
          [editable]="false"
          [count]="roll.count"
          [sides]="roll.sides"
          [result]="dice.$settled() ? roll : null"
          [status]="status()"
          [canReroll]="!roll.shared || roll.shared.mine"
          [actions]="roll.combat ? 'slot' : 'buttons'"
          (reroll)="again()"
          (close)="close()"
        >
          <ng-container diceActions><ng-content select="[diceActions]" /></ng-container>
        </app-dice-screen>
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
  `,
})
export class DiceOverlayComponent {
  protected readonly dice = inject(DiceRollBusiness);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly screen = viewChild(DiceScreenComponent);
  protected readonly status = computed<DiceScreenStatus>(() => {
    const roll = this.dice.$current();
    return {
      overlay: true,
      rolling: !this.dice.$settled(),
      by: roll?.shared && !roll.shared.mine ? roll.shared.name : null,
      ratio: roll?.ratio ?? null,
    };
  });
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
    const top = this.screen()?.topEdge();
    const bottomInsetPx = top == null ? 0 : window.innerHeight - top + 8;
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

}
