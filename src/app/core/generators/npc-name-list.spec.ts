import en from '../../../../public/packs/base-en/generators/npcs.json';
import fr from '../../../../public/packs/base-fr/generators/npcs.json';
import { validateNpcNameList } from './npc-name-list';

function clone(): Record<string, any> {
  return structuredClone(en) as Record<string, any>;
}

describe('validateNpcNameList', () => {
  it.each([
    ['en', en],
    ['fr', fr],
  ])('accepts the shipped %s NPC name list, with about 40 given names and 20 epithets', (_lang, json) => {
    const result = validateNpcNameList(json);
    expect(result.ok ? [] : result.errors).toEqual([]);
    const list = json as any;
    expect(list.given.length).toBeGreaterThanOrEqual(40);
    expect(list.epithets.length).toBeGreaterThanOrEqual(20);
  });

  it('rejects something that is not an object', () => {
    expect(validateNpcNameList([])).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('reports a wrong version and missing parts', () => {
    const json = clone();
    json['version'] = 2;
    delete json['given'];
    delete json['epithets'];
    delete json['templates'];

    const result = validateNpcNameList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('version must be 1');
    expect(result.errors).toContain('given must be a non-empty list');
    expect(result.errors).toContain('epithets must be a non-empty list');
    expect(result.errors).toContain('templates must be a non-empty list');
  });

  it('reports a given name without a text or with a bad gender', () => {
    const json = clone();
    json['given'] = [{ gender: 'm' }, { text: 'Aro', gender: 'x' }];

    const result = validateNpcNameList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('given[0] needs a "text"');
    expect(result.errors).toContain('given[1].gender must be "m" or "f"');
  });

  it('reports a bad epithet', () => {
    const json = clone();
    json['epithets'] = ['Grim', { m: 'Gris' }];

    const result = validateNpcNameList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('epithets[1] must be a string or { "m": …, "f": … }');
  });

  it('reports unknown placeholders and templates without {given}', () => {
    const json = clone();
    json['templates'] = ['{given} {nickname}', '{epithet}'];

    const result = validateNpcNameList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('templates: unknown placeholder {nickname} in "{given} {nickname}"');
    expect(result.errors).toContain('templates: "{epithet}" has no {given}');
  });
});
