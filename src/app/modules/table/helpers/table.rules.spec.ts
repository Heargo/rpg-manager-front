import { createWorld } from '../../world/helpers/world.factory';
import { World } from '../../world/models/world';
import { NOTES_MAX_LENGTH, QUICK_IMAGES_MAX } from '../models/table';
import {
  addQuickImage,
  isImageId,
  removeQuickImage,
  requestedImageId,
  showIllustration,
  toTableScene,
  validateNotes,
} from './table.rules';

const id = (n: number) => n.toString(16).padStart(64, '0');

function world(): World {
  let next = 0;
  return createWorld({ name: 'W', attributes: [] }, () => `id-${next++}`, 0);
}

describe('table rules', () => {
  it('recognises image ids', () => {
    expect(isImageId(id(1))).toBe(true);
    expect(isImageId('../etc')).toBe(false);
    expect(requestedImageId({ imageId: id(2) })).toBe(id(2));
    expect(requestedImageId({ imageId: 'x' })).toBeNull();
    expect(requestedImageId(null)).toBeNull();
  });

  it('shows and clears the illustration', () => {
    const shown = showIllustration(world(), id(1));
    expect(toTableScene(shown)).toEqual({ illustrationId: id(1) });
    expect(toTableScene(showIllustration(shown, null))).toEqual({
      illustrationId: undefined,
    });
  });

  it('adds quick images at the front without duplicates, up to the limit', () => {
    let w = world();
    w = addQuickImage(w, id(1)) as World;
    w = addQuickImage(w, id(2)) as World;
    w = addQuickImage(w, id(1)) as World;
    expect(w.quickImageIds).toEqual([id(1), id(2)]);

    const full = {
      ...w,
      quickImageIds: Array.from({ length: QUICK_IMAGES_MAX }, (_, i) =>
        id(i + 10),
      ),
    };
    expect(addQuickImage(full, id(99))).toBe('full');
    expect(addQuickImage(full, id(10))).not.toBe('full');
  });

  it('removes a quick image but keeps it on the table', () => {
    const w = showIllustration(addQuickImage(world(), id(1)) as World, id(1));
    const removed = removeQuickImage(w, id(1));
    expect(removed.quickImageIds).toEqual([]);
    expect(removed.illustrationId).toBe(id(1));
  });

  it('validates notes', () => {
    expect(validateNotes({ notes: 'Goblins at the bridge' })).toBeNull();
    expect(validateNotes({ notes: 3 })).toBe('table.errors.invalid');
    expect(validateNotes({ notes: 'x'.repeat(NOTES_MAX_LENGTH + 1) })).toBe(
      'table.errors.notesTooLong',
    );
  });
});
