import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { FormulaPresetBusiness } from '../../business/formula-preset.business';
import { SkillEditorComponent } from './skill-editor.component';

describe('SkillEditorComponent preset select reset', () => {
  it('is empty again after each pick, so the same preset can be picked twice', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SkillEditorComponent],
      providers: [...TEST_PROVIDERS],
    });
    const presets = TestBed.inject(FormulaPresetBusiness);
    presets.create({
      name: 'Flat',
      kind: 'effect',
      formula: '7',
      description: '',
    });
    const id = presets.$presets().find((p) => p.name === 'Flat')!.id;
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput(
      'world',
      createSandboxWorld((key) => key),
    );
    fixture.componentRef.setInput('skill', {
      id: 's1',
      name: 'F',
      description: '',
      rarity: 'rare',
      type: 'passive',
      maxLevel: 3,
      pointCost: 1,
      effects: [{ kind: 'modify', attribute: 'x', amount: '1', duration: 0 }],
    });
    await fixture.whenStable();
    const select = fixture.debugElement.query(
      By.css('[data-field="effect-preset"]'),
    );
    const input = () =>
      fixture.nativeElement.querySelector(
        '[data-field="effect-amount"]',
      ) as HTMLInputElement;
    for (let i = 0; i < 2; i++) {
      select.componentInstance.writeValue(id);
      select.triggerEventHandler('ngModelChange', id);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(select.componentInstance.modelValue()).toBeNull();
      expect(input().value).toBe('7');
      input().value = '1';
      input().dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
    }
  });
});
