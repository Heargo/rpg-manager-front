import { shuffle } from '../../../core/generators/random';
import { RandomSource } from '../../../core/generators/random-source';
import { DieShape, ShapeKind, STANDARD_FACES } from './dice-shapes';

/** What a die shows: a label per face (per vertex for the d4). */
export interface DieLabels {
  /** Text drawn on each face (or at each vertex for the d4), in face/vertex order. */
  texts: string[];
  /** The value each face/vertex stands for. */
  values: number[];
}

/** Kinds of dice the roller draws: a number of sides, or the two dice of a d100. */
export type DieRole = { sides: number } | { percentile: 'tens' | 'units' };

/**
 * Starting labels for a die on its shape. Standard dice get 1..n; a d10 shows 1..10; the d100's dice show
 * 00–90 and 0–9; other sizes cycle 1..n (fewer sides than faces) or use distinct values from 1..n (more sides
 * than faces, d20 shape). Which face ends up on top is fixed later by `putOnTop`.
 */
export function initialLabels(role: DieRole, kind: ShapeKind, source: RandomSource): DieLabels {
  const slots = kind === 'd4' ? 4 : STANDARD_FACES[kind];
  if ('percentile' in role) {
    const values = Array.from({ length: 10 }, (_, i) => (role.percentile === 'tens' ? i * 10 : i));
    return { values, texts: values.map((v) => (role.percentile === 'tens' ? String(v).padStart(2, '0') : String(v))) };
  }
  const sides = role.sides;
  let values: number[];
  if (sides <= slots) values = Array.from({ length: slots }, (_, i) => (i % sides) + 1);
  else values = shuffle(source, Array.from({ length: sides }, (_, i) => i + 1)).slice(0, slots);
  return { values, texts: values.map(String) };
}

/**
 * Makes the face (or vertex) that landed on top show `value`: swaps its label with a slot that already has the
 * value, or (more sides than slots) writes the value there. The labels stay a permutation of what they were,
 * unless the value wasn't on the die at all.
 */
export function putOnTop(labels: DieLabels, top: number, value: number, text = String(value)): DieLabels {
  const values = [...labels.values];
  const texts = [...labels.texts];
  const other = values.indexOf(value);
  if (other === top) return labels;
  if (other >= 0) {
    [values[top], values[other]] = [values[other], values[top]];
    [texts[top], texts[other]] = [texts[other], texts[top]];
  } else {
    values[top] = value;
    texts[top] = text;
  }
  return { values, texts };
}

/** Index of the face whose outward normal points most upward (or the highest vertex for a d4), given a rotation. */
export function topSlot(shape: DieShape, rotate: (v: [number, number, number]) => [number, number, number]): { index: number; alignment: number } {
  if (shape.readsVertex) {
    let best = 0;
    let bestY = -Infinity;
    shape.vertices.forEach((vertex, index) => {
      const y = rotate(vertex)[1];
      if (y > bestY) {
        bestY = y;
        best = index;
      }
    });
    // A d4 at rest on a face has its top vertex straight up: alignment of that vertex's direction with "up".
    const dir = rotate(shape.vertices[best]);
    return { index: best, alignment: dir[1] / Math.hypot(dir[0], dir[1], dir[2]) };
  }
  let best = 0;
  let bestUp = -Infinity;
  shape.normals.forEach((normal, index) => {
    const up = rotate(normal)[1];
    if (up > bestUp) {
      bestUp = up;
      best = index;
    }
  });
  return { index: best, alignment: bestUp };
}
