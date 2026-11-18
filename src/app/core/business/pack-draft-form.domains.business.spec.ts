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

  describe('previewDomain on a kind without nouns of its own', () => {
    const tree = (kinds: Record<string, unknown>, texts: Record<string, unknown>) =>
      draftOf({
        // A kind that is not a person: an NPC kind draws its nouns, not the given names.
        [c.field]: Object.fromEntries(
          Object.entries({ tree: c.root, ...kinds }).map(([id, kind]) => [
            id,
            c.domain === 'npcs' ? { ...(kind as object), person: false } : kind,
          ]),
        ),
        generators: { [c.domain]: { version: 2, ...c.top, kinds: texts } },
      });

    it('draws each entry from a descendant that has nouns, with its kind id', async () => {
      const draft = tree(
        { oak: { parent: 'tree' }, elm: { parent: 'tree' } },
        { oak: { ...c.texts, nouns: [{ text: 'Oakling' }] }, elm: { ...c.texts, nouns: [{ text: 'Elmling' }] } },
      );

      const drawn = await setup().previewDomain(draft, c.domain, 'tree', 20);

      expect(drawn).toHaveLength(20);
      expect(new Set(drawn.map((entry: any) => entry.kind))).toEqual(new Set(['oak', 'elm']));
      for (const entry of drawn)
        expect(entry.name).toContain(entry.kind === 'oak' ? 'Oakling' : 'Elmling');
    });

    it('reaches descendants of any depth', async () => {
      const draft = tree(
        { mid: { parent: 'tree' }, leaf: { parent: 'mid' } },
        { leaf: { ...c.texts, nouns: [{ text: 'Leafling' }] } },
      );

      const drawn = await setup().previewDomain(draft, c.domain, 'tree');

      expect(drawn).toHaveLength(3);
      for (const entry of drawn) expect(entry.kind).toBe('leaf');
    });

    it('draws nothing when no descendant has nouns either', async () => {
      const draft = tree({ oak: { parent: 'tree' } }, {});

      expect(await setup().previewDomain(draft, c.domain, 'tree')).toEqual([]);
    });

    it('still draws from the kind itself when it has nouns', async () => {
      const draft = tree(
        { oak: { parent: 'tree' } },
        { tree: { ...c.texts, nouns: [{ text: 'Treeling' }] }, oak: { ...c.texts, nouns: [{ text: 'Oakling' }] } },
      );

      const drawn = await setup().previewDomain(draft, c.domain, 'tree');

      expect(drawn).toHaveLength(3);
      for (const entry of drawn) {
        expect(entry.kind).toBe('tree');
        expect(entry.name).toContain('Treeling');
      }
    });
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
