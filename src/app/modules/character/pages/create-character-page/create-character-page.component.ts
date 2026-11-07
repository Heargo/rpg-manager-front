import { CoinDisplayComponent } from '../../../../core/components/coin-display/coin-display.component';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { FileUploadHandlerEvent, FileUploadModule } from '@openng/optimus-ui/fileupload';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { CharacterBusiness } from '../../business/character.business';
import { CHARACTER_NAME_MAX_LENGTH } from '../../models/character-api';

/** A player's first step in a room: name and portrait; everything else comes from the world's defaults. */
@Component({
  selector: 'app-create-character-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, TranslocoPipe, ButtonModule, CardModule, FileUploadModule, InputTextModule, MessageModule, CoinDisplayComponent],
  templateUrl: './create-character-page.component.html',
  styleUrl: './create-character-page.component.scss',
})
export class CreateCharacterPageComponent {
  protected readonly characters = inject(CharacterBusiness);
  private readonly router = inject(Router);

  protected readonly maxLength = CHARACTER_NAME_MAX_LENGTH;
  protected readonly name = signal('');
  protected readonly portrait = signal<File | null>(null);
  protected readonly portraitUrl = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly canCreate = computed(() => !!this.name().trim() && !this.creating());

  constructor() {
    // Nothing to do here once the player has a character (or isn't in a room).
    effect(() => {
      if (this.creating()) return;
      if (this.characters.$myCharacter() || this.characters.$characters() === null) void this.router.navigate(['/room']);
    });
  }

  protected choosePortrait(event: FileUploadHandlerEvent): void {
    const file = event.files[0] ?? null;
    const previous = this.portraitUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.portrait.set(file);
    this.portraitUrl.set(file ? URL.createObjectURL(file) : null);
  }

  protected async create(): Promise<void> {
    if (!this.canCreate()) return;
    this.creating.set(true);
    this.error.set(null);
    try {
      await this.characters.create(this.name(), this.portrait() ?? undefined);
      await this.router.navigate(['/room/table']);
    } catch (error) {
      this.error.set(this.characters.describeError(error));
    } finally {
      this.creating.set(false);
    }
  }
}
