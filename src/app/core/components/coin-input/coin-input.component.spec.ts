import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { CoinInputComponent } from './coin-input.component';

/**
 * Contract: two-way `value` model holding integer copper; three native `input[name="gold|silver|copper"]`
 * fields showing the split amounts. Typing in one updates `value`.
 */
async function render(value: number) {
  TestBed.configureTestingModule({ imports: [CoinInputComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(CoinInputComponent);
  fixture.componentRef.setInput('value', value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const field = (name: string) => el.querySelector(`input[name="${name}"]`) as HTMLInputElement;
  const type = async (name: string, text: string) => {
    field(name).value = text;
    field(name).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  return { fixture, field, type };
}

describe('CoinInputComponent', () => {
  it('shows the copper value as gold, silver and copper fields', async () => {
    const { field } = await render(11203);
    expect(field('gold').value).toBe('1');
    expect(field('silver').value).toBe('12');
    expect(field('copper').value).toBe('3');
  });

  it('updates the copper value when a field is typed in', async () => {
    const { fixture, type } = await render(11203);
    await type('gold', '2');
    expect(fixture.componentInstance.value()).toBe(21203);
    await type('silver', '5');
    expect(fixture.componentInstance.value()).toBe(20503);
    await type('copper', '40');
    expect(fixture.componentInstance.value()).toBe(20540);
  });

  it('folds 150 silver into 1 gold 50 silver', async () => {
    const { fixture, type } = await render(0);
    await type('silver', '150');
    expect(fixture.componentInstance.value()).toBe(15000);
  });

  it('treats an empty field as zero', async () => {
    const { fixture, type } = await render(11203);
    await type('gold', '');
    expect(fixture.componentInstance.value()).toBe(1203);
  });
});
