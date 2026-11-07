import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../testing/sdp-samples';
import { parseDataChannelSdp } from './compact-sdp';
import { decodeSignal, encodeSignal, extractSignalCode, SignalCodeError } from './signal-codec';

describe('signal codec', () => {
  it('encodes v2 codes that decode to the same connection data', () => {
    const offer = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
    const answer = encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });

    expect(offer.startsWith('2.')).toBe(true);
    expect(parseDataChannelSdp(decodeSignal(offer, 'offer').sdp)?.ufrag).toBe('x9cm');
    expect(parseDataChannelSdp(decodeSignal(answer, 'answer').sdp)?.mid).toBe('sdparta_0');
  });

  it('makes short, URL-safe codes', () => {
    const code = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
    expect(code).toMatch(/^2\.[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(200);
  });

  it('refuses to encode an SDP that is not a single data channel', () => {
    const audio = CHROME_OFFER.replace('a=mid:0', 'a=mid:0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111');
    expect(() => encodeSignal({ type: 'offer', sdp: audio })).toThrow('Unsupported SDP');
  });

  it('encodes an SDP without candidates (gathering found none in time)', () => {
    const noCandidates = CHROME_OFFER.split('\r\n').filter((line) => !line.startsWith('a=candidate')).join('\r\n');
    const decoded = parseDataChannelSdp(decodeSignal(encodeSignal({ type: 'offer', sdp: noCandidates }), 'offer').sdp);
    expect(decoded?.ufrag).toBe('x9cm');
    expect(decoded?.candidates).toEqual([]);
  });

  it('accepts a full invite link and whitespace from chat apps', () => {
    const code = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
    const wrapped = `https://rpg.example/join#${code.slice(0, 20)}\n  ${code.slice(20)}`;
    expect(parseDataChannelSdp(decodeSignal(wrapped, 'offer').sdp)?.ufrag).toBe('x9cm');
  });

  it('explains what is wrong with a bad code', () => {
    const answer = encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });
    const reason = (input: string, expected: 'offer' | 'answer') => {
      try {
        decodeSignal(input, expected);
        return 'ok';
      } catch (error) {
        return (error as SignalCodeError).reason;
      }
    };

    expect(reason('   ', 'offer')).toBe('empty');
    expect(reason(answer.replace(/^2\./, '9.'), 'answer')).toBe('version');
    expect(reason('2.not*base64', 'offer')).toBe('corrupt');
    expect(reason(answer.slice(0, answer.length - 8), 'answer')).toBe('corrupt');
    expect(reason(answer, 'offer')).toBe('wrong-type');
  });

  it('extracts the code part', () => {
    expect(extractSignalCode(' 2.abc ')).toBe('2.abc');
    expect(extractSignalCode('http://x/join#2.ab\ncd')).toBe('2.abcd');
  });
});
