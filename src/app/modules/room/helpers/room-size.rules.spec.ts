import { DeviceSetup, isStruggling, recommendedMax } from './room-size.rules';

const desktop: DeviceSetup = { mobile: false };

describe('recommendedMax', () => {
  it('starts at 8 when nothing is known', () => {
    expect(recommendedMax(desktop)).toBe(8);
  });

  it('halves it on mobile', () => {
    expect(recommendedMax({ mobile: true })).toBe(4);
  });

  it('takes 3 off for 2 GB of memory or less, adds 4 for 8 GB or more, nothing in between', () => {
    expect(recommendedMax({ ...desktop, deviceMemory: 2 })).toBe(5);
    expect(recommendedMax({ ...desktop, deviceMemory: 0.5 })).toBe(5);
    expect(recommendedMax({ ...desktop, deviceMemory: 4 })).toBe(8);
    expect(recommendedMax({ ...desktop, deviceMemory: 8 })).toBe(12);
  });

  it('takes 2 off for 2 cores or fewer, adds 2 for 8 cores or more, nothing in between', () => {
    expect(recommendedMax({ ...desktop, hardwareConcurrency: 2 })).toBe(6);
    expect(recommendedMax({ ...desktop, hardwareConcurrency: 4 })).toBe(8);
    expect(recommendedMax({ ...desktop, hardwareConcurrency: 8 })).toBe(10);
  });

  it('takes 3 off for a 2g or 3g connection, or a downlink under 1.5 Mbps', () => {
    expect(recommendedMax({ ...desktop, effectiveType: '2g' })).toBe(5);
    expect(recommendedMax({ ...desktop, effectiveType: '3g' })).toBe(5);
    expect(recommendedMax({ ...desktop, effectiveType: '4g' })).toBe(8);
    expect(recommendedMax({ ...desktop, downlink: 1.4 })).toBe(5);
    expect(recommendedMax({ ...desktop, downlink: 1.5 })).toBe(8);
  });

  it('applies the halving first, then the adjustments', () => {
    expect(recommendedMax({ mobile: true, deviceMemory: 8 })).toBe(8);
    expect(recommendedMax({ mobile: true, hardwareConcurrency: 2 })).toBe(2);
  });

  it('adds the bonuses of a strong setup', () => {
    expect(recommendedMax({ ...desktop, deviceMemory: 8, hardwareConcurrency: 8 })).toBe(14);
  });

  it('never goes under 2', () => {
    expect(
      recommendedMax({ mobile: true, deviceMemory: 1, hardwareConcurrency: 1, effectiveType: '2g', downlink: 0.5 }),
    ).toBe(2);
  });
});

describe('isStruggling', () => {
  it('is calm without pings or buffered data', () => {
    expect(isStruggling([], [])).toBe(false);
    expect(isStruggling([[50, 80, 120]], [0])).toBe(false);
  });

  it('struggles when a player median ping over the last 3 is above 400 ms', () => {
    expect(isStruggling([[500, 450, 600]], [])).toBe(true);
    expect(isStruggling([[50], [100, 500, 500]], [])).toBe(true);
  });

  it('does not count exactly 400 ms, nor a single spike', () => {
    expect(isStruggling([[400, 400, 400]], [])).toBe(false);
    expect(isStruggling([[100, 900, 100]], [])).toBe(false);
  });

  it('only looks at the last 3 pings', () => {
    expect(isStruggling([[900, 900, 900, 100, 100, 100]], [])).toBe(false);
    expect(isStruggling([[100, 100, 100, 900, 900, 900]], [])).toBe(true);
  });

  it('struggles when more than 1 MB is buffered on any channel', () => {
    expect(isStruggling([[50]], [0, 2_000_000])).toBe(true);
    expect(isStruggling([[50]], [0, 500_000])).toBe(false);
  });
});
