import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { CharacterBusiness } from '../../business/character.business';
import { CreateCharacterPageComponent } from './create-character-page.component';

const world = {
  name: 'Eldoria',
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  startingStatPoints: 3,
  startingMoney: 0,
};
const choices = [
  { id: 'mage', name: 'Mage', description: 'Casts spells', bonuses: [{ attribute: 'Life', value: 2 }] },
  { id: 'warrior', name: 'Warrior', description: 'Hits hard' },
];

async function render(classChoices: typeof choices) {
  const create = vi.fn(async () => ({ id: 'c' }));
  const business = {
    $world: signal(world),
    $myCharacter: signal(undefined),
    $characters: signal([]),
    loadClassChoices: vi.fn(async () => classChoices),
    create,
    describeError: (e: unknown) => String(e),
  };
  TestBed.configureTestingModule({
    imports: [CreateCharacterPageComponent],
    providers: [...TEST_PROVIDERS, { provide: CharacterBusiness, useValue: business }],
  });
  const fixture = TestBed.createComponent(CreateCharacterPageComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const typeName = async (name: string) => {
    const input = el.querySelector<HTMLInputElement>('#character-name')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  return { fixture, el, create, typeName, submit };
}

describe('CreateCharacterPageComponent class step', () => {
  it('shows a card per class, with name, description and bonuses', async () => {
    const { el } = await render(choices);

    const cards = Array.from(el.querySelectorAll('[data-testid="class-card"]'));
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Mage');
    expect(cards[0].textContent).toContain('Casts spells');
    expect(cards[0].textContent).toContain('Life');
    expect(cards[0].textContent).toContain('+2');
    expect(cards[1].textContent).toContain('Warrior');
  });

  it('requires a choice to finish, and sends the chosen classId', async () => {
    const { fixture, el, create, typeName, submit } = await render(choices);
    await typeName('Ada');
    expect(submit().disabled).toBe(true);

    el.querySelectorAll<HTMLElement>('[data-testid="class-card"]')[1].click();
    await fixture.whenStable();
    expect(submit().disabled).toBe(false);

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(create).toHaveBeenCalledWith('Ada', undefined, 'warrior');
  });

  it('skips the step when the world has no classes', async () => {
    const { fixture, el, create, typeName, submit } = await render([]);
    await typeName('Ada');

    expect(el.querySelector('[data-testid="class-card"]')).toBeNull();
    expect(submit().disabled).toBe(false);

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(create).toHaveBeenCalledWith('Ada', undefined, undefined);
  });
});
