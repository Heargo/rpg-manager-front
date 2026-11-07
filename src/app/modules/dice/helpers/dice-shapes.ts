/** Dice geometry as plain math (no three.js), so it can be tested: vertices, faces from a convex hull, normals. */

export type Vec3 = [number, number, number];

export type ShapeKind = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DieShape {
  kind: ShapeKind;
  vertices: Vec3[];
  /** Each face as vertex indices, counter-clockwise seen from outside. */
  faces: number[][];
  /** Outward unit normal of each face. */
  normals: Vec3[];
  /** d4 is read at the top vertex; the others at the top face. */
  readsVertex: boolean;
}

const PHI = (1 + Math.sqrt(5)) / 2;

export const STANDARD_FACES: Record<ShapeKind, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

/**
 * The shape a die with `sides` faces is drawn on: its own shape for 4, 6, 8, 10, 12, 20; otherwise the smallest
 * standard shape with at least that many faces (no fair solid exists), the d20 above 20. Fairness never depends
 * on the shape: values are drawn first (core/generators/dice.ts).
 */
export function shapeForSides(sides: number): ShapeKind {
  const kinds: ShapeKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  return kinds.find((kind) => STANDARD_FACES[kind] >= sides) ?? 'd20';
}

export function buildShape(kind: ShapeKind): DieShape {
  const vertices = scale(rawVertices(kind), kind === 'd4' ? 1.2 : 1);
  const faces = hullFaces(vertices);
  return { kind, vertices, faces, normals: faces.map((face) => faceNormal(vertices, face)), readsVertex: kind === 'd4' };
}

function rawVertices(kind: ShapeKind): Vec3[] {
  switch (kind) {
    case 'd4':
      return [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
    case 'd6':
      return [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as Vec3)));
    case 'd8':
      return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    case 'd10':
      return trapezohedron();
    case 'd12':
      return [
        ...[-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as Vec3))),
        ...[-1, 1].flatMap((a) => [-1, 1].flatMap((b): Vec3[] => [
          [0, a / PHI, b * PHI],
          [a / PHI, b * PHI, 0],
          [a * PHI, 0, b / PHI],
        ])),
      ];
    case 'd20':
      return [-1, 1].flatMap((a) => [-1, 1].flatMap((b): Vec3[] => [
        [0, a, b * PHI],
        [a, b * PHI, 0],
        [a * PHI, 0, b],
      ]));
  }
}

/**
 * Pentagonal trapezohedron: two apexes and a zig-zag ring. The kites are flat only when the apex height is
 * H = a·(1 + cos36°)/(1 − cos36°) for a ring offset a (the apex, the middle of two upper ring vertices and the
 * lower vertex between them are aligned in the kite's symmetry plane).
 */
function trapezohedron(): Vec3[] {
  const a = 0.105;
  const cos36 = Math.cos(Math.PI / 5);
  const height = (a * (1 + cos36)) / (1 - cos36);
  const ring = Array.from({ length: 10 }, (_, i): Vec3 => {
    const angle = (i * Math.PI) / 5;
    return [Math.cos(angle), i % 2 === 0 ? a : -a, Math.sin(angle)];
  });
  return [[0, height, 0], [0, -height, 0], ...ring];
}

/** Rescales so the farthest vertex is at distance `radius`. */
function scale(vertices: Vec3[], radius: number): Vec3[] {
  const max = Math.max(...vertices.map(length));
  return vertices.map((v) => [(v[0] / max) * radius, (v[1] / max) * radius, (v[2] / max) * radius]);
}

/** Faces of the convex hull of a small point set: every plane through 3 points with all other points behind it. */
export function hullFaces(vertices: Vec3[], epsilon = 1e-6): number[][] {
  const faces: number[][] = [];
  const seen = new Set<string>();
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        let normal = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
        if (length(normal) < epsilon) continue;
        normal = normalize(normal);
        const offset = dot(normal, vertices[i]);
        const distances = vertices.map((v) => dot(normal, v) - offset);
        const hasFront = distances.some((d) => d > epsilon);
        const hasBack = distances.some((d) => d < -epsilon);
        if (hasFront && hasBack) continue;
        const onPlane = distances.flatMap((d, index) => (Math.abs(d) <= epsilon ? [index] : []));
        const key = onPlane.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        faces.push(orderFace(vertices, onPlane));
      }
    }
  }
  return faces;
}

/** Orders a face's vertices counter-clockwise seen from outside (the centroid is inside the solid). */
function orderFace(vertices: Vec3[], indices: number[]): number[] {
  const points = indices.map((index) => vertices[index]);
  const center = average(points);
  const outward = normalize(center); // the solid is centred on the origin
  const u = normalize(sub(points[0], center));
  const v = cross(outward, u);
  return [...indices].sort((a, b) => angleAround(vertices[a]) - angleAround(vertices[b]));

  function angleAround(point: Vec3): number {
    const d = sub(point, center);
    return Math.atan2(dot(d, v), dot(d, u));
  }
}

export function faceNormal(vertices: Vec3[], face: number[]): Vec3 {
  const center = average(face.map((index) => vertices[index]));
  const normal = normalize(cross(sub(vertices[face[1]], vertices[face[0]]), sub(vertices[face[2]], vertices[face[0]])));
  return dot(normal, center) < 0 ? [-normal[0], -normal[1], -normal[2]] : normal;
}

export function faceCenter(shape: DieShape, face: number): Vec3 {
  return average(shape.faces[face].map((index) => shape.vertices[index]));
}

// Small vector helpers
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3): number => Math.sqrt(dot(a, a));
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const average = (points: Vec3[]): Vec3 => {
  const sum = points.reduce<Vec3>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
};
