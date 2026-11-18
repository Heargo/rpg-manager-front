import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MAX_DICE, MAX_SIDES } from '../../../../core/generators/dice';
import { DICE_PRESETS } from '../../business/dice-roll.business';

export interface DiceScreenStatus {
  overlay?: boolean;
  rolling?: boolean;
  by?: string | null;
  ratio?: number | null;
}

/** A roll as the screen shows it. */
export interface DiceScreenResult {
  count: number;
  sides: number;
  values: number[];
  total: number;
}

/**
 * The one dice-screen layout (Dice page, table dice panel, combat dice screen). Result / history on top, the dice grid, then a bottom bar
 * that is Roll before a roll and total + Roll again + Close after one (or the `[diceActions]` slot). Below 40rem the bar is fixed to the bottom
 * of the screen, safe-area aware. `[diceOptions]` sits just above the bar; the default slot (history) goes under the result.
 */
@Component({
  selector: 'app-dice-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, ButtonModule, InputNumberModule],
  template: `
    <section
      #card
      class="screen"
      [class.overlay]="status().overlay"
      [class.fixed]="dock() === 'fixed'"
      [style.--dice-dock-h.px]="dockHeight()"
    >
      <div class="top">
        <div class="result" data-testid="dice-result" aria-live="polite">
          @if (status().by; as name) {
            <span class="by">{{ 'dice.rolledBy' | translate: { name } }}</span>
          }
          @if (status().rolling) {
            <span class="hint">{{ 'dice.rolling' | translate }}</span>
          } @else if (result(); as roll) {
            <span class="notation">{{ roll.count }}d{{ roll.sides }}</span>
            @if (roll.values.length > 1) {
              <span class="list">{{ roll.values.join(' + ') }} =</span>
            }
          }
        </div>
        <ng-content />
      </div>

      @if (editable()) {
        <div class="picker">
          <div
            class="grid"
            data-testid="dice-grid"
            role="group"
            [attr.aria-label]="'dice.sides' | translate"
          >
            @for (s of presets; track s) {
              <p-button
                data-testid="die"
                [attr.data-sides]="s"
                [attr.aria-label]="'dice.die' | translate: { sides: s }"
                [attr.aria-pressed]="sides() === s"
                [ariaLabel]="'dice.die' | translate: { sides: s }"
                [label]="'d' + s"
                [outlined]="sides() !== s"
                [fluid]="true"
                styleClass="die"
                (onClick)="sides.set(s)"
              />
            }
          </div>
          <div class="dice-input">
            <div class="count" data-testid="dice-count">
              <p-inputnumber
                inputId="dice-screen-count"
                [min]="1"
                [max]="maxDice"
                [showButtons]="true"
                buttonLayout="horizontal"
                [ngModel]="count()"
                (ngModelChange)="count.set($event ?? 1)"
                [ariaLabel]="'dice.count' | translate"
                inputStyleClass="count-input"
              />
            </div>
            <span class="d" aria-hidden="true">d</span>
            <div class="sides" data-testid="dice-sides">
              <p-inputnumber
                inputId="dice-screen-sides"
                [min]="2"
                [max]="maxSides"
                [ngModel]="sides()"
                (ngModelChange)="sides.set($event ?? 6)"
                [ariaLabel]="'dice.sides' | translate"
                inputStyleClass="sides-input"
              />
            </div>
          </div>
        </div>
      }

      <div
        #dockEl
        class="dock"
        data-testid="dice-dock"
        [attr.data-dock]="dock()"
      >
        <div class="options"><ng-content select="[diceOptions]" /></div>
        <div class="bar" data-testid="dice-bar">
          @if (!result() && !status().rolling) {
            <p-button
              data-action="roll-dice"
              icon="pi pi-box"
              [label]="
                ('dice.roll' | translate) + ' ' + count() + 'd' + sides()
              "
              [loading]="busy()"
              size="large"
              styleClass="roll"
              (onClick)="onRoll()"
            />
          } @else if (result(); as roll) {
            <strong
              class="total"
              data-testid="dice-total"
              [style.color]="color()"
              >{{ roll.total }}</strong
            >
            @if (actions() === 'slot') {
              <ng-content select="[diceActions]" />
            } @else {
              @if (canReroll()) {
                <p-button
                  data-action="again-dice"
                  icon="pi pi-refresh"
                  [label]="'dice.again' | translate"
                  (onClick)="reroll.emit()"
                />
              }
              <p-button
                data-action="close-dice"
                icon="pi pi-times"
                [label]="'dice.close' | translate"
                severity="secondary"
                (onClick)="onClose()"
              />
            }
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .top {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .result {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: baseline;
      min-width: 0;
    }
    .result:empty {
      display: none;
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
    .picker {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(3.5rem, 1fr));
      gap: 0.5rem;
      width: 100%;
    }
    .grid ::ng-deep .die {
      min-height: 2.75rem;
      min-width: 2.75rem;
    }
    .dice-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .d {
      font-weight: 700;
    }
    .sides ::ng-deep .sides-input {
      width: 5rem;
      text-align: center;
    }
    .count ::ng-deep .count-input {
      width: 4rem;
      text-align: center;
    }
    .dock {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .options:empty {
      display: none;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      justify-content: center;
    }
    .overlay {
      position: absolute;
      left: 50%;
      bottom: 1rem;
      transform: translateX(-50%);
      width: min(40rem, calc(100% - 2rem));
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      background: var(--p-surface-0);
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
    }
    .overlay .bar {
      justify-content: space-between;
    }
    @media (max-width: 39.99rem) {
      .screen.fixed:not(.overlay) {
        padding-bottom: var(--dice-dock-h, 9rem);
      }
      .fixed .dock {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100;
        padding-bottom: env(safe-area-inset-bottom);
        background: var(--p-surface-0);
        border-top: 1px solid var(--p-content-border-color);
      }
      .fixed .options {
        padding: 0.5rem 1rem 0;
      }
      .fixed .bar {
        flex-wrap: nowrap;
        padding: 0.75rem 1rem;
      }
      .fixed .bar p-button {
        flex: 1;
      }
      .fixed .bar ::ng-deep .p-button {
        width: 100%;
        min-height: 2.75rem;
      }
      .overlay {
        left: 0;
        right: 0;
        bottom: 0;
        transform: none;
        width: auto;
        padding: 0.75rem 1rem;
        padding-bottom: env(safe-area-inset-bottom);
        border-radius: 12px 12px 0 0;
      }
      .overlay.fixed .dock {
        position: static;
        padding: 0;
        border: 0;
        background: none;
      }
      .overlay.fixed .bar {
        padding: 0.5rem 0;
      }
    }
  `,
})
export class DiceScreenComponent {
  readonly count = model(1);
  readonly sides = model(20);
  readonly editable = input(true);
  readonly result = input<DiceScreenResult | null>(null);
  /** Where the bottom bar sits: inline, or fixed to the bottom of the screen below 40rem. */
  readonly dock = input<'fixed' | 'inline'>('inline');
  /** After a roll: Roll again / Close, or the `[diceActions]` slot. */
  readonly actions = input<'buttons' | 'slot'>('buttons');
  /** The overlay's extras: floating over the 3D table, dice still landing, who rolled, ratio (0 to 1) colouring the total. */
  readonly status = input<DiceScreenStatus>({});
  /** Roll again is offered after a roll (not on someone else's roll). */
  readonly canReroll = input(true);
  /** The Roll button is waiting on the host. */
  readonly busy = input(false);

  readonly roll = output<void>();
  readonly reroll = output<void>();
  readonly close = output<void>();

  protected readonly presets = DICE_PRESETS;
  protected readonly maxDice = MAX_DICE;
  protected readonly maxSides = MAX_SIDES;
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private readonly dockEl = viewChild<ElementRef<HTMLElement>>('dockEl');
  /** Height of the dock, so the page content can be padded by exactly that when it is fixed. */
  protected readonly dockHeight = signal<number | null>(null);

  protected readonly color = computed(() => {
    const ratio = this.status().ratio ?? null;
    return ratio === null ? null : `hsl(${Math.round(ratio * 120)} 65% 38%)`;
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const dock = this.dockEl()?.nativeElement;
      if (!dock || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        this.dockHeight.set(dock.offsetHeight),
      );
      observer.observe(dock);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Top edge of the screen's card in the viewport, for the 3D table to keep the dice above it. */
  topEdge(): number | null {
    return this.card()?.nativeElement.getBoundingClientRect().top ?? null;
  }

  protected onRoll(): void {
    this.roll.emit();
  }

  protected onClose(): void {
    this.close.emit();
  }
}
