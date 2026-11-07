import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../testing/sdp-samples';
import { decodeSignal, encodeSignal } from './helpers/signal-codec';
import { WebRtcTransport } from './webrtc-transport';

const TURN: RTCIceServer[] = [
  { urls: 'stun:stun.example.org:3478' },
  { urls: 'turn:relay.example.org:443?transport=tcp', username: 'user', credential: 'secret' },
];

const usesTurn = (servers: RTCIceServer[] | undefined) =>
  (servers ?? []).some((server) => [server.urls].flat().some((url) => url.startsWith('turn')));

class FakePeerConnection {
  static instances: FakePeerConnection[] = [];
  iceGatheringState = 'complete';
  connectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  ondatachannel: ((event: unknown) => void) | null = null;
  closed = false;

  constructor(readonly config: RTCConfiguration) {
    FakePeerConnection.instances.push(this);
  }

  createDataChannel() {
    return { readyState: 'connecting', addEventListener: () => undefined, removeEventListener: () => undefined };
  }
  async createOffer() {
    return { type: 'offer', sdp: CHROME_OFFER };
  }
  async createAnswer() {
    return { type: 'answer', sdp: FIREFOX_ANSWER };
  }
  async setLocalDescription(description: { type: string; sdp: string }) {
    this.localDescription = description;
  }
  async setRemoteDescription() {}
  addEventListener() {}
  removeEventListener() {}
  close() {
    this.closed = true;
  }
}

describe('WebRtcTransport relay', () => {
  let transport: WebRtcTransport;
  const fetchMock = vi.fn<() => Promise<RTCIceServer[]>>();

  beforeEach(() => {
    FakePeerConnection.instances = [];
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(TURN);
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    transport = new WebRtcTransport({ iceServers: fetchMock });
  });

  afterEach(() => {
    transport.close();
    vi.unstubAllGlobals();
  });

  it('makes the first invite with STUN only and never asks the ICE servers function', async () => {
    await transport.createInvite();

    expect(fetchMock).not.toHaveBeenCalled();
    const config = FakePeerConnection.instances[0].config;
    expect(config.iceServers?.length).toBeGreaterThan(0);
    expect(usesTurn(config.iceServers)).toBe(false);
    expect(config.iceTransportPolicy).not.toBe('relay');
  });

  it('makes a relay invite with the function\'s TURN servers and relay-only policy', async () => {
    await transport.createInvite({ relay: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const config = FakePeerConnection.instances[0].config;
    expect(config.iceServers).toEqual(TURN);
    expect(config.iceTransportPolicy).toBe('relay');
  });

  it('flags the relay invite\'s code and leaves the direct one unflagged', async () => {
    const direct = await transport.createInvite();
    const relay = await transport.createInvite({ relay: true });

    expect(decodeSignal(direct.offerCode, 'offer').relay).toBe(false);
    expect(decodeSignal(relay.offerCode, 'offer').relay).toBe(true);
  });

  it('refuses a relay invite when the function gave no TURN server, instead of making one that cannot work', async () => {
    fetchMock.mockResolvedValue([{ urls: 'stun:stun.example.org:3478' }]);

    await expect(transport.createInvite({ relay: true })).rejects.toMatchObject({ reason: 'relay-unavailable' });
    expect(FakePeerConnection.instances).toHaveLength(0);
  });

  it('answers a direct offer with STUN only and without asking the function', async () => {
    await transport.answerInvite(encodeSignal({ type: 'offer', sdp: CHROME_OFFER }));

    expect(fetchMock).not.toHaveBeenCalled();
    const config = FakePeerConnection.instances[0].config;
    expect(usesTurn(config.iceServers)).toBe(false);
    expect(config.iceTransportPolicy).not.toBe('relay');
  });

  it('answers a relay offer with the function\'s TURN servers and relay-only policy', async () => {
    await transport.answerInvite(encodeSignal({ type: 'offer', sdp: CHROME_OFFER, relay: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const config = FakePeerConnection.instances[0].config;
    expect(config.iceServers).toEqual(TURN);
    expect(config.iceTransportPolicy).toBe('relay');
  });

  it('rejects answering a relay offer when no TURN server is available', async () => {
    fetchMock.mockResolvedValue([{ urls: 'stun:stun.example.org:3478' }]);

    await expect(
      transport.answerInvite(encodeSignal({ type: 'offer', sdp: CHROME_OFFER, relay: true })),
    ).rejects.toMatchObject({ reason: 'relay-unavailable' });
  });
});
