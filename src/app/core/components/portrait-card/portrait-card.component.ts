import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StoredImageComponent } from '../stored-image/stored-image.component';

/**
 * The trading-card frame of a character or an NPC: the portrait (or the name's initial) fills a 5:7 card, with a dark band
 * at the top (`[cardTop]`: name, level…) and one at the bottom (`[cardBottom]`: bars…). Anything else is projected under the
 * card, inside the frame (the XP pill).
 */
@Component({
  selector: 'app-portrait-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StoredImageComponent],
  template: `
    <div class="frame">
      <article class="card" [attr.aria-labelledby]="labelledBy() ?? null">
        <app-stored-image
          class="portrait"
          data-testid="card-portrait"
          [imageId]="portraitId()"
          [fallbackSrc]="fallbackSrc()"
          [alt]="name()"
        >
          <span class="initial">{{ name().charAt(0).toUpperCase() }}</span>
        </app-stored-image>
        <header class="overlay top"><ng-content select="[cardTop]" /></header>
        <footer class="overlay bottom">
          <ng-content select="[cardBottom]" />
        </footer>
      </article>
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .frame {
      position: relative;
      margin-bottom: 0.9rem;
    }
    .card {
      position: relative;
      aspect-ratio: 5 / 7;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
      border: 2px solid var(--p-primary-color);
      border-radius: 12px;
      background: var(--p-content-background);
      color: #fff;
      box-shadow: 0 0 0 1px var(--p-content-border-color);
    }
    .portrait {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        160deg,
        var(--p-content-hover-background),
        var(--p-primary-100, var(--p-content-background))
      );
    }
    .initial {
      display: grid;
      place-items: center;
      height: 100%;
      font-size: 9rem;
      font-weight: 600;
      color: var(--p-primary-color);
      opacity: 0.6;
    }
    .overlay {
      position: absolute;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.5rem 0.6rem;
      font-size: 0.75rem;
      text-shadow: 0 1px 2px rgb(0 0 0 / 60%);
    }
    .overlay:empty {
      display: none;
    }
    .top {
      top: 0;
      padding-bottom: 1.2rem;
      background: linear-gradient(to bottom, rgb(0 0 0 / 75%), transparent);
    }
    .bottom {
      bottom: 0;
      padding-top: 1.5rem;
      background: linear-gradient(to top, rgb(0 0 0 / 85%) 70%, transparent);
    }
  `,
})
export class PortraitCardComponent {
  readonly name = input.required<string>();
  readonly portraitId = input<string | undefined>();
  /** A bundled image shown when there is no stored portrait. */
  readonly fallbackSrc = input<string | undefined>();
  /** Id of the element naming the card (its title). */
  readonly labelledBy = input<string | undefined>();
}
