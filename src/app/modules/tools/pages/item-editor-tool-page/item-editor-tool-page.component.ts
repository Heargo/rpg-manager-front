import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { ItemCardComponent } from '../../../item/components/item-card/item-card.component';
import { ItemEditorComponent } from '../../../item/components/item-editor/item-editor.component';
import { Item } from '../../../world/models/world';
import { SandboxCatalogueBusiness } from '../../business/sandbox-catalogue.business';

/** Tool: create or edit an item on the sandbox world's attributes. The result stays on the page, no world is saved. */
@Component({
  selector: 'app-item-editor-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    ItemCardComponent,
    ItemEditorComponent,
  ],
  template: `
    <div class="main-container tool">
      <header>
        <h1>{{ 'item.editor.title' | transloco }}</h1>
        <p class="hint">{{ 'item.editor.toolIntro' | transloco }}</p>
        <p-button
          icon="pi pi-arrow-left"
          severity="secondary"
          [text]="true"
          [label]="'item.editor.back' | transloco"
          routerLink="/tools/item-catalogue"
        />
      </header>
      @if (sandbox.$failed()) {
        <p-message severity="error">{{
          'tools.itemGenerator.failed' | transloco
        }}</p-message>
      } @else if (sandbox.$loading()) {
        <p-skeleton height="12rem" />
      } @else {
        <app-item-editor
          [world]="sandbox.$world()"
          [item]="current()"
          (save)="save($event)"
        />
        @if (result(); as item) {
          <h2>{{ 'item.editor.result' | transloco }}</h2>
          <app-item-card [item]="item" />
        }
      }
    </div>
  `,
  styles: `
    .tool {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 48rem;
      margin-inline: auto;
    }
    h1,
    h2 {
      margin: 0;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class ItemEditorToolPageComponent {
  protected readonly sandbox = inject(SandboxCatalogueBusiness);
  private readonly requestedId = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('item'))),
    { initialValue: null },
  );

  /** The item of the last save, which the editor keeps editing. */
  protected readonly result = signal<Item | undefined>(undefined);
  protected readonly current = computed(
    () =>
      this.result() ??
      this.sandbox
        .$world()
        .items.find((item) => item.id === this.requestedId()),
  );

  protected save(item: Item): void {
    this.result.set(this.sandbox.save(item));
  }
}
