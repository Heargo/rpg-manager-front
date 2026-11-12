import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ImageWarningComponent } from '../image-warning/image-warning.component';
import { StoredImageComponent } from '../stored-image/stored-image.component';

/** Shared image picker: a placeholder tile and a Choose button when empty; the stored image with Change and Remove otherwise. */
@Component({
  selector: 'app-image-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    StoredImageComponent,
    ImageWarningComponent,
  ],
  template: `
    <input
      #file
      hidden
      type="file"
      [id]="inputId()"
      [accept]="accept()"
      [attr.data-field]="field() || null"
      (change)="onChange(file)"
    />
    @if (imageId()) {
      <app-stored-image class="tile" [imageId]="imageId()">
        <span class="pi pi-image"></span>
      </app-stored-image>
      <div class="actions">
        <button
          pButton
          type="button"
          severity="secondary"
          icon="pi pi-pencil"
          data-action="change-image"
          [label]="'common.image.change' | transloco"
          (click)="file.click()"
        ></button>
        <button
          pButton
          type="button"
          severity="secondary"
          icon="pi pi-trash"
          [attr.data-action]="removeAction()"
          [label]="'common.image.remove' | transloco"
          (click)="removed.emit()"
        ></button>
      </div>
    } @else {
      <span class="tile placeholder" data-testid="image-placeholder"
        ><span class="pi pi-image"></span
      ></span>
      <div class="actions">
        <button
          pButton
          type="button"
          icon="pi pi-upload"
          data-action="choose-image"
          [label]="'common.image.choose' | transloco"
          (click)="file.click()"
        ></button>
      </div>
    }
    <app-image-warning />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .tile {
      width: 6rem;
      height: 6rem;
      border-radius: 0.5rem;
      background: var(--p-content-hover-background);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .placeholder {
      border: 2px dashed var(--p-content-border-color);
      color: var(--p-text-muted-color);
      box-sizing: border-box;
    }
    .placeholder .pi,
    .tile .pi {
      font-size: 2.5rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `,
})
export class ImagePickerComponent {
  readonly imageId = input<string | undefined>();
  readonly accept = input('image/*');
  readonly inputId = input('');
  readonly field = input('');
  readonly removeAction = input('remove-image');

  readonly picked = output<File>();
  readonly removed = output<void>();

  protected onChange(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    this.picked.emit(file);
    input.value = '';
  }
}
