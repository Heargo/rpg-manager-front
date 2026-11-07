import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Libraries actually listed in package.json, with their licences. */
export const CREDIT_LIBRARIES = [
  { name: 'Angular', licence: 'MIT', url: 'https://angular.dev/' },
  {
    name: 'Transloco',
    licence: 'MIT',
    url: 'https://jsverse.gitbook.io/transloco',
  },
  {
    name: 'Optimus UI (OpenNG)',
    licence: 'MIT',
    url: 'https://github.com/openng',
  },
  {
    name: 'Angular CDK',
    licence: 'MIT',
    url: 'https://material.angular.dev/cdk/categories',
  },
  { name: 'OpenNG Icons', licence: 'MIT', url: 'https://github.com/openng' },
  { name: 'tslib', licence: '0BSD', url: 'https://github.com/microsoft/tslib' },
  { name: 'RxJS', licence: 'Apache-2.0', url: 'https://rxjs.dev/' },
  { name: 'three.js', licence: 'MIT', url: 'https://threejs.org/' },
  { name: 'Rapier', licence: 'Apache-2.0', url: 'https://rapier.rs/' },
  { name: 'idb', licence: 'ISC', url: 'https://github.com/jakearchibald/idb' },
  {
    name: 'qrcode',
    licence: 'MIT',
    url: 'https://github.com/soldair/node-qrcode',
  },
  { name: 'jsQR', licence: 'Apache-2.0', url: 'https://github.com/cozmo/jsQR' },
  {
    name: 'Netlify Blobs',
    licence: 'MIT',
    url: 'https://github.com/netlify/primitives',
  },
] as const;

@Component({
  selector: 'app-credits-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <div class="main-container page">
      <h1>{{ 'credits.title' | transloco }}</h1>
      <p>{{ 'credits.intro' | transloco }}</p>
      <h2>{{ 'credits.librariesTitle' | transloco }}</h2>
      <ul>
        @for (lib of libraries; track lib.name) {
          <li>
            <a [href]="lib.url" target="_blank" rel="noopener noreferrer">{{
              lib.name
            }}</a>
            ({{ lib.licence }})
          </li>
        }
      </ul>
      <h2>{{ 'credits.toolsTitle' | transloco }}</h2>
      <p>{{ 'credits.tools' | transloco }}</p>
      <h2>{{ 'credits.legacyTitle' | transloco }}</h2>
      <p>{{ 'credits.legacy' | transloco }}</p>
    </div>
  `,
  styles: `
    .page {
      max-width: 48rem;
      margin-inline: auto;
    }
  `,
})
export class CreditsPageComponent {
  protected readonly libraries = CREDIT_LIBRARIES;
}
