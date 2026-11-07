import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../testing/sdp-samples';
import { buildDataChannelSdp, packCompactSdp, parseDataChannelSdp, unpackCompactSdp } from './compact-sdp';

describe('compact SDP', () => {
  it('keeps what a Chrome offer needs and drops TCP candidates', () => {
    expect(parseDataChannelSdp(CHROME_OFFER)).toEqual({
      ufrag: 'x9cm',
      pwd: 'ZgXQ4zL0x8jvYt1b6bUoQ1Ft',
      hashAlgorithm: 'sha-256',
      fingerprint: '7B:8B:F0:65:5F:78:E2:51:3B:AC:6F:F3:3F:46:1B:35:DC:B8:5F:64:1A:24:C2:43:F0:A1:58:D0:A1:2C:19:08',
      setup: 'actpass',
      mid: '0',
      candidates: [
        { type: 'host', address: '4a7c0e1e-7b4f-4c55-9d43-7c1f8b2b6c11.local', port: 54400 },
        { type: 'srflx', address: '203.0.113.7', port: 54400 },
        { type: 'srflx', address: '2001:db8:0:0:0:0:0:1', port: 54401 },
      ],
    });
  });

  it('reads a Firefox answer (session-level fingerprint, sdparta mid, uppercase UDP)', () => {
    const compact = parseDataChannelSdp(FIREFOX_ANSWER)!;
    expect(compact.mid).toBe('sdparta_0');
    expect(compact.setup).toBe('active');
    expect(compact.fingerprint).toMatch(/^A1:B2:C3/);
    expect(compact.candidates.map((c) => `${c.type} ${c.address} ${c.port}`)).toEqual([
      'host 8f2cc0de-1234-4abc-9def-0123456789ab.local 52341',
      'srflx 198.51.100.4 52341',
    ]);
  });

  it.each([
    ['Chrome offer', CHROME_OFFER, true],
    ['Firefox answer', FIREFOX_ANSWER, false],
  ])('packs and unpacks a %s losslessly (IPv6 canonicalized)', (_name, sdp, isOffer) => {
    const compact = parseDataChannelSdp(sdp)!;
    const unpacked = unpackCompactSdp(packCompactSdp(compact, isOffer));
    expect(unpacked.isOffer).toBe(isOffer);
    expect(unpacked.compact).toEqual({
      ...compact,
      candidates: compact.candidates.map((c) => ({ ...c, address: c.address.replace('2001:db8:0:0:0:0:0:1', '2001:db8::1') })),
    });
  });

  it('is small: under 150 bytes for three candidates', () => {
    expect(packCompactSdp(parseDataChannelSdp(CHROME_OFFER)!, true).length).toBeLessThan(150);
  });

  it('rebuilds an SDP that parses back to the same connection data', () => {
    const compact = parseDataChannelSdp(FIREFOX_ANSWER)!;
    const rebuilt = buildDataChannelSdp(compact, '123');
    expect(parseDataChannelSdp(rebuilt)).toEqual(compact);
    expect(rebuilt).toContain('a=group:BUNDLE sdparta_0');
    expect(rebuilt).toContain('a=end-of-candidates');
    expect(rebuilt).toContain('typ srflx raddr 0.0.0.0 rport 0');
  });

  it('refuses SDPs it cannot represent', () => {
    expect(parseDataChannelSdp(CHROME_OFFER.replace('m=application 54400 UDP/DTLS/SCTP webrtc-datachannel', 'm=audio 9 UDP/TLS/RTP/SAVPF 111'))).toBeNull();
    expect(parseDataChannelSdp(CHROME_OFFER.replace(/a=ice-pwd:.*\r\n/, ''))).toBeNull();
    expect(parseDataChannelSdp(CHROME_OFFER.replace('sha-256', 'md5'))).toBeNull();
  });

  it('keeps unusual addresses as text', () => {
    const compact = { ...parseDataChannelSdp(CHROME_OFFER)!, candidates: [{ type: 'host' as const, address: 'MyHost.local', port: 9000 }] };
    expect(unpackCompactSdp(packCompactSdp(compact, true)).compact.candidates).toEqual(compact.candidates);
  });

  it('rejects truncated data', () => {
    const bytes = packCompactSdp(parseDataChannelSdp(CHROME_OFFER)!, true);
    expect(() => unpackCompactSdp(bytes.subarray(0, bytes.length - 3))).toThrow(RangeError);
    expect(() => unpackCompactSdp(Uint8Array.from([...bytes, 0]))).toThrow(RangeError);
  });
});
