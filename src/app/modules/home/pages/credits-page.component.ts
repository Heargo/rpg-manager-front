import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TagModule } from '@openng/optimus-ui/tag';
import { BundledWorldImage, PackBusiness } from '../../../core/business/pack.business';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';

/** Libraries actually listed in package.json, with their licences. */
export const CREDIT_LIBRARIES = [
  { name: 'Angular', licence: 'MIT', url: 'https://angular.dev/' },
  {
    name: 'ngx-translate',
    licence: 'MIT',
    url: 'https://ngx-translate.org/',
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
  imports: [RouterLink, TranslatePipe, TagModule, SiteFooterComponent],
  template: `
    <main class="page">
      <header class="page-header">
        <h1>{{ 'credits.title' | translate }}</h1>
        <p class="lead">{{ 'credits.intro' | translate }}</p>
      </header>
      <h2>{{ 'credits.librariesTitle' | translate }}</h2>
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
      <h2>{{ 'credits.illustrationsTitle' | translate }}</h2>
      <div class="card">
        <p>
          {{ 'credits.sampleHeroPrefix' | translate }}
          <a [href]="yuumeiUrl" target="_blank" rel="noopener noreferrer"
            >Yuumei</a
          >{{ 'credits.sampleHeroSuffix' | translate }}
        </p>
      </div>
      <div class="card illustration" data-test="sprites">
        <p>
          {{ 'credits.spritesPrefix' | translate }}
          <a [href]="spritesPackUrl" target="_blank" rel="noopener noreferrer"
            >Fantasy items pack</a
          >
          {{ 'credits.spritesBy' | translate }}
          <a [href]="ccByUrl" target="_blank" rel="noopener noreferrer"
            >CC BY 4.0</a
          >{{ 'credits.spritesSuffix' | translate }}
        </p>
      </div>
      @if (notices().length || worldImages().length) {
        <div class="card illustration" data-test="world-images">
          @for (notice of notices(); track notice) {
            <p>{{ notice }}</p>
          }
          <ul>
            @for (image of worldImages(); track image.id) {
              <li>
                <a [href]="image.source" target="_blank" rel="noopener noreferrer">{{ image.label }}</a>
              </li>
            }
          </ul>
        </div>
      }
      @if (packs().length) {
        <h2>{{ 'credits.packsTitle' | translate }}</h2>
        <div class="card" data-test="packs">
          <p>{{ 'credits.packsIntro' | translate }}</p>
          <ul>
            @for (pack of packs(); track pack.id) {
              <li>
                {{ pack.name }} {{ 'credits.packBy' | translate }}
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
      <h2>{{ 'credits.aiTitle' | translate }}</h2>
      <div class="card" data-test="ai">
        <p>{{ 'credits.ai' | translate }}</p>
        <p>
          <a routerLink="/contact">{{ 'credits.aiContact' | translate }}</a>
        </p>
      </div>
      <h2>{{ 'credits.toolsTitle' | translate }}</h2>
      <div class="card">
        <p>{{ 'credits.tools' | translate }}</p>
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
    .card + .illustration {
      margin-top: 0.75rem;
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
  /** Notices and landscapes of the built-in packs, listed whatever the open world uses (their licences ask for attribution). */
  protected readonly notices = signal<string[]>([]);
  protected readonly worldImages = signal<BundledWorldImage[]>([]);
  constructor() {
    void this.packBusiness.load().catch(() => undefined);
    void this.packBusiness
      .builtInCredits()
      .then((credits) => {
        this.notices.set(credits.notices);
        this.worldImages.set(credits.worldImages.filter((image) => image.source));
      })
      .catch(() => undefined);
  }

  protected readonly yuumeiUrl = 'https://www.yuumeiart.com/';
  protected readonly spritesPackUrl = 'https://fscibe.itch.io/fantasy-items-pack';
  protected readonly ccByUrl = 'https://creativecommons.org/licenses/by/4.0/';
}
