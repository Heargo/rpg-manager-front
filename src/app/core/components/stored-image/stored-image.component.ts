import { ChangeDetectionStrategy, Component, inject, input, resource } from '@angular/core';
import { ImageBusiness } from '../../business/image.business';

/** Shows an image from the image store by id; shows the projected fallback while loading or when there is none. */
@Component({
  selector: 'app-stored-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src.value(); as url) {
      <img [src]="url" [alt]="alt()" />
    } @else {
      <ng-content />
    }
  `,
  styles: `
    :host { display: block; overflow: hidden; }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `,
})
export class StoredImageComponent {
  private readonly images = inject(ImageBusiness);

  readonly imageId = input<string | undefined>();
  readonly alt = input('');

  protected readonly src = resource({
    params: () => this.imageId(),
    loader: ({ params: id }) => this.images.url(id),
  });
}
