import { createPointerKind } from './pointer-kind';

const pointer = (pointerType: string) => ({ pointerType }) as unknown as Event;

describe('pointer kind', () => {
  let time = 0;
  const kind = () => createPointerKind(() => time);

  beforeEach(() => (time = 10_000));

  it('takes a desktop mouse for a mouse', () => {
    const k = kind();
    expect(k.isMouseHover(pointer('mouse'))).toBe(true);
    k.down(pointer('mouse'));
    expect(k.isMouseClick(pointer('mouse'))).toBe(true);
  });

  it('takes an iPhone tap for a tap, although Safari says its click is a mouse', () => {
    const k = kind();
    k.down(pointer('touch'));
    time += 80;
    expect(k.isMouseHover(pointer('mouse'))).toBe(false);
    expect(k.isMouseClick(pointer('mouse'))).toBe(false);
  });

  it('takes an old-style click with no pointer type from its press', () => {
    const k = kind();
    k.down(pointer('touch'));
    expect(k.isMouseClick(new MouseEvent('click'))).toBe(false);
    k.down(pointer('mouse'));
    expect(k.isMouseClick(new MouseEvent('click'))).toBe(true);
  });

  it('trusts the mouse again a while after a touch (a tablet with a mouse)', () => {
    const k = kind();
    k.down(pointer('touch'));
    time += 5000;
    expect(k.isMouseHover(pointer('mouse'))).toBe(true);
  });

  it('never takes a keyboard click for a mouse', () => {
    expect(kind().isMouseClick(new MouseEvent('click'))).toBe(false);
  });
});
