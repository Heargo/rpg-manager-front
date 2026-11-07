/**
 * The 3D dice table (three.js + Rapier). Loaded lazily, the only code using those libraries.
 *
 * Fairness: values are drawn before (core/generators/dice.ts). Here a throw is simulated invisibly and recorded;
 * the face that ends on top of each die is relabelled with its drawn value; then the recording is replayed.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { seededRandomSource, RandomSource } from '../../../core/generators/random-source';
import { randomInt } from '../../../core/generators/random';
import { DieLabels, initialLabels, putOnTop, topSlot } from '../helpers/dice-labels';
import { DiePlan, ThrowPlan } from '../helpers/dice-plan';
import { buildShape, DieShape, shapeForSides, Vec3 } from '../helpers/dice-shapes';

const STEP = 1 / 60;
const MAX_STEPS = 8 * 60;
const MAX_ATTEMPTS = 6;
/** A die is "flat" when its top face normal is within ~10° of vertical. */
const FLAT_ALIGNMENT = Math.cos((10 * Math.PI) / 180);
const DIE_RADIUS = 0.9;
const COLORS = {
  body: '#7f1919',
  text: '#f1ecda',
  tensBody: '#f1ecda',
  tensText: '#7f1919',
};

let rapierReady: Promise<void> | undefined;

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface Recording {
  /** frames[f][d] = [x, y, z, qx, qy, qz, qw] */
  frames: Float32Array[][];
  tops: { index: number; alignment: number }[];
}

export class DiceScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  private meshes: THREE.Mesh[] = [];
  private animation = 0;
  private skipRequested = false;
  private readonly onResize = () => this.resize();

  private constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.camera.position.set(0, 26, 7);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(6, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  static async create(canvas: HTMLCanvasElement): Promise<DiceScene> {
    rapierReady ??= RAPIER.init();
    await rapierReady;
    return new DiceScene(canvas);
  }

  /** Throws the dice and resolves once they show their values (immediately with `reducedMotion`). */
  async play(plan: ThrowPlan, options: { reducedMotion: boolean; bottomInsetPx?: number }): Promise<void> {
    this.stop();
    this.clearDice();
    this.skipRequested = false;
    const bounds = this.tableBounds(options.bottomInsetPx ?? 0);
    const shapes = plan.dice.map((die) => buildShape('percentile' in die.role ? 'd10' : shapeForSides(die.role.sides)));

    // Simulate until every die lands flat (or keep the best attempt).
    let best: Recording | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const recording = simulate(shapes, bounds, seededRandomSource(`${plan.seed}:${attempt}`));
      if (!best || worstAlignment(recording) > worstAlignment(best)) best = recording;
      if (recording.tops.every((top) => top.alignment >= FLAT_ALIGNMENT)) break;
    }
    const recording = best!;

    // Relabel each die so its top shows the drawn value.
    const labelSource = seededRandomSource(`${plan.seed}:labels`);
    this.meshes = plan.dice.map((die, i) => {
      const labels = putOnTop(initialLabels(die.role, shapes[i].kind, labelSource), recording.tops[i].index, die.value, die.text);
      const mesh = createDieMesh(shapes[i], labels, die);
      this.scene.add(mesh);
      return mesh;
    });

    if (options.reducedMotion) {
      this.applyFrame(recording.frames[recording.frames.length - 1]);
      this.render();
      return;
    }
    await this.replay(recording.frames);
  }

  /** Jumps to the final position of the current throw. */
  skip(): void {
    this.skipRequested = true;
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.clearDice();
    this.renderer.dispose();
  }

  private replay(frames: Float32Array[][]): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const index = this.skipRequested ? frames.length - 1 : Math.min(frames.length - 1, Math.floor(((now - start) / 1000) / STEP));
        this.applyFrame(frames[index]);
        this.render();
        if (index >= frames.length - 1) {
          this.animation = 0;
          resolve();
          return;
        }
        this.animation = requestAnimationFrame(tick);
      };
      this.animation = requestAnimationFrame(tick);
    });
  }

  private applyFrame(frame: Float32Array[]): void {
    frame.forEach((pose, i) => {
      const mesh = this.meshes[i];
      mesh.position.set(pose[0], pose[1], pose[2]);
      mesh.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    });
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  /**
   * The part of the floor (y = 0) visible on screen, so walls sit at the screen edges; the near wall stops
   * `bottomInsetPx` above the bottom (the result bar).
   */
  private tableBounds(bottomInsetPx: number): Bounds {
    const height = this.canvas.clientHeight || window.innerHeight;
    const bottom = -1 + (2 * Math.min(bottomInsetPx, height * 0.4)) / height;
    const corners = [
      [-1, bottom],
      [1, bottom],
      [1, 1],
      [-1, 1],
    ].map(([x, y]) => {
      const point = new THREE.Vector3(x, y, 0.5).unproject(this.camera);
      const direction = point.sub(this.camera.position).normalize();
      const distance = -this.camera.position.y / direction.y;
      return this.camera.position.clone().addScaledVector(direction, distance);
    });
    // The far edge is the narrowest (perspective): use it so no wall is off screen. Keep a margin for the dice.
    const margin = DIE_RADIUS * 0.6;
    const halfWidth = Math.min(...corners.map((c) => Math.abs(c.x))) - margin;
    const minZ = Math.max(corners[2].z, corners[3].z) + margin;
    const maxZ = Math.min(corners[0].z, corners[1].z) - margin;
    return { minX: -halfWidth, maxX: halfWidth, minZ, maxZ };
  }

  private stop(): void {
    if (this.animation) cancelAnimationFrame(this.animation);
    this.animation = 0;
  }

  private clearDice(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      for (const material of mesh.material as THREE.MeshStandardMaterial[]) {
        material.map?.dispose();
        material.dispose();
      }
    }
    this.meshes = [];
  }
}

function worstAlignment(recording: Recording): number {
  return Math.min(...recording.tops.map((top) => top.alignment));
}

/** Runs the physics without drawing and records every frame. */
function simulate(shapes: DieShape[], bounds: Bounds, random: RandomSource): Recording {
  const world = new RAPIER.World({ x: 0, y: -40, z: 0 });
  world.timestep = STEP;
  const fixed = (x: number, y: number, z: number, hx: number, hy: number, hz: number) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.6).setRestitution(0.35), body);
  };
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  fixed(cx, -0.5, cz, width, 0.5, depth); // floor
  fixed(cx, 14, cz, width, 0.5, depth); // ceiling
  fixed(bounds.minX - 0.5, 7, cz, 0.5, 8, depth); // left wall
  fixed(bounds.maxX + 0.5, 7, cz, 0.5, 8, depth); // right wall
  fixed(cx, 7, bounds.minZ - 0.5, width, 8, 0.5); // far wall
  fixed(cx, 7, bounds.maxZ + 0.5, width, 8, 0.5); // near wall

  // Throw from one random edge toward the centre, dice spread along that edge.
  const r = (min: number, max: number) => min + (randomInt(random, 0, 1_000_000) / 1_000_000) * (max - min);
  const edge = randomInt(random, 0, 3);
  const bodies = shapes.map((shape, i) => {
    const t = shapes.length === 1 ? r(0.3, 0.7) : (i + 0.5) / shapes.length;
    const along = (min: number, max: number) => min + DIE_RADIUS + t * (max - min - 2 * DIE_RADIUS);
    const inset = DIE_RADIUS * 1.5;
    const [x, z] =
      edge === 0 ? [along(bounds.minX, bounds.maxX), bounds.maxZ - inset]
      : edge === 1 ? [along(bounds.minX, bounds.maxX), bounds.minZ + inset]
      : edge === 2 ? [bounds.minX + inset, along(bounds.minZ, bounds.maxZ)]
      : [bounds.maxX - inset, along(bounds.minZ, bounds.maxZ)];
    const toCentre = new THREE.Vector3(cx - x + r(-2, 2), 0, cz - z + r(-2, 2)).normalize().multiplyScalar(r(14, 22));
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(r(0, 6.28), r(0, 6.28), r(0, 6.28)));
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, 2.5 + (i % 4) * 1.2, z)
        .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
        .setLinvel(toCentre.x, r(2, 5), toCentre.z)
        .setAngvel({ x: r(-18, 18), y: r(-18, 18), z: r(-18, 18) })
        .setLinearDamping(0.15)
        .setAngularDamping(0.25)
        .setCcdEnabled(true),
    );
    const points = new Float32Array(shape.vertices.flatMap((v) => v.map((c) => c * DIE_RADIUS)));
    world.createCollider(RAPIER.ColliderDesc.convexHull(points)!.setDensity(1).setFriction(0.5).setRestitution(0.4), body);
    return body;
  });

  const frames: Float32Array[][] = [];
  let quiet = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    world.step();
    frames.push(
      bodies.map((body) => {
        const p = body.translation();
        const q = body.rotation();
        return Float32Array.of(p.x, p.y, p.z, q.x, q.y, q.z, q.w);
      }),
    );
    const still = bodies.every((body) => {
      if (body.isSleeping()) return true;
      const v = body.linvel();
      const w = body.angvel();
      return Math.hypot(v.x, v.y, v.z) < 0.05 && Math.hypot(w.x, w.y, w.z) < 0.05;
    });
    quiet = still ? quiet + 1 : 0;
    if (quiet > 20) break;
  }

  const last = frames[frames.length - 1];
  const tops = shapes.map((shape, i) => {
    const q = new THREE.Quaternion(last[i][3], last[i][4], last[i][5], last[i][6]);
    return topSlot(shape, (v) => {
      const rotated = new THREE.Vector3(...v).applyQuaternion(q);
      return [rotated.x, rotated.y, rotated.z] as Vec3;
    });
  });
  world.free();
  return { frames, tops };
}

/** A mesh with one material per face, each face's label drawn on a canvas texture. */
function createDieMesh(shape: DieShape, labels: DieLabels, die: DiePlan): THREE.Mesh {
  const isTens = 'percentile' in die.role && die.role.percentile === 'tens';
  const body = isTens ? COLORS.tensBody : COLORS.body;
  const ink = isTens ? COLORS.tensText : COLORS.text;
  const positions: number[] = [];
  const uvs: number[] = [];
  const geometry = new THREE.BufferGeometry();
  const materials: THREE.MeshStandardMaterial[] = [];
  const maxSides = 'sides' in die.role ? die.role.sides : 10;

  shape.faces.forEach((face, faceIndex) => {
    const points = face.map((v) => new THREE.Vector3(...shape.vertices[v]).multiplyScalar(DIE_RADIUS));
    const center = points.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(points.length);
    const normal = new THREE.Vector3(...shape.normals[faceIndex]);
    const u = points[0].clone().sub(center).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u);
    const extent = Math.max(...points.map((p) => p.distanceTo(center)));
    const uvOf = (p: THREE.Vector3) => {
      const d = p.clone().sub(center);
      return [0.5 + d.dot(u) / (2 * extent), 0.5 + d.dot(v) / (2 * extent)];
    };
    const start = positions.length / 3;
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(p.x, p.y, p.z);
        uvs.push(...uvOf(p));
      }
    }
    geometry.addGroup(start, positions.length / 3 - start, faceIndex);

    const texture = shape.readsVertex
      ? faceTexture(body, ink, face.map((vertex, k) => ({ text: labels.texts[vertex], uv: uvOf(points[k]) })), maxSides)
      : faceTexture(body, ink, [{ text: labels.texts[faceIndex], uv: [0.5, 0.5] }], maxSides);
    materials.push(new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.45, metalness: 0.05, flatShading: true }));
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  return mesh;
}

/** Face colour with its label(s): centred, or near each corner for a d4 (read at the top vertex). */
function faceTexture(body: string, ink: string, labels: { text: string; uv: number[] }[], maxSides: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.fillStyle = body;
  context.fillRect(0, 0, size, size);
  context.fillStyle = ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const corner = labels.length > 1;
  for (const { text, uv } of labels) {
    const x = corner ? size * (0.5 + (uv[0] - 0.5) * 0.55) : size / 2;
    const y = corner ? size * (1 - (0.5 + (uv[1] - 0.5) * 0.55)) : size / 2;
    const fontSize = corner ? 56 : text.length > 2 ? 70 : 96;
    context.font = `700 ${fontSize}px Recursive, sans-serif`;
    context.save();
    context.translate(x, y);
    if (corner) context.rotate(Math.atan2(uv[0] - 0.5, uv[1] - 0.5));
    context.fillText(text, 0, 0);
    // Tell 6 from 9 (and 66 from 99…) when both exist on the die.
    if (maxSides >= 9 && /^(6|9|66|99|06|09|60|90)$/.test(text)) {
      context.fillRect(-fontSize * 0.3, fontSize * 0.45, fontSize * 0.6, fontSize * 0.07);
    }
    context.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
