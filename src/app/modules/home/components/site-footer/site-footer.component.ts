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
              d="M22.183518 510.575353l260.757627-54.499504 135.558766-424.996132c5.899946-18.399833-16.799847-31.83971-28.899737-17.079844L6.023665 481.735615c-10.479905 12.759884 0.399996 32.139707 16.159853 28.839738z m718.853457-54.479504L1001.794602 510.595353c15.779856 3.29997 26.639758-16.099853 16.179853-28.859738L634.377946 13.979873c-12.07989-14.739866-34.779683-1.319988-28.919737 17.099844l135.578766 425.016132z m-212.978061-443.995959c-5.139953-16.119853-26.979754-16.119853-32.119708 0l-146.798664 460.215811L511.99906 585.734669l162.858518-113.438968-146.798664-460.195811z m482.31561 572.43479l-288.117378-60.219452-176.398394 122.898881v359.056732c0 15.179862 17.099844 23.319788 28.039745 13.339879l444.255956-404.396319c10.619903-9.639912 5.999945-27.799747-7.779929-30.679721z m-996.750928 0c-13.779875 2.879974-18.399833 21.039809-7.799929 30.679721L450.099623 1019.59072c10.9599 9.959909 28.039745 1.839983 28.039745-13.339878V647.214109l-176.398394-122.898881L13.623596 584.53468z"
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
