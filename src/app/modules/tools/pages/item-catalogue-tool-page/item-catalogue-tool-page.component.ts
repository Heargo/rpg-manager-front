import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageModule } from '@openng/optimus-ui/message';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { ItemCatalogueComponent } from '../../../item/components/item-catalogue/item-catalogue.component';
import { SandboxCatalogueBusiness } from '../../business/sandbox-catalogue.business';

/** Tool: browse a sample item catalogue on the sandbox world, without a game. Nothing is saved. */
@Component({
  selector: 'app-item-catalogue-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    MessageModule,
    SkeletonModule,
    ItemCatalogueComponent,
  ],
  template: `
    <div class="main-container tool">
      <header>
        <h1>{{ 'item.catalogue.title' | transloco }}</h1>
        <p class="hint">{{ 'item.catalogue.toolIntro' | transloco }}</p>
      </header>
      @if (sandbox.$failed()) {
        <p-message severity="error">{{
          'tools.itemGenerator.failed' | transloco
        }}</p-message>
      } @else if (sandbox.$loading()) {
        <p-skeleton height="12rem" />
      } @else {
        <app-item-catalogue
          [world]="sandbox.$world()"
          [canGive]="false"
          (remove)="sandbox.remove($event.id)"
          (addDefaults)="sandbox.addDefaults()"
        />
      }
    </div>
  `,
  styles: `
    .tool {
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
  `,
})
export class ItemCatalogueToolPageComponent {
  protected readonly sandbox = inject(SandboxCatalogueBusiness);
}
