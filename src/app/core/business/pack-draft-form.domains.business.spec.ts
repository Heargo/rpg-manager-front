import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import baseEnClasses from '../../../../public/packs/base-en/generators/classes.json';
import baseEnCommon from '../../../../public/packs/base-en/generators/common.json';
import baseEnItems from '../../../../public/packs/base-en/generators/items.json';
import baseEnNpcs from '../../../../public/packs/base-en/generators/npcs.json';
import baseEnSkills from '../../../../public/packs/base-en/generators/skills.json';
import { provideBasePack } from '../../../testing/base-pack';
import { DOMAIN_CASES } from '../../../testing/pack-draft-domains';
import { draftOf } from '../../../testing/pack-draft-editor';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackDraftFormBusiness } from './pack-draft-form.business';

function setup(): any {
  globalThis.indexedDB = new IDBFactory();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideBasePack({
        'packs/base-en/generators/items.json': baseEnItems,
        'packs/base-en/generators/common.json': baseEnCommon,
        'packs/base-en/generators/npcs.json': baseEnNpcs,
        'packs/base-en/generators/skills.json': baseEnSkills,
        'packs/base-en/generators/classes.json': baseEnClasses,
      }),
      provideTestTranslations(),
    ],
  });
  return TestBed.inject(PackDraftFormBusiness);
}

/** What the Base of the language already has: a kind and its first noun, per domain. */
const BASE_KIND: Record<string, { id: string; noun?: string }> = {
  npcs: { id: 'peasant', noun: 'Farmer' },
  skills: { id: 'strike', noun: 'Strike' },
  classes: { id: 'mage', noun: 'Mage' },
};

describe.each(DOMAIN_CASES)('PackDraftFormBusiness on $domain', (c) => {
  const zorb = () =>
    draftOf({
      [c.field]: { zorb: c.root },
      generators: { [c.domain]: { version: 2, ...c.top, kinds: { zorb: c.texts } } },
    });

  it('knownKeys lists the domain kinds of the installed packs with their first noun, and the draft kinds', async () => {
    const keys = await setup().knownKeys(zorb());

    const list = keys.domainKinds[c.domain];
    expect(list).toContainEqual(BASE_KIND[c.domain]);
    expect(list).toContainEqual({ id: 'zorb', noun: 'Zorbling' });
    expect(keys.kinds).not.toContainEqual({ id: 'zorb', noun: 'Zorbling' });
  });

  it('previewDomain draws 3 entries of the kind, named with its noun, from the draft plus the Base', async () => {
    const drawn = await setup().previewDomain(zorb(), c.domain, 'zorb');

    expect(drawn).toHaveLength(3);
    for (const entry of drawn) expect(entry.name).toContain('Zorbling');
  });

  it('previewDomain draws the number asked for and is deterministic', async () => {
    const business = setup();

    expect(await business.previewDomain(zorb(), c.domain, 'zorb', 5)).toHaveLength(5);
    expect(await business.previewDomain(zorb(), c.domain, 'zorb')).toEqual(
      await business.previewDomain(zorb(), c.domain, 'zorb'),
    );
  });

  it('previewDomain draws nothing for a kind the draft and the Base do not know', async () => {
    expect(await setup().previewDomain(zorb(), c.domain, 'ghost')).toEqual([]);
  });

  it('issues maps a kind error to its domain and kind id, and is empty for a sound draft', async () => {
    const business = setup();
    const broken = draftOf({ [c.field]: { bad: { roles: [], type: 'nope', skills: ['Not Kebab'] } } });

    const issues = await business.issues(broken);

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', domain: c.domain, kind: 'bad' }));
    expect(await business.issues(zorb())).toEqual([]);
  });

  it('issues reports a language file in the old format as an error of the domain', async () => {
    const issues = await setup().issues(draftOf({ generators: { [c.domain]: { version: 1 } } }));

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', domain: c.domain }));
  });
});
