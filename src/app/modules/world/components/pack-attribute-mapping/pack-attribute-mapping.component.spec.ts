import { TestBed } from '@angular/core/testing';
import { chooseSelectOption } from '../../../../../testing/select-overlay';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
// The component does not exist yet: the missing module is part of the red.
import { PackAttributeMappingComponent } from './pack-attribute-mapping.component';

/**
 * Contract: `app-pack-attribute-mapping` takes `missing` (pack attributes `{ id, name }` the world lacks) and `attributes`
 * (the world's `{ id, name }`). One `[data-field="attribute"]` row per missing attribute shows its name and holds a
 * `p-select[data-field="choice"]` whose options are, in order: add to the world, skip, then each world attribute. The default
 * is add. Buttons `[data-action="confirm"]` (emits `confirmed` with `{ <packAttributeId>: 'add' | 'skip' | <worldAttributeId> }`)
 * and `[data-action="cancel"]` (emits `cancelled`).
 */
describe('PackAttributeMappingComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [PackAttributeMappingComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(PackAttributeMappingComponent);
    fixture.componentRef.setInput('missing', [
      { id: 'str', name: 'Force' },
      { id: 'agi', name: 'Agilite' },
    ]);
    fixture.componentRef.setInput('attributes', [
      { id: 'w1', name: 'Life' },
      { id: 'w2', name: 'Mana' },
    ]);
    const confirmed: unknown[] = [];
    const cancelled: unknown[] = [];
    fixture.componentInstance.confirmed.subscribe((v: unknown) => confirmed.push(v));
    fixture.componentInstance.cancelled.subscribe((v: unknown) => cancelled.push(v));
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };
    await settle();
    const rows = () => el.querySelectorAll<HTMLElement>('[data-field="attribute"]');
    const choose = (row: number, option: number) =>
      chooseSelectOption(rows()[row].querySelector<HTMLElement>('[data-field="choice"]')!, option, settle);
    const press = async (action: string) => {
      el.querySelector<HTMLElement>(`[data-action="${action}"]`)!.click();
      await settle();
    };
    return { el, rows, choose, press, confirmed, cancelled };
  }

  it('shows one row per missing attribute', async () => {
    const { rows } = await setup();

    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain('Force');
    expect(rows()[1].textContent).toContain('Agilite');
  });

  it('confirms adding every attribute by default', async () => {
    const { press, confirmed } = await setup();

    await press('confirm');

    expect(confirmed).toEqual([{ str: 'add', agi: 'add' }]);
  });

  it('confirms a mapping to an existing attribute and a skip', async () => {
    const { choose, press, confirmed } = await setup();

    await choose(0, 3); // Mana
    await choose(1, 1); // skip
    await press('confirm');

    expect(confirmed).toEqual([{ str: 'w2', agi: 'skip' }]);
  });

  it('emits cancelled and no mapping on cancel', async () => {
    const { press, confirmed, cancelled } = await setup();

    await press('cancel');

    expect(cancelled).toHaveLength(1);
    expect(confirmed).toEqual([]);
  });
});
