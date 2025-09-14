import { Component, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { Attribute } from '../../models/attributes.interface';

@Component({
  selector: 'app-games-create-update',
  imports: [
    AccordionModule,
    InputTextModule,
    FormsModule,
    FloatLabelModule,
    TextareaModule,
    FileUploadModule,
    ButtonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './games-create-update.page.html',
  styleUrl: './games-create-update.page.scss',
})
export class GamesCreateUpdatePage {
  protected $gameImagePreview = signal<string | null>(null);
  protected $attributes = signal<Attribute[]>([]);

  protected form = new FormGroup({
    name: new FormControl<string>(''),
    description: new FormControl<string>(''),
    image: new FormControl<File | null>(null),
  });

  protected attributeForm = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    maxValue: new FormControl<number | undefined>(undefined, {
      nonNullable: true,
    }),
  });

  onAddAttribute() {
    if (this.attributeForm.valid) {
      this.$attributes.update((attrs) => [
        ...attrs,
        this.attributeForm.getRawValue(),
      ]);
      this.attributeForm.reset();
    }
  }

  onRemoveAttribute(index: number) {
    this.$attributes.update((attrs) => attrs.filter((_, i) => i !== index));
  }

  onUpload(event: any) {
    console.log(event);
    this.$gameImagePreview.set(
      event.files[0] ? event.files[0].objectURL : null
    );
  }
}
