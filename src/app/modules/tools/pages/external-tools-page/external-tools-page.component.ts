import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CardModule } from '@openng/optimus-ui/card';

/** Free tools by other people that help prepare a game (from the legacy tools page). */
export const EXTERNAL_TOOLS = [
  {
    key: 'procgenArcana',
    icon: 'pi pi-building',
    url: 'https://watabou.github.io/',
  },
  {
    key: 'fantasyMap',
    icon: 'pi pi-map',
    url: 'https://azgaar.github.io/Fantasy-Map-Generator/',
  },
  { key: 'squoosh', icon: 'pi pi-image', url: 'https://squoosh.app/' },
] as const;

@Component({
  selector: 'app-external-tools-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, CardModule],
  template: `
    <div class="main-container external">
      <header>
        <h1>{{ 'tools.external.title' | transloco }}</h1>
        <p class="hint">{{ 'tools.external.intro' | transloco }}</p>
      </header>
      <ul class="grid">
        @for (tool of tools; track tool.key) {
          <li>
            <a [href]="tool.url" target="_blank" rel="noopener noreferrer">
              <p-card>
                <div class="tool">
                  <i [class]="tool.icon"></i>
                  <div>
                    <h2>
                      {{ 'tools.external.' + tool.key + '.name' | transloco }}
                      <i class="pi pi-external-link"></i>
                    </h2>
                    <p>
                      {{
                        'tools.external.' + tool.key + '.description'
                          | transloco
                      }}
                    </p>
                  </div>
                </div>
              </p-card>
            </a>
          </li>
        }
      </ul>
      <small class="hint">{{ 'tools.external.notOurs' | transloco }}</small>
    </div>
  `,
  styles: `
    .external {
      max-width: 64rem;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      margin: 0;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
    .grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
      gap: 1rem;
    }
    a {
      color: inherit;
      text-decoration: none;
      display: block;
      height: 100%;
    }
    a p-card {
      height: 100%;
    }
    a:hover h2,
    a:focus-visible h2 {
      text-decoration: underline;
    }
    .tool {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .tool > .pi {
      font-size: 1.75rem;
      color: var(--p-primary-color);
    }
    h2 {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
    }
    h2 .pi {
      font-size: 0.8rem;
      color: var(--p-text-muted-color);
    }
    p {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class ExternalToolsPageComponent {
  protected readonly tools = EXTERNAL_TOOLS;
}
