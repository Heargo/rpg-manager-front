import {
  RandomSource,
  cryptoRandomSource,
} from '../../generators/random-source';

const BOX_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export interface InviteFragment {
  offerCode: string;
  /** Undefined for a link without a (valid) box: the player then answers by hand. */
  boxId: string | undefined;
}

/** What follows `#` in an invite link: the offer code, then `~` and the mailbox box id when there is one. */
export function buildInviteFragment(offerCode: string, boxId?: string): string {
  return boxId ? `${offerCode}~${boxId}` : offerCode;
}

export function parseInviteFragment(fragment: string): InviteFragment {
  const text = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const tilde = text.indexOf('~');
  if (tilde < 0) return { offerCode: text, boxId: undefined };
  const boxId = text.slice(tilde + 1);
  return {
    offerCode: text.slice(0, tilde),
    boxId: isBoxId(boxId) ? boxId : undefined,
  };
}

/** 16 random bytes in base64url: 22 characters. */
export function createBoxId(
  random: RandomSource = cryptoRandomSource(),
): string {
  const bytes = new Uint8Array(16);
  for (let word = 0; word < 4; word++) {
    const value = random.nextUint32();
    for (let i = 0; i < 4; i++)
      bytes[word * 4 + i] = (value >>> (8 * i)) & 0xff;
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function isBoxId(value: string): boolean {
  return BOX_ID_PATTERN.test(value);
}
