import { fetchIceServers, ICE_SERVERS_URL, STUN_ONLY } from './ice-servers';

describe('fetchIceServers', () => {
  const TURN: RTCIceServer[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: ['turn:turn.cloudflare.com:3478?transport=udp'],
      username: 'u',
      credential: 'c',
    },
  ];
  const respond = (status: number, body: string) =>
    vi.fn(async () => new Response(body, { status }));

  it('returns the TURN servers from the Netlify Function', async () => {
    const fetchFn = respond(200, JSON.stringify({ iceServers: TURN }));
    expect(await fetchIceServers(fetchFn)).toEqual(TURN);
    expect(fetchFn).toHaveBeenCalledWith(ICE_SERVERS_URL, expect.anything());
  });

  it('falls back to public STUN when the function is not configured or fails', async () => {
    expect(
      await fetchIceServers(respond(503, '{"error":"TURN is not configured"}')),
    ).toEqual(STUN_ONLY);
    expect(
      await fetchIceServers(
        vi.fn(async () => Promise.reject(new TypeError('offline'))),
      ),
    ).toEqual(STUN_ONLY);
  });

  it('falls back to public STUN on an unexpected body (ng serve answers with index.html)', async () => {
    expect(
      await fetchIceServers(respond(200, '<!doctype html><html></html>')),
    ).toEqual(STUN_ONLY);
    expect(await fetchIceServers(respond(200, '{"iceServers":[]}'))).toEqual(
      STUN_ONLY,
    );
    expect(
      await fetchIceServers(respond(200, '{"iceServers":[{"urls":42}]}')),
    ).toEqual(STUN_ONLY);
  });
});
