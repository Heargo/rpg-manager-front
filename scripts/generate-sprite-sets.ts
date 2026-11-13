/**
 * Writes public/packs/base/sprites/<id>.json, the ready-made materials of each bundled sprite (sprite colorizer JSON
 * config), from the automatic first guess. Run with `npm run sprites:sets`; existing files are kept unless --force,
 * so a set fixed by hand in the colorizer (exported, then copied here) is not overwritten.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { autoMaterials } from '../src/app/modules/sprite/helpers/auto-materials';
import { exportConfig } from '../src/app/modules/sprite/helpers/config-export';
import { SpriteImage } from '../src/app/modules/sprite/models/sprite';

const DIR = 'public/packs/base/sprites';
const force = process.argv.includes('--force');

/** Decodes an 8-bit RGBA or RGB, non-interlaced PNG (what the bundled pack uses). */
function decodePng(bytes: Buffer): SpriteImage {
  let at = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (at < bytes.length) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString('latin1', at + 4, at + 8);
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colorType = body[9];
      if (body[8] !== 8 || body[12] !== 0 || (colorType !== 6 && colorType !== 2))
        throw new Error('Only 8-bit non-interlaced RGB(A) PNG');
    } else if (type === 'IDAT') idat.push(body);
    at += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8ClampedArray(width * height * 4);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = line[x * channels];
      out[o + 1] = line[x * channels + 1];
      out[o + 2] = line[x * channels + 2];
      out[o + 3] = channels === 4 ? line[x * channels + 3] : 255;
    }
    prev.set(line);
  }
  return { width, height, data: out };
}

let written = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()) {
  const target = join(DIR, file.replace(/\.png$/, '.json'));
  if (existsSync(target) && !force) continue;
  const image = decodePng(readFileSync(join(DIR, file)));
  writeFileSync(target, exportConfig(autoMaterials(image)) + '\n');
  written++;
}
console.log(`${written} sprite set(s) written in ${DIR}`);
