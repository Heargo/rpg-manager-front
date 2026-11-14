import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { ITEM_RARITIES, ItemRarity } from '../../../../../core/models/item';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  setTemplates,
  templatesOf,
} from '../../../../../core/packs/pack-draft-edits';

/** The language's item name templates per rarity, one per line; only needed for a Base. */
@Component({
  selector: 'app-templates-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, MessageModule, TextareaModule],
  template: `
    @if (draft().details.language === undefined) {
      <p class="hint">{{ 'packs.creator.params.neutral' | translate }}</p>
    } @else {
      <small class="hint">{{
        'packs.creator.templates.hint' | translate
      }}</small>
      @for (rarity of rarities; track rarity) {
        <label class="field" [attr.data-test]="'templates-row-' + rarity">
          {{ 'item.rarity.' + rarity | translate }}
          <textarea
            pTextarea
            rows="2"
            [attr.data-test]="'templates-' + rarity"
            [value]="valueOf(rarity)"
            (change)="set(rarity, $event)"
          ></textarea>
        </label>
        @for (issue of issuesOf(rarity); track $index) {
          <p-message
            data-test="issue"
            size="small"
            [severity]="issue.level === 'error' ? 'error' : 'warn'"
            >{{ issue.message }}</p-message
          >
        }
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .field textarea {
      width: 100%;
      box-sizing: border-box;
    }
  `,
})
export class TemplatesEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  protected readonly rarities = ITEM_RARITIES;

  protected issuesOf(rarity: ItemRarity): DraftIssue[] {
    return this.issues().filter(
      (issue) => issue.rarity === rarity && !issue.kind && !issue.tint,
    );
  }

  protected valueOf(rarity: ItemRarity): string {
    return (templatesOf(this.draft())[rarity] ?? []).join('\n');
  }

  protected set(rarity: ItemRarity, event: unknown): void {
    const text = ((event as Event).target as HTMLTextAreaElement).value;
    const list = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    this.changed.emit(setTemplates(this.draft(), rarity, list));
  }
}
