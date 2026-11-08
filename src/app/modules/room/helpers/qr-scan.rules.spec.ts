import { encodeSignal } from '../../../core/p2p/helpers/signal-codec';
import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../testing/sdp-samples';
import { acceptScan, classifyScan, pickDecoder } from './qr-scan.rules';

const offerCode = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
const answerCode = encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });
const boxId = 'AAAAAAAAAAAAAAAAAAAAAA';

describe('classifyScan', () => {
  it('sorts an invite link', () => {
    expect(classifyScan(`https://app.example/join#${offerCode}`).kind).toBe('invite-link');
  });

  it('sorts an invite link made for the mailbox', () => {
    expect(classifyScan(`https://app.example/join#${offerCode}~${boxId}`).kind).toBe('invite-link');
  });

  it('sorts a bare invite code', () => {
    expect(classifyScan(offerCode).kind).toBe('invite-code');
  });

  it('sorts an answer code', () => {
    expect(classifyScan(answerCode).kind).toBe('answer-code');
  });

  it('ignores surrounding whitespace', () => {
    expect(classifyScan(`  ${answerCode}\n`).kind).toBe('answer-code');
  });

  it('calls anything else unknown', () => {
    expect(classifyScan('https://example.com/menu').kind).toBe('unknown');
    expect(classifyScan('hello').kind).toBe('unknown');
    expect(classifyScan('').kind).toBe('unknown');
    expect(classifyScan('3.abcdef').kind).toBe('unknown');
  });
});

describe('acceptScan', () => {
  it('lets the host pending invite take an answer code', () => {
    expect(acceptScan(answerCode, 'host-pending-invite')).toEqual({ accepted: true, text: answerCode });
  });

  it('refuses an invite code on the host pending invite', () => {
    expect(acceptScan(offerCode, 'host-pending-invite')).toEqual({ accepted: false, reason: 'wrong-kind' });
  });

  it('refuses an invite link on the host pending invite', () => {
    expect(acceptScan(`https://app.example/join#${offerCode}`, 'host-pending-invite')).toEqual({
      accepted: false,
      reason: 'wrong-kind',
    });
  });

  it('lets the join entry take an invite link or an invite code', () => {
    const link = `https://app.example/join#${offerCode}`;
    expect(acceptScan(link, 'join-entry')).toEqual({ accepted: true, text: link });
    expect(acceptScan(offerCode, 'join-entry')).toEqual({ accepted: true, text: offerCode });
  });

  it('refuses an answer code at the join entry', () => {
    expect(acceptScan(answerCode, 'join-entry')).toEqual({ accepted: false, reason: 'wrong-kind' });
  });

  it('refuses unknown text in both places', () => {
    expect(acceptScan('hello', 'join-entry')).toEqual({ accepted: false, reason: 'unknown' });
    expect(acceptScan('hello', 'host-pending-invite')).toEqual({ accepted: false, reason: 'unknown' });
  });
});

describe('pickDecoder', () => {
  it('uses BarcodeDetector when the browser has it', () => {
    expect(pickDecoder({ BarcodeDetector: class {} })).toBe('barcode-detector');
  });

  it('falls back to jsqr without BarcodeDetector', () => {
    expect(pickDecoder({})).toBe('jsqr');
  });
});
