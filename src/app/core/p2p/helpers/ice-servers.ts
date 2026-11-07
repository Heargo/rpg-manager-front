/**
 * STUN/TURN servers for a new peer connection (docs/adr/0003-open-relay-turn.md): the Netlify Function's
 * Open Relay TURN credentials, or public STUN only when it can't be reached (`ng serve`, offline, not
 * configured). TURN only matters when a direct connection fails, so the fallback never blocks an invite.
 */

export const ICE_SERVERS_URL = '/.netlify/functions/ice-servers';
export const STUN_ONLY: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];
const FETCH_TIMEOUT_MS = 3000;

export async function fetchIceServers(
  fetchFn: typeof fetch = fetch,
): Promise<RTCIceServer[]> {
  try {
    const response = await fetchFn(ICE_SERVERS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return STUN_ONLY;
    const body = (await response.json()) as { iceServers?: unknown };
    return isIceServerList(body.iceServers) ? body.iceServers : STUN_ONLY;
  } catch {
    return STUN_ONLY;
  }
}

function isIceServerList(value: unknown): value is RTCIceServer[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((server) => {
      const urls = (server as RTCIceServer | null)?.urls;
      return (
        typeof urls === 'string' ||
        (Array.isArray(urls) && urls.every((url) => typeof url === 'string'))
      );
    })
  );
}
