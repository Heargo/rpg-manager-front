import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** A short note shown next to every image picker: prefer images made by human artists. */
@Component({
  selector: 'app-image-warning',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <small class="image-warning" data-testid="image-warning">
      <i class="pi pi-info-circle"></i> {{ 'common.imageWarning' | translate }}
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
