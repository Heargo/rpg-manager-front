import { PRESETS } from './presets';

describe('built-in presets', () => {
  it('ships steel, wood, gold, ice, fire, leaf and arcane', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['steel', 'wood', 'gold', 'ice', 'fire', 'leaf', 'arcane']);
  });

  it('gives each preset shadow, midtone and highlight stops as hex colours', () => {
    for (const preset of PRESETS) {
      expect(preset.stops.map((s) => s.position)).toEqual([0, 0.5, 1]);
      for (const stop of preset.stops) expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('makes steel end on white', () => {
    const steel = PRESETS.find((p) => p.id === 'steel')!;
    expect(steel.stops[2].color.toLowerCase()).toBe('#ffffff');
  });
});
