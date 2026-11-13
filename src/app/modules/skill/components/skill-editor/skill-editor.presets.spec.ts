import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { By } from '@angular/platform-browser';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { FormulaPresetBusiness } from '../../business/formula-preset.business';
import { Skill } from '../../models/skill';
import { SkillEditorComponent } from './skill-editor.component';

/**
 * Hooks. Preset selects (p-select, ngModelChange with a preset id): `[data-field="success-preset"]` and one
 * `[data-field="effect-preset"]` per effect, each listing only presets of its kind. Picking a preset with placeholders
 * shows `[data-field="preset-mapping"]` with one `[data-placeholder="{A}"]` p-select per placeholder (ngModelChange with
 * an attribute name) and `[data-action="apply-preset"]`; a preset without placeholders fills the field at once.
 * `[data-action="save-preset"]` (per success formula / effect, same index rule as the field) opens
 * `[data-field="preset-form"]` with `[data-field="preset-name"]` input and `[data-action="confirm-save-preset"]`.
 * `[data-action="manage-presets"]` opens `[data-field="presets-dialog"]` (rendered anywhere in the document), one
 * `[data-preset="<id>"]` row each, with `[data-action="duplicate-preset"]` and, for user presets only,
 * `[data-action="delete-preset"]`.
 */
describe('SkillEditorComponent presets', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      {
        id: 'life',
        name: 'Life',
        baseValue: 10,
        formula: { preset: 'linear', step: 1 },
      },
      {
        id: 'str',
        name: 'Strength',
        baseValue: 5,
        formula: { preset: 'linear', step: 1 },
      },
    ],
  };
  const fireball: Skill = {
    id: 's1',
    name: 'Fireball',
    description: '',
    rarity: 'rare',
    type: 'active',
    maxLevel: 3,
    pointCost: 2,
    target: 'one-enemy',
    cooldown: 1,
    roll: { count: 1, faces: 20 },
    success: { mode: 'formula', formula: 'roll - 10' },
    effects: [{ kind: 'damage', attribute: 'Life', amount: 'skillLevel * 4' }],
  };

  async function setup() {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SkillEditorComponent],
      providers: [...TEST_PROVIDERS],
    });
    const presets = TestBed.inject(FormulaPresetBusiness);
    presets.create({
      name: 'Scaled',
      kind: 'effect',
      formula: '{A} * skillLevel',
      description: '',
    });
    presets.create({
      name: 'Flat',
      kind: 'effect',
      formula: '7',
      description: '',
    });
    presets.create({
      name: 'Versus',
      kind: 'success',
      formula: 'roll + {A} - {target.B}',
      description: '',
    });
    const idOf = (name: string) =>
      presets.$presets().find((p) => p.name === name)!.id;
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput('world', world);
    fixture.componentRef.setInput('skill', fireball);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const change = async (selector: string, value: unknown) => {
      fixture.debugElement
        .query(By.css(selector))
        .triggerEventHandler('ngModelChange', value);
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const click = async (selector: string) => {
      document.body.querySelector<HTMLElement>(selector)!.click();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const value = (name: string) =>
      el.querySelector<HTMLInputElement>(`[data-field="${name}"]`)!.value;
    return { fixture, el, presets, idOf, change, click, value };
  }

  it('fills the effect amount at once from a preset without placeholders', async () => {
    const { idOf, change, value } = await setup();
    await change('[data-field="effect-preset"]', idOf('Flat'));
    expect(value('effect-amount')).toBe('7');
  });

  it('asks which attribute each placeholder stands for, then writes the real names', async () => {
    const { el, idOf, change, click, value } = await setup();
    await change('[data-field="effect-preset"]', idOf('Scaled'));
    expect(el.querySelector('[data-field="preset-mapping"]')).not.toBeNull();
    expect(value('effect-amount')).toBe('skillLevel * 4');
    await change('[data-placeholder="{A}"]', 'Strength');
    await click('[data-action="apply-preset"]');
    expect(value('effect-amount')).toBe('Strength * skillLevel');
  });

  it('maps caster and target placeholders for the success formula', async () => {
    const { idOf, change, click, value } = await setup();
    await change('[data-field="success-preset"]', idOf('Versus'));
    await change('[data-placeholder="{A}"]', 'Strength');
    await change('[data-placeholder="{target.B}"]', 'Life');
    await click('[data-action="apply-preset"]');
    expect(value('success-formula')).toBe('roll + Strength - target_Life');
  });

  it('offers only presets of the right kind in each select', async () => {
    const { fixture } = await setup();
    const options = (selector: string) =>
      fixture.debugElement.query(By.css(selector)).componentInstance
        .options as { name: string }[];
    expect(
      options('[data-field="effect-preset"]').map((o) => o.name),
    ).toContain('Scaled');
    expect(
      options('[data-field="effect-preset"]').map((o) => o.name),
    ).not.toContain('Versus');
    expect(
      options('[data-field="success-preset"]').map((o) => o.name),
    ).toContain('Versus');
    expect(
      options('[data-field="success-preset"]').map((o) => o.name),
    ).not.toContain('Scaled');
  });

  it('saves the current formula as a preset with its attribute names turned into placeholders', async () => {
    const { fixture, el, presets, change, click } = await setup();
    await change(
      '[data-field="effect-preset"]',
      presets.$presets().find((p) => p.name === 'Flat')!.id,
    );
    const input = el.querySelector<HTMLInputElement>(
      '[data-field="effect-amount"]',
    )!;
    input.value = 'Life * 2 + target_Strength';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    el.querySelector<HTMLElement>(
      '[data-action="save-preset"][data-kind="effect"]',
    )!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const name = el.querySelector<HTMLInputElement>(
      '[data-field="preset-name"]',
    )!;
    name.value = 'Mine';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await click('[data-action="confirm-save-preset"]');
    expect(presets.$presets().at(-1)).toMatchObject({
      name: 'Mine',
      kind: 'effect',
      formula: '{A} * 2 + {target.B}',
    });
  });

  it('lists presets in the manage dialog: built-ins can only be duplicated, user ones deleted', async () => {
    const { fixture, presets, idOf, click } = await setup();
    fixture.nativeElement
      .querySelector('[data-action="manage-presets"]')
      .click();
    await fixture.whenStable();
    fixture.detectChanges();
    const row = (id: string) =>
      document.body.querySelector(
        `[data-field="presets-dialog"] [data-preset="${id}"]`,
      )!;
    const builtIn = presets.$presets().find((p) => p.builtIn)!.id;
    expect(
      row(builtIn).querySelector('[data-action="duplicate-preset"]'),
    ).not.toBeNull();
    expect(
      row(builtIn).querySelector('[data-action="delete-preset"]'),
    ).toBeNull();
    const user = idOf('Flat');
    expect(
      row(user).querySelector('[data-action="delete-preset"]'),
    ).not.toBeNull();
    const confirmation = TestBed.inject(ConfirmationService);
    const confirm = vi
      .spyOn(confirmation, 'confirm')
      .mockImplementation(() => confirmation);
    (
      row(user).querySelector('[data-action="delete-preset"]') as HTMLElement
    ).click();
    expect(presets.$presets().find((p) => p.id === user)).toBeDefined();
    confirm.mock.calls[0][0].accept?.();
    await fixture.whenStable();
    expect(presets.$presets().find((p) => p.id === user)).toBeUndefined();
    void click;
  });
});
