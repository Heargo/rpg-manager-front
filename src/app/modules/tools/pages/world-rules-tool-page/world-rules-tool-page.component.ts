import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorldSessionBusiness } from '../../../world/business/world-session.business';
import { WorldRulesPageComponent } from '../../../world/pages/world-rules-page/world-rules-page.component';
import { SandboxRulesBusiness } from '../../business/sandbox-rules.business';

/** Tool: the world rules page on the sandbox world, in memory. Nothing is saved. */
@Component({
  selector: 'app-world-rules-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WorldRulesPageComponent],
  providers: [
    { provide: WorldSessionBusiness, useClass: SandboxRulesBusiness },
  ],
  template: `<app-world-rules-page />`,
})
export class WorldRulesToolPageComponent {}
