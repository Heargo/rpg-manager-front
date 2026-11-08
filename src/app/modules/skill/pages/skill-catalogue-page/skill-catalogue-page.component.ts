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
import { SkillCatalogueBusiness } from '../../business/skill-catalogue.business';
import { SkillCatalogueComponent } from '../../components/skill-catalogue/skill-catalogue.component';
import { SkillEditorComponent } from '../../components/skill-editor/skill-editor.component';
import { Skill } from '../../models/skill';

/** The skill catalogue: the hosted world's for the game master, or the sandbox world's in the Tools. */
@Component({
  selector: 'app-skill-catalogue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    MessageModule,
    SkillCatalogueComponent,
    SkillEditorComponent,
  ],
  template: `
    <div class="main-container catalogue">
      <header>
        <h1>{{ 'skill.catalogue.title' | transloco }}</h1>
        @if (tool) {
          <p class="hint">{{ 'skill.catalogue.toolIntro' | transloco }}</p>
        } @else {
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            [label]="'skill.catalogue.back' | transloco"
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
            [label]="'skill.editor.back' | transloco"
            (onClick)="editing.set(null)"
          />
          <app-skill-editor
            [world]="world"
            [skill]="target === 'new' ? undefined : target"
            (save)="save($event)"
          />
        } @else {
          <app-skill-catalogue
            [skills]="world.skills"
            (create)="editing.set('new')"
            (edit)="editing.set($event)"
            (duplicate)="run(catalogue.duplicate($event.id))"
            (remove)="remove($event)"
          />
        }
      } @else {
        <p-message severity="info">{{
          'skill.catalogue.notHosting' | transloco
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
export class SkillCataloguePageComponent {
  protected readonly catalogue = inject(SkillCatalogueBusiness);
  protected readonly tool = !!inject(ActivatedRoute).snapshot.data['tool'];
  protected readonly editing = signal<Skill | 'new' | null>(null);
  private readonly messages = inject(MessageService);
  private readonly language = inject(LanguageBusiness);

  protected save(skill: Skill): Promise<void> {
    return this.run(
      this.catalogue.save(skill).then(() => this.editing.set(null)),
    );
  }

  protected remove(skill: Skill): Promise<void> {
    return this.run(
      this.catalogue.remove(skill.id).then(({ removed, usages }) => {
        if (removed) return;
        this.messages.add({
          severity: MessageLevel.Warning,
          summary: this.language.t('skill.catalogue.inUse', {
            name: skill.name,
            usages: usages.map((usage) => usage.name).join(', '),
          }),
          life: 6000,
        });
      }),
    );
  }

  protected async run(action: Promise<unknown>): Promise<void> {
    try {
      await action;
    } catch {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('skill.catalogue.failed'),
        life: 4000,
      });
    }
  }
}
