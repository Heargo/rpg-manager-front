import { Profile } from '../models/profile';

export const PROFILE_NAME_MAX_LENGTH = 32;

/** Trims and collapses whitespace, and cuts to the maximum length. */
export function normalizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, PROFILE_NAME_MAX_LENGTH).trim();
}

export function isValidProfileName(name: string): boolean {
  return normalizeProfileName(name).length > 0;
}

/** Default name for a new player: a short, stable suffix from their id ("Adventurer 3f9a"). */
export function defaultProfileName(prefix: string, playerId: string): string {
  const suffix = playerId.replace(/-/g, '').slice(0, 4);
  return normalizeProfileName(`${prefix} ${suffix}`);
}

/** Reads a stored profile; returns null if it's missing or malformed. */
export function parseStoredProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { playerId, name } = value as Record<string, unknown>;
    if (typeof playerId !== 'string' || playerId.length === 0) return null;
    if (typeof name !== 'string' || !isValidProfileName(name)) return null;
    return { playerId, name: normalizeProfileName(name) };
  } catch {
    return null;
  }
}
