import { DOMAIN_CASES } from '../../../testing/pack-draft-domains';
import { draftOf } from '../../../testing/pack-draft-editor';
import { validateClassWordList } from '../generators/class-word-list';
import { validateNpcWordList } from '../generators/npc-word-list';
import { validateSkillWordList } from '../generators/skill-word-list';
import { buildPack as build, PackDraft } from './pack-draft';
import * as edits from './pack-draft-edits';
import { validatePack } from './pack';

// Typed loosely: the domain edits and draft fields do not exist yet.
const e = edits as any;
const buildPack = (d: PackDraft): { manifest: any; files: Map<string, any> } => build(d) as any;
const VALIDATORS: Record<string, (json: unknown) => { ok: boolean }> = {
  npcs: validateNpcWordList,
  skills: validateSkillWordList,
  classes: validateClassWordList,
};

describe.each(DOMAIN_CASES)('pack draft edits and build: $domain', (c) => {
  const kinds = { folk: c.root, elder: { parent: 'folk' } };
  const list = (extra: Record<string, unknown> = {}) => ({
    version: 2,
    ...c.top,
    kinds: { folk: c.texts },
    ...extra,
  });

  it('builds the kinds into the manifest and the texts into the language file, and the pack validates', () => {
    const { manifest, files } = buildPack(draftOf({ [c.field]: kinds, generators: { [c.domain]: list() } }));

    expect(manifest.domains[c.domain]).toEqual({ kinds, texts: c.path });
    expect(files.get(c.path)).toEqual(list());
    const pack = validatePack(manifest);
    if (!pack.ok) throw new Error(pack.errors.join('\n'));
    expect(pack.warnings).toEqual([]);
    expect(VALIDATORS[c.domain](files.get(c.path)).ok).toBe(true);
  });

  it('writes only the kinds when the draft has no texts, and only the texts when it has no kinds', () => {
    expect(buildPack(draftOf({ [c.field]: kinds })).manifest.domains).toEqual({ [c.domain]: { kinds } });
    expect(buildPack(draftOf({ generators: { [c.domain]: list() } })).manifest.domains).toEqual({
      [c.domain]: { texts: c.path },
    });
  });

  it('setDomainKind creates a kind with its fields, changes one and clears a field given as undefined', () => {
    let draft = e.setDomainKind(draftOf(), c.domain, 'folk', c.root);
    expect((draft as any)[c.field]).toEqual({ folk: c.root });

    draft = e.setDomainKind(draft, c.domain, 'folk', c.patch);
    expect((draft as any)[c.field]['folk']).toEqual({ ...c.root, ...c.patch });

    draft = e.setDomainKind(draft, c.domain, 'folk', { [c.clear]: undefined });
    expect((draft as any)[c.field]['folk']).not.toHaveProperty(c.clear);
    expect(draft.kinds).toEqual({});
  });

  it('setDomainKindTexts sets the texts of a kind, replaces a field and prunes an empty one', () => {
    let draft = e.setDomainKindTexts(draftOf(), c.domain, 'folk', c.texts);
    expect((draft.generators as any)[c.domain]).toEqual({ version: 2, kinds: { folk: c.texts } });

    draft = e.setDomainKindTexts(draft, c.domain, 'folk', { adjectives: [], descriptions: ['Another.'] });
    const { adjectives: _adjectives, ...rest } = c.texts;
    expect((draft.generators as any)[c.domain].kinds.folk).toEqual({ ...rest, descriptions: ['Another.'] });

    const emptied = e.setDomainKindTexts(draft, c.domain, 'folk', {
      nouns: [],
      descriptions: [],
      names: [],
    });
    expect((emptied.generators as any)[c.domain] ?? {}).not.toHaveProperty('kinds');
  });

  it('setDomainTexts sets the top-level lists of the language file and prunes an empty one', () => {
    const [first] = Object.keys(c.top);
    let draft = e.setDomainTexts(draftOf(), c.domain, c.top);
    expect((draft.generators as any)[c.domain]).toEqual({ version: 2, ...c.top });

    draft = e.setDomainTexts(draft, c.domain, { [first]: [] });
    expect((draft.generators as any)[c.domain]).not.toHaveProperty(first);
  });

  it('ignores the texts of a neutral draft and keeps its kinds', () => {
    const neutral = draftOf({}, undefined);

    expect(e.setDomainKindTexts(neutral, c.domain, 'folk', c.texts)).toBe(neutral);
    expect(e.setDomainTexts(neutral, c.domain, c.top)).toBe(neutral);
    expect((e.setDomainKind(neutral, c.domain, 'folk', c.root) as any)[c.field]).toEqual({ folk: c.root });
  });

  it('renameDomainKind follows the parents and the texts, and refuses an id already taken', () => {
    const draft = draftOf({ [c.field]: kinds, generators: { [c.domain]: list() } });

    const renamed = e.renameDomainKind(draft, c.domain, 'folk', 'people');

    expect((renamed as any)[c.field]).toEqual({ people: c.root, elder: { parent: 'people' } });
    expect(Object.keys((renamed.generators as any)[c.domain].kinds)).toEqual(['people']);
    expect(e.renameDomainKind(draft, c.domain, 'folk', 'elder')).toBe(draft);
  });

  it('removeDomainKind removes the kind and its texts and leaves the other domains alone', () => {
    const draft = draftOf({
      [c.field]: kinds,
      kinds: { orb: { type: 'item' } },
      generators: { [c.domain]: list(), items: { version: 2, kinds: { orb: { nouns: [{ text: 'Orb' }] } } } },
    });

    const removed = e.removeDomainKind(draft, c.domain, 'folk');

    expect((removed as any)[c.field]).toEqual({}); // its child elder goes with it
    expect((removed.generators as any)[c.domain] ?? {}).not.toHaveProperty('kinds');
    expect(removed.kinds).toEqual({ orb: { type: 'item' } });
    expect((removed.generators as any).items.kinds.orb).toBeDefined();
  });
});

describe('renaming a skill kind', () => {
  it('follows the skill kinds a class favours', () => {
    const draft = draftOf({
      skillKinds: { bolt: { type: 'active' } },
      classKinds: { mage: { skills: ['bolt', 'strike'] } },
    });

    const renamed = e.renameDomainKind(draft, 'skills', 'bolt', 'zap');

    expect((renamed as any).classKinds).toEqual({ mage: { skills: ['zap', 'strike'] } });
  });
});
