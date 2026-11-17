import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideBasePackOnDisk } from '../../../../testing/base-pack-on-disk';
import { STARTER_SNAPSHOT } from '../../../../testing/starter-snapshot';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { LanguageBusiness } from '../../../core/business/language.business';
import { SandboxWorldBusiness } from './sandbox-world.business';

describe.each([
  ['en', ['Warrior', 'Mage', 'Rogue']],
  ['fr', ['Guerrier', 'Mage', 'Voleur']],
] as const)('the sandbox world gets the classes and skills of Base (%s)', (lang, classNames) => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideBasePackOnDisk()] });
    TestBed.inject(LanguageBusiness).setLanguage(lang);
  });

  it('imports them from the Base pack of the language', async () => {
    const sandbox = TestBed.inject(SandboxWorldBusiness);

    await vi.waitFor(() => expect(sandbox.$world().classes.map((c) => c.name)).toEqual(classNames));

    const world = sandbox.$world();
    const wanted = STARTER_SNAPSHOT[`${lang}-full`].skills.map((s) => s.name).sort();
    expect(world.skills.map((s) => s.name).sort()).toEqual(wanted);
    expect(world.skills.every((s) => s.id.startsWith(`base-${lang}:`))).toBe(true);
    expect(world.classes.every((c) => c.tree.every((n) => world.skills.some((s) => s.id === n.skillId)))).toBe(true);
  });
});
