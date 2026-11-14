import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
} from '@angular/core';
import { ImageBusiness } from '../../business/image.business';

/** Shows an image from the image store by id; shows the projected fallback while loading or when there is none. */
@Component({
  selector: 'app-stored-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src.hasValue() ? src.value() : undefined; as url) {
      <img
        [src]="url"
        [alt]="alt()"
        draggable="false"
        (dragstart)="$event.preventDefault()"
      />
    } @else if (fallbackSrc(); as bundled) {
      <img
        [src]="bundled"
        [alt]="alt()"
        draggable="false"
        (dragstart)="$event.preventDefault()"
      />
    } @else {
      <ng-content />
    }
  `,
  styles: `
    :host {
      display: block;
      overflow: hidden;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      -webkit-user-drag: none;
    }
  `,
})
export class StoredImageComponent {
  private readonly images = inject(ImageBusiness);

  readonly imageId = input<string | undefined>();
  readonly alt = input('');
  /** A bundled image path shown when there is no stored image. */
  readonly fallbackSrc = input<string | undefined>();

  protected readonly src = resource({
    params: () => this.imageId(),
    loader: ({ params: id }) =>
      id ? this.images.url(id) : Promise.resolve(undefined),
  });
}
