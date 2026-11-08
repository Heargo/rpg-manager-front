import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkillCatalogueBusiness } from '../../../skill/business/skill-catalogue.business';
import { SkillCataloguePageComponent } from '../../../skill/pages/skill-catalogue-page/skill-catalogue-page.component';
import { SandboxSkillCatalogueBusiness } from '../../business/sandbox-skill-catalogue.business';

/** Tool: the skill catalogue page on the sandbox world, in memory. Nothing is saved. */
@Component({
  selector: 'app-skill-catalogue-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkillCataloguePageComponent],
  providers: [
    {
      provide: SkillCatalogueBusiness,
      useClass: SandboxSkillCatalogueBusiness,
    },
  ],
  template: `<app-skill-catalogue-page />`,
})
export class SkillCatalogueToolPageComponent {}
