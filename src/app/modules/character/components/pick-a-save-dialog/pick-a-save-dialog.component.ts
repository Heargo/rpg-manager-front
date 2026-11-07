import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';
import { differingFields } from '../../../room/helpers/player-copy.rules';
import { Character } from '../../../world/models/world';
import { PlayerCopyConflict } from '../../models/player-copy';

const FIELDS = [
  'name',
  'portraitId',
  'statPoints',
  'money',
  'attributes',
  'inventory',
  'rev',
  'updatedAt',
] as const;

/** Both versions of a player's character side by side, the differing fields highlighted; the game master picks one. */
@Component({
  selector: 'app-pick-a-save-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ButtonModule, LocalDatePipe],
  templateUrl: './pick-a-save-dialog.component.html',
  styleUrl: './pick-a-save-dialog.component.scss',
})
export class PickASaveDialogComponent {
  readonly conflict = input.required<PlayerCopyConflict>();
  readonly keepHost = output<void>();
  readonly usePlayer = output<void>();

  protected readonly rows = computed(() => {
    const { host, player } = this.conflict();
    const differs = differingFields(host, player);
    return FIELDS.map((field) => ({
      field,
      differs: differs.includes(field),
      host: host[field],
      player: player[field],
    }));
  });

  protected show(value: Character[keyof Character]): string {
    if (value === undefined || value === null) return '—';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}
