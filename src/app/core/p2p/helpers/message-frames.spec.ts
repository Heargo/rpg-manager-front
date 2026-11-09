import { createFrameAssembler, FRAME_MARKER, MAX_FRAME_CHARS, splitMessage } from './message-frames';

describe('message frames', () => {
  it('sends a small message as it is', () => {
    expect(splitMessage('{"v":1}', 'a')).toEqual(['{"v":1}']);
  });

  it('splits a big message into frames no longer than the limit plus their header', () => {
    const data = 'x'.repeat(MAX_FRAME_CHARS * 2 + 10);
    const frames = splitMessage(data, 'a');
    expect(frames.length).toBe(3);
    for (const frame of frames) {
      expect(frame.startsWith(FRAME_MARKER)).toBe(true);
      expect(frame.length).toBeLessThan(MAX_FRAME_CHARS + 32);
    }
  });

  it('puts the frames back together, in any order', () => {
    const data = JSON.stringify({ portrait: 'A'.repeat(50_000) });
    const frames = splitMessage(data, 'm1', 1000).reverse();
    const assembler = createFrameAssembler();
    const results = frames.map((frame) => assembler.push('host', frame));
    expect(results.slice(0, -1).every((result) => result === null)).toBe(true);
    expect(results.at(-1)).toBe(data);
  });

  it('never cuts an emoji in half', () => {
    const data = 'ab😀😀😀😀';
    const frames = splitMessage(data, 'e', 3);
    const assembler = createFrameAssembler();
    const parts = frames.map((frame) => frame.slice(frame.lastIndexOf(':') + 1));
    for (const part of parts) expect(/[\ud800-\udbff]$/.test(part)).toBe(false);
    expect(frames.map((frame) => assembler.push('p', frame)).at(-1)).toBe(data);
  });

  it('keeps messages from different senders apart', () => {
    const assembler = createFrameAssembler();
    const one = splitMessage('1'.repeat(30), 'same', 10);
    const two = splitMessage('2'.repeat(30), 'same', 10);
    expect(assembler.push('a', one[0])).toBeNull();
    expect(assembler.push('b', two[0])).toBeNull();
    expect(assembler.push('a', one[1])).toBeNull();
    expect(assembler.push('b', two[1])).toBeNull();
    expect(assembler.push('a', one[2])).toBe('1'.repeat(30));
    expect(assembler.push('b', two[2])).toBe('2'.repeat(30));
  });

  it('forgets a peer that left, and ignores broken frames', () => {
    const assembler = createFrameAssembler();
    const frames = splitMessage('z'.repeat(30), 'id', 10);
    assembler.push('a', frames[0]);
    assembler.drop('a');
    assembler.push('a', frames[1]);
    expect(assembler.push('a', frames[2])).toBeNull();
    expect(assembler.push('a', `${FRAME_MARKER}garbage`)).toBeNull();
    expect(assembler.push('a', `${FRAME_MARKER}id:5:2:x`)).toBeNull();
  });

  it('frames a short message that starts with the marker, so it is never taken for a frame', () => {
    const data = `${FRAME_MARKER}hello`;
    const frames = splitMessage(data, 'm');
    expect(frames.length).toBe(1);
    expect(createFrameAssembler().push('p', frames[0])).toBe(data);
  });
});
