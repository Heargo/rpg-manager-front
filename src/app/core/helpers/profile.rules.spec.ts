import {
  defaultProfileName,
  isValidProfileName,
  normalizeProfileName,
  parseStoredProfile,
  PROFILE_NAME_MAX_LENGTH,
} from './profile.rules';

describe('profile rules', () => {
  describe('normalizeProfileName', () => {
    it('trims and collapses whitespace', () => {
      expect(normalizeProfileName('  Ada   Lovelace \n')).toBe('Ada Lovelace');
    });

    it('cuts names longer than the maximum', () => {
      const name = normalizeProfileName('x'.repeat(50));
      expect(name).toHaveLength(PROFILE_NAME_MAX_LENGTH);
    });
  });

  describe('isValidProfileName', () => {
    it('rejects empty or blank names', () => {
      expect(isValidProfileName('')).toBe(false);
      expect(isValidProfileName('   ')).toBe(false);
      expect(isValidProfileName('Bo')).toBe(true);
    });
  });

  describe('defaultProfileName', () => {
    it('adds the first 4 characters of the id, without dashes', () => {
      expect(defaultProfileName('Adventurer', '3f-9a12-bc')).toBe('Adventurer 3f9a');
    });
  });

  describe('parseStoredProfile', () => {
    it('reads a valid profile and normalizes its name', () => {
      expect(parseStoredProfile('{"playerId":"p1","name":"  Ada "}')).toEqual({
        playerId: 'p1',
        name: 'Ada',
      });
    });

    it('returns null for missing, corrupt or incomplete data', () => {
      expect(parseStoredProfile(null)).toBeNull();
      expect(parseStoredProfile('not json')).toBeNull();
      expect(parseStoredProfile('42')).toBeNull();
      expect(parseStoredProfile('{"name":"Ada"}')).toBeNull();
      expect(parseStoredProfile('{"playerId":"p1","name":"  "}')).toBeNull();
    });
  });
});
