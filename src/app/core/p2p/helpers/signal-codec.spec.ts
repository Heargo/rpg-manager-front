import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../testing/sdp-samples';
import { parseDataChannelSdp } from './compact-sdp';
import { decodeSignal, encodeFullSdp, encodeSignal, extractSignalCode, SignalCodeError } from './signal-codec';

describe('signal codec', () => {
  it('encodes v2 codes that decode to the same connection data', async () => {
    const offer = await encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
    const answer = await encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });

    expect(offer.startsWith('2.')).toBe(true);
    expect(parseDataChannelSdp((await decodeSignal(offer, 'offer')).sdp)?.ufrag).toBe('x9cm');
    expect(parseDataChannelSdp((await decodeSignal(answer, 'answer')).sdp)?.mid).toBe('sdparta_0');
  });

  it('makes short, URL-safe codes', async () => {
    const code = await encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
    expect(code).toMatch(/^2\.[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(200);
  });

  it('falls back to v1 for an SDP the compact form cannot hold, and still decodes v1', async () => {
    const odd = CHROME_OFFER.replace('a=mid:0', 'a=mid:0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111');
    const code = await encodeSignal({ type: 'offer', sdp: odd });
    expect(code.startsWith('1.')).toBe(true);
    expect((await decodeSignal(code, 'offer')).sdp).toBe(odd);

    const v1 = await encodeFullSdp({ type: 'answer', sdp: FIREFOX_ANSWER });
    expect((await decodeSignal(v1, 'answer')).sdp).toBe(FIREFOX_ANSWER);
  });

  it('accepts a full invite link and whitespace from chat apps', async () => {
    const code = await encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
    const wrapped = `https://rpg.example/join#${code.slice(0, 20)}\n  ${code.slice(20)}`;
    expect(parseDataChannelSdp((await decodeSignal(wrapped, 'offer')).sdp)?.ufrag).toBe('x9cm');
  });

  it('explains what is wrong with a bad code', async () => {
    const answer = await encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });
    const v1 = await encodeFullSdp({ type: 'answer', sdp: FIREFOX_ANSWER });
    const reason = (input: string, expected: 'offer' | 'answer') =>
      decodeSignal(input, expected).then(
        () => 'ok',
        (error: SignalCodeError) => error.reason,
      );

    expect(await reason('   ', 'offer')).toBe('empty');
    expect(await reason(answer.replace(/^2\./, '9.'), 'answer')).toBe('version');
    expect(await reason('2.not*base64', 'offer')).toBe('corrupt');
    expect(await reason(answer.slice(0, answer.length - 8), 'answer')).toBe('corrupt');
    expect(await reason(v1.slice(0, v1.length - 12), 'answer')).toBe('corrupt');
    expect(await reason(answer, 'offer')).toBe('wrong-type');
  });

  it('extracts the code part', () => {
    expect(extractSignalCode(' 2.abc ')).toBe('2.abc');
    expect(extractSignalCode('http://x/join#2.ab\ncd')).toBe('2.abcd');
  });
});
