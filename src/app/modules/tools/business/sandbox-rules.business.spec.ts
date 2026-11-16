import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { ActivePacksBusiness } from '../../../core/business/active-packs.business';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { WorldRules } from '../../world/models/world';
import { SandboxRulesBusiness } from './sandbox-rules.business';

describe('SandboxRulesBusiness language', () => {
  it('passes a language change to the sandbox world and the generators', async () => {
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), SandboxRulesBusiness],
    });
    const rules = TestBed.inject(SandboxRulesBusiness);
    const w = TestBed.inject(SandboxWorldBusiness).$world();
    const other = w.language === 'fr' ? 'en' : 'fr';

    await rules.saveRules({ ...w, language: other } as WorldRules);

    expect(TestBed.inject(SandboxWorldBusiness).$world().language).toBe(other);
    expect(TestBed.inject(ActivePacksBusiness).$worldLanguage()).toBe(other);
  });
});
