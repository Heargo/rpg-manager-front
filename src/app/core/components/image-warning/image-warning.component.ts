import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** A short note shown next to every image picker: prefer images made by human artists. */
@Component({
  selector: 'app-image-warning',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <small class="image-warning" data-testid="image-warning">
      <i class="pi pi-info-circle"></i> {{ 'common.imageWarning' | transloco }}
    </small>
  `,
  styles: `
    :host {
      display: block;
    }
    .image-warning {
      color: var(--p-text-muted-color);
    }
  `,
})
export class ImageWarningComponent {}
