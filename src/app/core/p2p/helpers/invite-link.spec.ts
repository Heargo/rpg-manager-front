import { buildInviteFragment, createBoxId, isBoxId, parseInviteFragment } from './invite-link';
import { extractSignalCode } from './signal-codec';

const BOX = 'AAAAAAAAAAAAAAAAAAAAAA';

describe('invite link', () => {
  describe('fragment', () => {
    it('joins the offer code and the box id with "~"', () => {
      expect(buildInviteFragment('2.abc_DEF-123', BOX)).toBe(`2.abc_DEF-123~${BOX}`);
    });

    it('is just the offer code without a box id', () => {
      expect(buildInviteFragment('2.abc_DEF-123')).toBe('2.abc_DEF-123');
    });

    it('parses it back, with or without the leading "#"', () => {
      expect(parseInviteFragment(`#2.abc_DEF-123~${BOX}`)).toEqual({ offerCode: '2.abc_DEF-123', boxId: BOX });
      expect(parseInviteFragment(`2.abc_DEF-123~${BOX}`)).toEqual({ offerCode: '2.abc_DEF-123', boxId: BOX });
    });

    it('parses a link without a box id as manual mode (no boxId)', () => {
      expect(parseInviteFragment('#2.abc_DEF-123')).toEqual({ offerCode: '2.abc_DEF-123', boxId: undefined });
    });

    it('drops a box id that is not 22 base64url characters', () => {
      expect(parseInviteFragment('#2.abc~short')).toEqual({ offerCode: '2.abc', boxId: undefined });
    });

    it('lets the signal codec read the offer code out of a full link that has a box id', () => {
      expect(extractSignalCode(`https://rpg.example/join#2.abc_DEF-123~${BOX}`)).toBe('2.abc_DEF-123');
    });
  });

  describe('box id', () => {
    it('is 16 random bytes in base64url: 22 characters', () => {
      expect(createBoxId()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    });

    it('comes from the random source: all zeros give "A"s', () => {
      expect(createBoxId({ nextUint32: () => 0 })).toBe('AAAAAAAAAAAAAAAAAAAAAA');
    });

    it('differs between draws', () => {
      expect(createBoxId()).not.toBe(createBoxId());
    });

    it('validates the format', () => {
      expect(isBoxId(BOX)).toBe(true);
      expect(isBoxId('abc_DEF-123abc_DEF-12')).toBe(false);
      expect(isBoxId('AAAAAAAAAAAAAAAAAAAAA+')).toBe(false);
      expect(isBoxId('AAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
      expect(isBoxId('')).toBe(false);
    });
  });
});
