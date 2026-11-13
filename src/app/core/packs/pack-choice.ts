import { seededRandomSource } from '../generators/random-source';

export const RANDOM_PACK = 'random';

/**
 * The pack a generator draws from. `candidates` are pack ids in pack order (Base first); `choice` is a pack id or
 * `'random'`. A named pack that is not a candidate falls back to the first candidate (the Base of the language); `'random'` picks from `<seed>:pack`, and
 * draws nothing when there is a single candidate.
 */
export function choosePack(
  candidates: readonly string[],
  choice: string,
  seed: string,
): string {
  if (choice !== RANDOM_PACK)
    return candidates.includes(choice) ? choice : (candidates[0] ?? '');
  if (candidates.length === 0) return '';
  if (candidates.length === 1) return candidates[0];
  const random = seededRandomSource(`${seed}:pack`);
  return candidates[random.nextUint32() % candidates.length];
}
