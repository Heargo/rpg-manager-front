import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

const SECTIONS = [
  'local',
  'stun',
  'mailbox',
  'relay',
  'hosting',
  'contact',
] as const;

@Component({
  selector: 'app-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <div class="main-container page">
      <h1>{{ 'privacy.title' | transloco }}</h1>
      <p>{{ 'privacy.intro' | transloco }}</p>
      @for (s of sections; track s) {
        <h2>{{ 'privacy.' + s + '.title' | transloco }}</h2>
        <p>{{ 'privacy.' + s + '.text' | transloco }}</p>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 48rem;
      margin-inline: auto;
    }
  `,
})
export class PrivacyPageComponent {
  protected readonly sections = SECTIONS;
}
