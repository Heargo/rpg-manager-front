import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CharacterDetails } from '../../components/character-details/character-details';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  Character,
  CharacterCreationPayload,
} from '../../models/character.interface';
import { CharactersBusiness } from '../../business/characters.business';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import {
  FormControl,
  FormGroup,
  Validators,
  ɵInternalFormsSharedModule,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { UsersBusiness } from '../../../user/business/users.business';
import { GamesBusiness } from '../../../games/business/games.business';

@Component({
  selector: 'app-character-create-update',
  imports: [
    CharacterDetails,
    InputTextModule,
    FileUploadModule,
    TextareaModule,
    FloatLabelModule,
    AvatarModule,
    ButtonModule,
    ɵInternalFormsSharedModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './character-create-update.html',
  styleUrl: './character-create-update.scss',
})
export class CharacterCreateUpdate implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly characterBusiness = inject(CharactersBusiness);
  private readonly userBusiness = inject(UsersBusiness);
  private readonly gameBusiness = inject(GamesBusiness);

  protected $gameImagePreview = signal<string | undefined>(undefined);
  protected file?: File;

  protected form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl<string>('', { nonNullable: true }),
  });

  protected $characterId = toSignal<string | undefined>(
    this.route.paramMap.pipe(
      map((params) => {
        const id = params.get('id');
        console.log(
          'CharacterCreateUpdate: fetched characterId from route',
          id
        );
        return id ? id : undefined;
      })
    )
  );

  protected $character = signal<Character | null>(null);

  constructor() {
    effect(() => {
      const characterId = this.$characterId();
      console.log('CharacterCreateUpdate: characterId changed', characterId);
      if (characterId) {
        this.characterBusiness.getCharacterById(characterId).then((char) => {
          this.$character.set(char);
        });
      }
    });
  }

  ngOnInit() {
    const characterId = this.route.snapshot.paramMap.get('id');
    console.log(
      'CharacterDetails: fetched characterId from route',
      characterId
    );
  }

  onUpload(event: any) {
    this.$gameImagePreview.set(
      event.files[0] ? event.files[0].objectURL : undefined
    );
    this.file = event.files[0];
  }

  async createCharacter() {
    const formValues = this.form.getRawValue();
    const character: CharacterCreationPayload = {
      ...formValues,
      userId: this.userBusiness.$currentUser()!.id,
      gameId: this.gameBusiness.$currentGame()!.id,
    };
    const createdCharacter = await this.characterBusiness.createCharacter(
      character,
      this.file
    );
    console.log('Created character:', createdCharacter);
  }
}
