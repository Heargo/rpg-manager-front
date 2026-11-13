import { SpritePreset } from '../models/sprite';

const preset = (
  id: string,
  name: string,
  shadow: string,
  mid: string,
  light: string,
): SpritePreset => ({
  id,
  name,
  stops: [
    { position: 0, color: shadow },
    { position: 0.5, color: mid },
    { position: 1, color: light },
  ],
});

/** Shadows, midtones, highlights. */
export const PRESETS: SpritePreset[] = [
  preset('steel', 'Steel', '#2b3440', '#9aa5b1', '#ffffff'),
  preset('wood', 'Wood', '#3b2412', '#8b5a2b', '#d9b88a'),
  preset('gold', 'Gold', '#5c3d0a', '#d4a017', '#fff1a8'),
  preset('ice', 'Ice', '#0b2a6b', '#38bdf8', '#ffffff'),
  preset('fire', 'Fire', '#5a0a0a', '#f97316', '#fde047'),
  preset('leaf', 'Leaf', '#123d1a', '#3e9c35', '#b9f08a'),
  preset('arcane', 'Arcane', '#2a0f4d', '#8b5cf6', '#e0d4ff'),
];

export const isBuiltInPreset = (id: string): boolean =>
  PRESETS.some((p) => p.id === id);
