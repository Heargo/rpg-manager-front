import { DOMAIN_CASES } from '../../../testing/pack-draft-domains';
import { draftOf } from '../../../testing/pack-draft-editor';
import { removeDomainKind, removeKind, setDomainKind, setKind } from './pack-draft-edits';

describe('pack draft edits on a kinds tree', () => {
  it('removeKind removes the kind together with its descendants, their texts and their sprite references', () => {
    const start = draftOf({
      kinds: {
        gear: { type: 'equipment' },
        blade: { parent: 'gear' },
        sword: { parent: 'blade' },
        potion: { type: 'consumable' },
      },
      generators: {
        items: {
          version: 2,
          kinds: { blade: { nouns: [{ text: 'Blade' }] }, sword: { nouns: [{ text: 'Sword' }] }, potion: { nouns: [{ text: 'Potion' }] } },
        },
      },
      sprites: [{ id: 's', label: 'S', kinds: ['sword', 'potion'], kind: 'grayscale', image: new Blob(['x']) }],
    });

    const after = removeKind(start, 'gear') as any;

    expect(Object.keys(after.kinds)).toEqual(['potion']);
    expect(Object.keys(after.generators.items.kinds)).toEqual(['potion']);
    expect(after.sprites[0].kinds).toEqual(['potion']);
  });

  it('removeKind on a leaf leaves its siblings and its parent', () => {
    const start = draftOf({ kinds: { gear: {}, blade: { parent: 'gear' }, axe: { parent: 'gear' } } });

    expect(Object.keys(removeKind(start, 'blade').kinds)).toEqual(['gear', 'axe']);
  });

  it('setKind adds a root kind (no parent) and a child kind (parent set)', () => {
    const root = setKind(draftOf(), 'gear', { type: 'equipment' });
    const child = setKind(root, 'blade', { parent: 'gear' });

    expect(child.kinds).toEqual({ gear: { type: 'equipment' }, blade: { parent: 'gear' } });
  });

  describe.each(DOMAIN_CASES)('on $domain', (c) => {
    it('removeDomainKind removes the kind together with its descendants and their texts, and keeps the others', () => {
      const start = draftOf({
        [c.field]: { folk: c.root, elder: { parent: 'folk' }, sage: { parent: 'elder' }, other: c.root },
        generators: {
          [c.domain]: { version: 2, kinds: { elder: { nouns: [{ text: 'Elder' }] }, other: { nouns: [{ text: 'Other' }] } } },
        },
      }) as any;

      const after = removeDomainKind(start, c.domain, 'folk') as any;

      expect(Object.keys(after[c.field])).toEqual(['other']);
      expect(Object.keys(after.generators[c.domain].kinds)).toEqual(['other']);
    });

    it('setDomainKind adds a root kind and a child kind with its parent', () => {
      const root = setDomainKind(draftOf(), c.domain, 'folk', c.root);
      const child = setDomainKind(root, c.domain, 'elder', { parent: 'folk' });

      expect((child as any)[c.field]).toEqual({ folk: c.root, elder: { parent: 'folk' } });
    });

    it('setDomainKind edits the fields of a kind and keeps its parent', () => {
      const start = draftOf({ [c.field]: { folk: c.root, elder: { parent: 'folk' } } });

      const after = setDomainKind(start, c.domain, 'elder', c.patch) as any;

      expect(after[c.field]['elder']).toEqual({ parent: 'folk', ...c.patch });
    });
  });
});
