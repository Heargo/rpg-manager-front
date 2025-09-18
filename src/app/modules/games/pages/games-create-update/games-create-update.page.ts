import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
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
import { ColorPickerModule } from 'primeng/colorpicker';
import { Attribute } from '../../models/attributes.interface';
import { AppFile, Game } from '../../models/game.interface';
import { GamesBusiness } from '../../business/games.business';
import { StepperModule } from 'primeng/stepper';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
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
    StepperModule,
    CardModule,
    ColorPickerModule,
    SelectButtonModule,
    InputNumberModule,
  ],
  templateUrl: './games-create-update.page.html',
  styleUrl: './games-create-update.page.scss',
})
export class GamesCreateUpdatePage {
  private readonly gameBusiness = inject(GamesBusiness);
  private readonly route = inject(ActivatedRoute);
  private readonly $routeParams = toSignal(this.route.params);
  private readonly $gameId = computed(() => {
    const params = this.$routeParams();
    return params ? params['id'] : null;
  });

  public $game = signal<Game | null>(null);

  constructor() {
    // when gameId changes, load the appropriate game
    effect(() => {
      const gameId = this.$gameId();
      if (gameId) {
        console.log('Loading game for editing with id:', gameId);
        this.gameBusiness.getGameById(gameId).then((game) => {
          this.$game.set(game);
          if (!game) return;
          console.log('Loaded game for editing:', game);
          this.form.patchValue(game);
          this.$attributes.set(game.attributes ?? []);
          this.$gameImagePreview.set(this.gameBusiness.getGameImageUrl(game));
        });
      }
    });
  }

  protected $gameImagePreview = signal<string | null>(null);
  protected $attributes = signal<Attribute[]>([]);
  protected file?: File;

  protected form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl<string>('', { nonNullable: true }),
    image: new FormControl<AppFile | undefined>(undefined, {
      nonNullable: true,
    }),
    startingMoney: new FormControl<number>(0, { nonNullable: true }),
    startingStatsPoints: new FormControl<number>(0, { nonNullable: true }),
  });

  protected attributeForm = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    maxValue: new FormControl<number | undefined>(undefined, {
      nonNullable: true,
    }),
    dynamic: new FormControl<boolean>(false, { nonNullable: true }),
    color: new FormControl<string>('#5077b1ff', { nonNullable: true }),
    statsPointCost: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.required],
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
  onMoveAttributeUp(index: number) {
    if (index <= 0) return;
    this.$attributes.update((attrs) => {
      const newAttrs = [...attrs];
      const temp = newAttrs[index - 1];
      newAttrs[index - 1] = newAttrs[index];
      newAttrs[index] = temp;
      return newAttrs;
    });
  }

  onUpload(event: any) {
    this.$gameImagePreview.set(
      event.files[0] ? event.files[0].objectURL : null
    );
    this.file = event.files[0];
  }

  onSubmit() {
    const formValue = this.form.getRawValue();
    const attributes = this.$attributes();
    const game = this.$game();
    if (game) {
      console.log('Updating game with id:', game.id);
      // Update existing game
      this.gameBusiness.updateGame(
        game.id,
        {
          ...formValue,
          attributes,
        },
        this.file
      );
    } else {
      console.log('Creating new game');
      // Create new game
      this.gameBusiness.createGame(
        {
          ...formValue,
          attributes,
        },
        this.file
      );
    }
  }
}
