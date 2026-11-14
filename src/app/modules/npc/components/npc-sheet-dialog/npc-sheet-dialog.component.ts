import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { CharacterSheetComponent } from '../../../character/components/character-sheet/character-sheet.component';
import { NpcCatalogueBusiness } from '../../business/npc-catalogue.business';

/** Game master: a catalogue NPC's sheet, read-only, in the same layout as a character's. */
@Component({
  selector: 'app-npc-sheet-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, DialogModule, CharacterSheetComponent],
  template: `
    <p-dialog
      [visible]="!!sheet()"
      (visibleChange)="!$event && npcId.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [header]="'npc.sheet.title' | transloco"
      [style]="{ width: 'min(56rem, calc(100vw - 1rem))' }"
    >
      @if (sheet(); as s) {
        <app-character-sheet
          data-testid="npc-sheet"
          [character]="s.character"
          [world]="s.world"
          [classView]="s.classView"
        />
      }
    </p-dialog>
  `,
})
export class NpcSheetDialogComponent {
  private readonly catalogue = inject(NpcCatalogueBusiness);

  /** The NPC whose sheet is open; null closes the dialog. */
  readonly npcId = model<string | null>(null);

  protected readonly sheet = computed(() => {
    const id = this.npcId();
    return id ? this.catalogue.sheetOf(id) : null;
  });
}
