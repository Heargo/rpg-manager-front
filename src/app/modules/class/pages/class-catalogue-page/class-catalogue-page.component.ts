import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageModule } from '@openng/optimus-ui/message';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { ClassCatalogueBusiness } from '../../business/class-catalogue.business';
import { ClassCatalogueComponent } from '../../components/class-catalogue/class-catalogue.component';
import { ClassEditorComponent } from '../../components/class-editor/class-editor.component';
import { CharacterClass } from '../../models/class';

/** The class catalogue: the hosted world's for the game master, or the sandbox world's in the Tools. */
@Component({
  selector: 'app-class-catalogue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    ClassCatalogueComponent,
    ClassEditorComponent,
  ],
  template: `
    <div class="main-container catalogue">
      <header>
        <h1>{{ 'class.catalogue.title' | transloco }}</h1>
        @if (tool) {
          <p class="hint">{{ 'class.catalogue.toolIntro' | transloco }}</p>
        } @else {
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            [label]="'class.catalogue.back' | transloco"
            routerLink="/room"
          />
        }
      </header>
      @if (catalogue.$world(); as world) {
        @if (editing(); as target) {
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            [label]="'class.editor.back' | transloco"
            (onClick)="editing.set(null)"
          />
          <app-class-editor
            [world]="world"
            [characterClass]="target === 'new' ? undefined : target"
            (save)="save($event)"
          />
        } @else {
          <app-class-catalogue
            [classes]="world.classes"
            (create)="editing.set('new')"
            (edit)="editing.set($event)"
            (duplicate)="run(catalogue.duplicate($event.id))"
            (remove)="run(catalogue.remove($event.id))"
          />
        }
      } @else {
        <p-message severity="info">{{
          'class.catalogue.notHosting' | transloco
        }}</p-message>
      }
    </div>
  `,
  styles: `
    .catalogue {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }
    h1 {
      margin: 0;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class ClassCataloguePageComponent {
  protected readonly catalogue = inject(ClassCatalogueBusiness);
  protected readonly tool = !!inject(ActivatedRoute).snapshot.data['tool'];
  protected readonly editing = signal<CharacterClass | 'new' | null>(null);
  private readonly messages = inject(MessageService);
  private readonly language = inject(LanguageBusiness);

  protected save(characterClass: CharacterClass): Promise<void> {
    return this.run(
      this.catalogue.save(characterClass).then(() => this.editing.set(null)),
    );
  }

  protected async run(action: Promise<unknown>): Promise<void> {
    try {
      await action;
    } catch {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('class.catalogue.failed'),
        life: 4000,
      });
    }
  }
}
