import { inject, Injectable } from '@angular/core';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { validateWorldRules } from '../../world/helpers/world-rules.rules';
import { World, WorldRules } from '../../world/models/world';

/**
 * The rules page's stand-in for `WorldSessionBusiness` in the Tools: edits the shared sandbox world in memory, nothing
 * is saved or published. Provided by the tool route.
 */
@Injectable()
export class SandboxRulesBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);

  readonly $world = this.sandbox.$world;

  async saveRules(rules: WorldRules): Promise<World> {
    if (Object.keys(validateWorldRules(rules)).length)
      throw new Error('Invalid world rules');
    return this.sandbox.applyRules(rules);
  }
}
