import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Full-width footer shared by the landing and the static pages. */
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <footer>
      <div class="inner">
        <span class="brand">
          <svg
            class="logo"
            viewBox="-32 -32 1088 1088"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M512.0 44.3L840.5 234.0L512.0 234.0L183.5 234.0ZM107.0 290.0L463.5 290.0L233.4 688.2L107.0 724.8ZM917.0 290.0L917.0 724.8L790.6 688.2L560.5 290.0ZM149.9 770.6L256.0 740.0L768.0 740.0L874.1 770.6L512.0 979.7ZM512.0 318.0L723.5 684.0L300.5 684.0Z"
            />
          </svg>
          {{ 'home.footerBrand' | transloco }}
        </span>
        <nav [attr.aria-label]="'home.footerNav' | transloco">
          <a routerLink="/credits" data-test="footer-credits">{{
            'home.footerCredits' | transloco
          }}</a>
          <a routerLink="/contact" data-test="footer-contact">{{
            'home.footerContact' | transloco
          }}</a>
          <a routerLink="/privacy-policy" data-test="footer-privacy">{{
            'home.footerPrivacy' | transloco
          }}</a>
        </nav>
        <p class="tagline">{{ 'home.footerTagline' | transloco }}</p>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      /* bleed through the global body margin (0.5rem) to the side edges; the page cancels the bottom one */
      margin: 0 -0.5rem;
    }
    footer {
      border-top: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
      font-size: 0.875rem;
    }
    .inner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1.5rem;
      max-width: 64rem;
      margin-inline: auto;
      padding: 1.25rem 1rem;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-right: auto;
      font-weight: 600;
    }
    .logo {
      width: 1.25rem;
      height: 1.25rem;
      fill: var(--p-primary-color);
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
    }
    a {
      color: var(--p-text-muted-color);
      text-decoration: none;
      &:hover,
      &:focus-visible {
        text-decoration: underline;
      }
    }
    .tagline {
      flex-basis: 100%;
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class SiteFooterComponent {}
