import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { validateWorldDraft } from './world-draft.rules';
import { createSandboxWorld, SANDBOX_WORLD_ID } from './default-world';

describe('createSandboxWorld', () => {
  let transloco: TranslocoService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    transloco = TestBed.inject(TranslocoService);
    await Promise.all(
      ['en', 'fr'].map((lang) => firstValueFrom(transloco.load(lang))),
    );
  });

  it.each([
    ['en', ['Life', 'Mana', 'Strength', 'Agility', 'Intelligence']],
    ['fr', ['Vie', 'Mana', 'Force', 'Agilité', 'Intelligence']],
  ])(
    'builds a valid world with the default attributes in %s',
    (lang, names) => {
      const world = createSandboxWorld((key) =>
        transloco.translate(key, {}, lang),
      );

      expect(world.id).toBe(SANDBOX_WORLD_ID);
      expect(world.attributes.map((attribute) => attribute.name)).toEqual(
        names,
      );
      expect(world.barAttributes).toEqual({
        life: world.attributes[0].id,
        mana: world.attributes[1].id,
      });
      expect(
        new Set(world.attributes.map((attribute) => attribute.id)).size,
      ).toBe(5);
      expect(world.name).not.toMatch(/^tools\./);
      expect(
        validateWorldDraft({ name: world.name, attributes: world.attributes }),
      ).toEqual({});
    },
  );

  it('defaults to Steep linear for Life and Linear for the others', () => {
    const world = createSandboxWorld((key) => transloco.translate(key, {}, 'en'));
    expect(world.attributes.map((attribute) => attribute.formula)).toEqual([
      { preset: 'steep-linear', step: 5 },
      { preset: 'linear', step: 1 },
      { preset: 'linear', step: 1 },
      { preset: 'linear', step: 1 },
      { preset: 'linear', step: 1 },
    ]);
  });

  it('is the same world every time', () => {
    const t = (key: string) => transloco.translate(key, {}, 'en');
    expect(createSandboxWorld(t)).toEqual(createSandboxWorld(t));
  });

  it('starts characters with 50 silver, as integer copper', () => {
    const world = createSandboxWorld((key) => transloco.translate(key, {}, 'en'));
    expect(world.startingMoney).toBe(5000);
  });
});
