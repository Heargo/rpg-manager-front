import { SpriteImage } from '../models/sprite';
import { DetectOptions, detectShapes } from '../helpers/shape-detection';

addEventListener(
  'message',
  ({ data }: MessageEvent<{ image: SpriteImage; options: DetectOptions }>) => {
    const shapes = detectShapes(data.image, data.options);
    postMessage(shapes, { transfer: shapes.map((s) => s.mask.buffer) });
  },
);
