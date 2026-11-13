import { compositeCommand, History } from './history';

function counter() {
  const state = { value: 0 };
  const add = (n: number) => ({
    redo: () => (state.value += n),
    undo: () => (state.value -= n),
  });
  return { state, add };
}

describe('History', () => {
  it('executes, undoes and redoes commands', () => {
    const { state, add } = counter();
    const history = new History();
    history.execute(add(1));
    history.execute(add(10));
    expect(state.value).toBe(11);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    history.undo();
    expect(state.value).toBe(1);
    expect(history.canRedo()).toBe(true);
    history.redo();
    expect(state.value).toBe(11);
  });

  it('does nothing when there is nothing to undo or redo', () => {
    const { state } = counter();
    const history = new History();
    history.undo();
    history.redo();
    expect(state.value).toBe(0);
    expect(history.canUndo()).toBe(false);
  });

  it('clears the redo stack on a new action', () => {
    const { add } = counter();
    const history = new History();
    history.execute(add(1));
    history.undo();
    history.execute(add(2));
    expect(history.canRedo()).toBe(false);
  });

  it('treats a composite command (a brush stroke) as one entry', () => {
    const { state, add } = counter();
    const history = new History();
    const stroke = compositeCommand([add(1), add(2), add(4)]);
    history.execute(stroke);
    expect(state.value).toBe(7);
    history.undo();
    expect(state.value).toBe(0);
    expect(history.canUndo()).toBe(false);
    history.redo();
    expect(state.value).toBe(7);
  });

  it('undoes a composite in reverse order', () => {
    const order: string[] = [];
    const step = (name: string) => ({
      redo: () => order.push(`redo ${name}`),
      undo: () => order.push(`undo ${name}`),
    });
    const history = new History();
    history.execute(compositeCommand([step('a'), step('b')]));
    history.undo();
    expect(order).toEqual(['redo a', 'redo b', 'undo b', 'undo a']);
  });

  it('clears everything', () => {
    const { add } = counter();
    const history = new History();
    history.execute(add(1));
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });
});
