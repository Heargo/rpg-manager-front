import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';

const SECTIONS = [
  { key: 'local', icon: 'pi-lock' },
  { key: 'stun', icon: 'pi-wifi' },
  { key: 'mailbox', icon: 'pi-inbox' },
  { key: 'relay', icon: 'pi-share-alt' },
  { key: 'hosting', icon: 'pi-server' },
  { key: 'contact', icon: 'pi-envelope' },
] as const;

@Component({
  selector: 'app-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, SiteFooterComponent],
  template: `
    <main class="page">
      <header class="page-header">
        <h1>{{ 'privacy.title' | translate }}</h1>
        <p class="lead">{{ 'privacy.intro' | translate }}</p>
      </header>
      @for (s of sections; track s.key) {
        <section class="card" [class.highlight]="$first">
          <h2>
            <i class="pi {{ s.icon }}" aria-hidden="true"></i>
            {{ 'privacy.' + s.key + '.title' | translate }}
          </h2>
          <p>{{ 'privacy.' + s.key + '.text' | translate }}</p>
        </section>
      }
    </main>
    <app-site-footer />
  `,
  styleUrl: './static-page.scss',
  styles: `
    section {
      margin-bottom: 1rem;
    }
    h2 {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0 0 0.5rem;
      i {
        color: var(--p-primary-color);
      }
    }
    .highlight {
      border-color: var(--p-primary-color);
      border-width: 2px;
    }
  `,
})
export class PrivacyPageComponent {
  protected readonly sections = SECTIONS;
}
