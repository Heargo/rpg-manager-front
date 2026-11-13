import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagModule } from '@openng/optimus-ui/tag';
import { PackBusiness } from '../../../core/business/pack.business';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';

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
  imports: [RouterLink, TranslocoPipe, TagModule, SiteFooterComponent],
  template: `
    <main class="page">
      <header class="page-header">
        <h1>{{ 'credits.title' | transloco }}</h1>
        <p class="lead">{{ 'credits.intro' | transloco }}</p>
      </header>
      <h2>{{ 'credits.librariesTitle' | transloco }}</h2>
      <ul class="libs">
        @for (lib of libraries; track lib.name) {
          <li class="card lib">
            <a [href]="lib.url" target="_blank" rel="noopener noreferrer">{{
              lib.name
            }}</a>
            <p-tag [value]="lib.licence" severity="secondary" />
          </li>
        }
      </ul>
      <h2>{{ 'credits.illustrationsTitle' | transloco }}</h2>
      <div class="card">
        <p>
          {{ 'credits.sampleHeroPrefix' | transloco }}
          <a [href]="yuumeiUrl" target="_blank" rel="noopener noreferrer"
            >Yuumei</a
          >{{ 'credits.sampleHeroSuffix' | transloco }}
        </p>
      </div>
      <div class="card" data-test="sprites">
        <p>
          {{ 'credits.spritesPrefix' | transloco }}
          <a [href]="ccByUrl" target="_blank" rel="noopener noreferrer"
            >CC BY 4.0</a
          >{{ 'credits.spritesSuffix' | transloco }}
        </p>
      </div>
      @if (packs().length) {
        <h2>{{ 'credits.packsTitle' | transloco }}</h2>
        <div class="card" data-test="packs">
          <p>{{ 'credits.packsIntro' | transloco }}</p>
          <ul>
            @for (pack of packs(); track pack.id) {
              <li>
                {{ pack.name }} {{ 'credits.packBy' | transloco }}
                {{ pack.author }},
                <a
                  [href]="pack.licenseUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ pack.license }}</a
                >
              </li>
            }
          </ul>
        </div>
      }
      <h2>{{ 'credits.aiTitle' | transloco }}</h2>
      <div class="card" data-test="ai">
        <p>{{ 'credits.ai' | transloco }}</p>
        <p>
          <a routerLink="/contact">{{ 'credits.aiContact' | transloco }}</a>
        </p>
      </div>
      <h2>{{ 'credits.toolsTitle' | transloco }}</h2>
      <div class="card">
        <p>{{ 'credits.tools' | transloco }}</p>
      </div>
    </main>
    <app-site-footer />
  `,
  styleUrl: './static-page.scss',
  styles: `
    .libs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .lib {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      font-weight: 600;
    }
  `,
})
export class CreditsPageComponent {
  private readonly packBusiness = inject(PackBusiness);
  /** Installed packs other than Base, with their name. */
  protected readonly packs = computed(() => {
    return this.packBusiness.$installed().filter((p) => !p.builtIn);
  });
  protected readonly libraries = CREDIT_LIBRARIES;
  constructor() {
    void this.packBusiness.load().catch(() => undefined);
  }

  protected readonly yuumeiUrl = 'https://www.yuumeiart.com/';
  protected readonly ccByUrl = 'https://creativecommons.org/licenses/by/4.0/';
}
