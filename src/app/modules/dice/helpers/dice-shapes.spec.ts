import { seededRandomSource } from '../../../core/generators/random-source';
import { initialLabels, putOnTop, topSlot } from './dice-labels';
import { buildShape, dot, faceCenter, length, ShapeKind, shapeForSides, STANDARD_FACES, sub } from './dice-shapes';

const KINDS: ShapeKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const VERTICES_PER_FACE: Record<ShapeKind, number> = { d4: 3, d6: 4, d8: 3, d10: 4, d12: 5, d20: 3 };

describe('dice shapes', () => {
  it.each(KINDS)('%s has the right faces, flat, outward and counter-clockwise', (kind) => {
    const shape = buildShape(kind);
    expect(shape.faces).toHaveLength(STANDARD_FACES[kind]);
    shape.faces.forEach((face, i) => {
      expect(face).toHaveLength(VERTICES_PER_FACE[kind]);
      const normal = shape.normals[i];
      expect(length(normal)).toBeCloseTo(1, 6);
      // Outward: the face centre is in front of the origin along the normal.
      expect(dot(normal, faceCenter(shape, i))).toBeGreaterThan(0);
      // Flat: every vertex at the same distance along the normal.
      const offsets = face.map((v) => dot(normal, shape.vertices[v]));
      offsets.forEach((offset) => expect(offset).toBeCloseTo(offsets[0], 6));
    });
  });

  it('picks the shape a die is drawn on', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 10, 12, 20, 30, 100].map(shapeForSides)).toEqual([
      'd4', 'd4', 'd4', 'd6', 'd6', 'd8', 'd8', 'd10', 'd12', 'd20', 'd20', 'd20',
    ]);
  });

  it('finds the top face of a die at rest, and the top vertex of a d4', () => {
    const cube = buildShape('d6');
    const identity = (v: [number, number, number]) => v;
    const top = topSlot(cube, identity);
    expect(cube.normals[top.index]).toEqual([0, 1, 0]);
    expect(top.alignment).toBeCloseTo(1, 6);

    const d4 = buildShape('d4');
    const { index } = topSlot(d4, identity);
    const highest = Math.max(...d4.vertices.map((v) => v[1]));
    expect(d4.vertices[index][1]).toBe(highest);
    expect(sub(d4.vertices[index], d4.vertices[index])).toEqual([0, 0, 0]);
  });
});

describe('dice labels', () => {
  const source = () => seededRandomSource('labels');

  it('labels standard dice 1..n', () => {
    expect(initialLabels({ sides: 6 }, 'd6', source()).values).toEqual([1, 2, 3, 4, 5, 6]);
    expect(initialLabels({ sides: 20 }, 'd20', source()).values).toHaveLength(20);
  });

  it('labels the d100 dice 00–90 and 0–9', () => {
    expect(initialLabels({ percentile: 'tens' }, 'd10', source()).texts).toEqual(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
    expect(initialLabels({ percentile: 'units' }, 'd10', source()).values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('cycles small dice and uses distinct values for big ones', () => {
    expect(initialLabels({ sides: 3 }, 'd4', source()).values).toEqual([1, 2, 3, 1]);
    const d50 = initialLabels({ sides: 50 }, 'd20', source()).values;
    expect(new Set(d50).size).toBe(20);
    expect(d50.every((v) => v >= 1 && v <= 50)).toBe(true);
  });

  it('always puts the drawn value on the top slot, keeping labels a permutation', () => {
    const random = seededRandomSource('relabel');
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      const kind = shapeForSides(sides);
      const start = initialLabels({ sides }, kind, random);
      for (let top = 0; top < start.values.length; top++) {
        for (let value = 1; value <= sides; value++) {
          const labels = putOnTop(start, top, value);
          expect(labels.values[top]).toBe(value);
          expect(labels.texts[top]).toBe(String(value));
          expect([...labels.values].sort((a, b) => a - b)).toEqual([...start.values].sort((a, b) => a - b));
        }
      }
    }
  });

  it('writes a value missing from a big die onto the top slot', () => {
    const start = { values: [1, 2, 3], texts: ['1', '2', '3'] };
    expect(putOnTop(start, 1, 42)).toEqual({ values: [1, 42, 3], texts: ['1', '42', '3'] });
  });
});
