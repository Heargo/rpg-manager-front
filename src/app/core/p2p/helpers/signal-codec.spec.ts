import { decodeSignal, encodeSignal, extractSignalCode, SignalCodeError } from './signal-codec';

/** A realistic Chrome data-channel offer after full ICE gathering (host mDNS + srflx candidates). */
const OFFER_SDP = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 54400 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 203.0.113.7',
  'a=candidate:1467250027 1 udp 2122260223 4a7c0e1e-7b4f-4c55-9d43-7c1f8b2b6c11.local 54400 typ host generation 0 network-id 1',
  'a=candidate:842163049 1 udp 1686052607 203.0.113.7 54400 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-id 1',
  'a=candidate:3141592653 1 tcp 1518280447 4a7c0e1e-7b4f-4c55-9d43-7c1f8b2b6c11.local 9 typ host tcptype active generation 0 network-id 1',
  'a=ice-ufrag:x9cm',
  'a=ice-pwd:ZgXQ4zL0x8jvYt1b6bUoQ1Ft',
  'a=ice-options:trickle',
  'a=fingerprint:sha-256 7B:8B:F0:65:5F:78:E2:51:3B:AC:6F:F3:3F:46:1B:35:DC:B8:5F:64:1A:24:C2:43:F0:A1:58:D0:A1:2C:19:08',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
  '',
].join('\r\n');

describe('signal codec', () => {
  it('round-trips an offer and an answer', async () => {
    const offer = await encodeSignal({ type: 'offer', sdp: OFFER_SDP });
    expect(await decodeSignal(offer, 'offer')).toEqual({ type: 'offer', sdp: OFFER_SDP });

    const answerSdp = OFFER_SDP.replace('a=setup:actpass', 'a=setup:active');
    const answer = await encodeSignal({ type: 'answer', sdp: answerSdp });
    expect(await decodeSignal(answer, 'answer')).toEqual({ type: 'answer', sdp: answerSdp });
  });

  it('makes URL-safe codes with a version prefix, under the 800-character target', async () => {
    const code = await encodeSignal({ type: 'offer', sdp: OFFER_SDP });
    expect(code).toMatch(/^1\.[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(800);
  });

  it('accepts a full invite link and whitespace from chat apps', async () => {
    const code = await encodeSignal({ type: 'offer', sdp: OFFER_SDP });
    const wrapped = `https://rpg.example/join#${code.slice(0, 20)}\n  ${code.slice(20)}`;
    expect((await decodeSignal(wrapped, 'offer')).sdp).toBe(OFFER_SDP);
  });

  it('explains what is wrong with a bad code', async () => {
    const answer = await encodeSignal({ type: 'answer', sdp: OFFER_SDP });
    const reason = (input: string, expected: 'offer' | 'answer') =>
      decodeSignal(input, expected).then(
        () => 'ok',
        (error: SignalCodeError) => error.reason,
      );

    expect(await reason('   ', 'offer')).toBe('empty');
    expect(await reason(answer.replace(/^1\./, '2.'), 'answer')).toBe('version');
    expect(await reason('1.not*base64', 'offer')).toBe('corrupt');
    expect(await reason(answer.slice(0, answer.length - 12), 'answer')).toBe('corrupt');
    expect(await reason(answer, 'offer')).toBe('wrong-type');
  });

  it('extracts the code part', () => {
    expect(extractSignalCode(' 1.abc ')).toBe('1.abc');
    expect(extractSignalCode('http://x/join#1.ab\ncd')).toBe('1.abcd');
  });
});
