import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
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
  imports: [TranslocoPipe, SiteFooterComponent],
  template: `
    <main class="page">
      <header class="page-header">
        <h1>{{ 'privacy.title' | transloco }}</h1>
        <p class="lead">{{ 'privacy.intro' | transloco }}</p>
      </header>
      @for (s of sections; track s.key) {
        <section class="card" [class.highlight]="$first">
          <h2>
            <i class="pi {{ s.icon }}" aria-hidden="true"></i>
            {{ 'privacy.' + s.key + '.title' | transloco }}
          </h2>
          <p>{{ 'privacy.' + s.key + '.text' | transloco }}</p>
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
