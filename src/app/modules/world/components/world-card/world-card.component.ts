import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';

/** A world as a card (hub list and wizard preview). Actions are projected with the `actions` attribute. */
@Component({
  selector: 'app-world-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, StoredImageComponent],
  template: `
    <p-card styleClass="world-card">
      <ng-template #header>
        <app-stored-image class="cover" [imageId]="imageId()" [alt]="name()">
          <div class="placeholder"><i class="pi pi-globe"></i></div>
        </app-stored-image>
      </ng-template>
      <ng-template #title>{{ name() }}</ng-template>
      <ng-template #subtitle><ng-content select="[meta]" /></ng-template>
      <p class="description">{{ description() }}</p>
      <ng-template #footer><div class="actions"><ng-content select="[actions]" /></div></ng-template>
    </p-card>
  `,
  styles: `
    :host { display: block; }
    :host ::ng-deep .world-card { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    :host ::ng-deep .world-card .p-card-body { flex: 1; }
    .cover { aspect-ratio: 16 / 9; background: var(--p-content-hover-background); }
    .placeholder { height: 100%; display: grid; place-items: center; color: var(--p-text-muted-color); font-size: 2.5rem; }
    .description {
      margin: 0;
      color: var(--p-text-muted-color);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: pre-line;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end; }
  `,
})
export class WorldCardComponent {
  readonly name = input.required<string>();
  readonly description = input('');
  readonly imageId = input<string | undefined>();
}
