import {
  Character,
  OfflineFeatures,
  WorldAttribute,
} from '../../world/models/world';
import {
  CHARACTER_NOTES_MAX_LENGTH,
  CHARACTER_ROUTES,
  characterActionRoute,
  MAX_QUEUED_ACTIONS,
} from '../models/character-api';
import { QueuedAction, QueuedRefusal } from '../models/player-copy';
import {
  applyCharacterAction,
  CHARACTER_ACTION_KINDS,
  CharacterAction,
  CharacterActionKind,
  GAME_MASTER_ACTIONS,
  LevelRules,
  parseCharacterAction,
  SkillCatalogue,
} from './character-actions.rules';
import { BarAttributes } from './character-stats';

export type OfflineResult =
  | { ok: true; character: Character; queue: QueuedAction[] }
  | { ok: false; error: string };

/** Granting XP is a game master action, refused offline before it gets here: the rules only satisfy the signature. */
const NO_XP_RULES: LevelRules = {
  levelCurve: { preset: 'flat' },
  statPointsPerLevel: 0,
  skillPointsPerLevel: 0,
  maxLevel: 2,
  barAttributes: {},
};

const NOT_ALLOWED = 'character.errors.offlineNotAllowed';

const FEATURE_OF: Partial<Record<CharacterActionKind, keyof OfflineFeatures>> =
  {
    'spend-stat-point': 'spendStatPoints',
    equip: 'equip',
    unequip: 'equip',
    use: 'useConsumables',
    sell: 'sell',
    'learn-skill': 'learnSkills',
  };

/** Whether an action may be done while the host is offline: its feature is on, and it isn't a game master action. */
export function isOfflineAllowed(
  features: OfflineFeatures,
  kind: CharacterActionKind,
): boolean {
  const feature = FEATURE_OF[kind];
  return feature !== undefined && features[feature];
}

/** Applies an allowed action to the local copy with the host's own reducer and appends the request to the queue. */
export function applyOffline(
  attributes: WorldAttribute[],
  character: Character,
  queue: QueuedAction[],
  action: CharacterAction,
  features: OfflineFeatures,
  barAttributes: BarAttributes,
  catalogue: SkillCatalogue,
): OfflineResult {
  if (!isOfflineAllowed(features, action.kind))
    return { ok: false, error: NOT_ALLOWED };
  const result = applyCharacterAction(
    attributes,
    character,
    action,
    { ...NO_XP_RULES, barAttributes },
    catalogue,
  );
  if (!result.ok) return result;
  const { kind, ...fields } = action;
  return {
    ok: true,
    character: result.character,
    queue: [
      ...queue,
      {
        route: characterActionRoute(kind),
        payload: { characterId: character.id, ...fields },
      },
    ],
  };
}

/** Sets the notes on the local copy and queues the save, when notes are allowed offline. */
export function applyOfflineNotes(
  character: Character,
  queue: QueuedAction[],
  notes: string,
  features: OfflineFeatures,
): OfflineResult {
  if (!features.notes) return { ok: false, error: NOT_ALLOWED };
  if (notes.length > CHARACTER_NOTES_MAX_LENGTH)
    return { ok: false, error: 'character.errors.notesTooLong' };
  // One notes entry only: the last edit wins.
  const others = queue.filter(
    (entry) => entry.route !== CHARACTER_ROUTES.saveNotes,
  );
  return {
    ok: true,
    character: { ...character, notes },
    queue: [
      ...others,
      {
        route: CHARACTER_ROUTES.saveNotes,
        payload: { characterId: character.id, notes },
      },
    ],
  };
}

/** The notes in a save-notes payload, or null when it isn't well formed. */
export function parseNotesPayload(
  payload: unknown,
): { characterId: string; notes: string } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p['characterId'] !== 'string' || typeof p['notes'] !== 'string')
    return null;
  if (p['notes'].length > CHARACTER_NOTES_MAX_LENGTH) return null;
  return { characterId: p['characterId'], notes: p['notes'] };
}

const PLAYER_KINDS = CHARACTER_ACTION_KINDS.filter(
  (kind) => !GAME_MASTER_ACTIONS.includes(kind),
);

/** True when a queued entry is a well-formed player action (or notes save) on this character. */
export function isValidQueuedAction(
  entry: unknown,
  characterId: string,
): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const { route, payload } = entry as Partial<QueuedAction>;
  if (
    typeof route !== 'string' ||
    typeof payload !== 'object' ||
    payload === null
  )
    return false;
  if ((payload as { characterId?: unknown }).characterId !== characterId)
    return false;
  if (route === CHARACTER_ROUTES.saveNotes)
    return parseNotesPayload(payload) !== null;
  const kind = PLAYER_KINDS.find(
    (candidate) => characterActionRoute(candidate) === route,
  );
  return kind !== undefined && parseCharacterAction(kind, payload) !== null;
}

/** True when the whole queue is acceptable: a bounded list of valid entries. */
export function isValidQueue(
  queue: unknown,
  characterId: string,
): queue is QueuedAction[] {
  return (
    Array.isArray(queue) &&
    queue.length <= MAX_QUEUED_ACTIONS &&
    queue.filter(
      (entry) =>
        (entry as Partial<QueuedAction> | null)?.route ===
        CHARACTER_ROUTES.saveNotes,
    ).length <= 1 &&
    queue.every((entry) => isValidQueuedAction(entry, characterId))
  );
}

/**
 * The host's record with the player's validated queue replayed on it, entry by entry, with the host's own rules
 * and the offline features. Nothing is taken from the player's copy; refused entries are listed.
 */
export function replayQueue(
  attributes: WorldAttribute[],
  host: Character,
  queue: QueuedAction[],
  features: OfflineFeatures,
  barAttributes: BarAttributes,
  catalogue: SkillCatalogue,
): { character: Character; refused: QueuedRefusal[] } {
  let character = host;
  const refused: QueuedRefusal[] = [];
  for (const entry of queue) {
    if (entry.route === CHARACTER_ROUTES.saveNotes) {
      const request = parseNotesPayload(entry.payload);
      if (!request || !features.notes)
        refused.push({ route: entry.route, error: NOT_ALLOWED });
      else character = { ...character, notes: request.notes };
      continue;
    }
    const kind = PLAYER_KINDS.find(
      (candidate) => characterActionRoute(candidate) === entry.route,
    );
    const action = kind ? parseCharacterAction(kind, entry.payload) : null;
    if (!action)
      refused.push({ route: entry.route, error: 'character.errors.invalid' });
    else if (!isOfflineAllowed(features, action.kind))
      refused.push({ route: entry.route, error: NOT_ALLOWED });
    else {
      const result = applyCharacterAction(
        attributes,
        character,
        action,
        { ...NO_XP_RULES, barAttributes },
        catalogue,
      );
      if (result.ok) character = result.character;
      else refused.push({ route: entry.route, error: result.error });
    }
  }
  return { character, refused };
}
