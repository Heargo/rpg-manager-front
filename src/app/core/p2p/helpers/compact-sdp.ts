/**
 * Compact form of a data-channel-only SDP: just what a WebRTC connection needs, packed as binary.
 * Used by signal codes v2 to cut ~760-character codes to ~200, so QR codes stay easy to scan.
 *
 * Kept: ICE username fragment and password, DTLS fingerprint, setup role, media id (Firefox uses "sdparta_0",
 * and the answer must echo the offer's), and UDP candidates (type, address, port). Dropped: TCP candidates,
 * priorities and foundations (rebuilt), and everything a data channel doesn't use.
 */

export type SetupRole = 'actpass' | 'active' | 'passive';
export type CandidateType = 'host' | 'srflx' | 'prflx' | 'relay';

export interface CompactCandidate {
  type: CandidateType;
  /** IPv4, IPv6, or an mDNS name like `<uuid>.local`. */
  address: string;
  port: number;
}

export interface CompactSdp {
  ufrag: string;
  pwd: string;
  /** e.g. `sha-256`. */
  hashAlgorithm: string;
  /** Uppercase hex pairs separated by `:`, as in SDP. */
  fingerprint: string;
  setup: SetupRole;
  mid: string;
  candidates: CompactCandidate[];
}

const SETUP_ROLES: SetupRole[] = ['actpass', 'active', 'passive'];
const CANDIDATE_TYPES: CandidateType[] = ['host', 'srflx', 'prflx', 'relay'];
const HASHES: Record<string, number> = { 'sha-1': 20, 'sha-256': 32, 'sha-384': 48, 'sha-512': 64 };
const HASH_NAMES = Object.keys(HASHES);
const TYPE_PREFERENCE: Record<CandidateType, number> = { host: 126, prflx: 110, srflx: 100, relay: 0 };

// Address kinds in the binary form.
const IPV4 = 0;
const IPV6 = 1;
const MDNS_UUID = 2;
const TEXT = 3;

/** Reads the parts we keep from a browser's SDP. Returns null if it isn't a single data-channel section. */
export function parseDataChannelSdp(sdp: string): CompactSdp | null {
  const lines = sdp.split(/\r?\n/);
  const media = lines.filter((line) => line.startsWith('m='));
  if (media.length !== 1 || !media[0].includes('webrtc-datachannel')) return null;

  const value = (prefix: string) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim();
  const ufrag = value('a=ice-ufrag:');
  const pwd = value('a=ice-pwd:');
  const fingerprintLine = value('a=fingerprint:');
  const setup = value('a=setup:') as SetupRole | undefined;
  const mid = value('a=mid:');
  if (!ufrag || !pwd || !fingerprintLine || !setup || !mid || !SETUP_ROLES.includes(setup)) return null;

  const [hashAlgorithm, fingerprint] = fingerprintLine.split(/\s+/);
  const length = HASHES[hashAlgorithm?.toLowerCase()];
  if (!length || !fingerprint || fingerprint.split(':').length !== length) return null;

  const candidates: CompactCandidate[] = [];
  for (const line of lines) {
    if (!line.startsWith('a=candidate:')) continue;
    // a=candidate:<foundation> <component> <transport> <priority> <address> <port> typ <type> ...
    const parts = line.slice('a=candidate:'.length).trim().split(/\s+/);
    const [, component, transport, , address, port, typ, type] = parts;
    if (component !== '1' || transport?.toLowerCase() !== 'udp' || typ !== 'typ') continue;
    if (!CANDIDATE_TYPES.includes(type as CandidateType)) continue;
    const portNumber = Number(port);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) continue;
    candidates.push({ type: type as CandidateType, address, port: portNumber });
  }

  return { ufrag, pwd, hashAlgorithm: hashAlgorithm.toLowerCase(), fingerprint: fingerprint.toUpperCase(), setup, mid, candidates };
}

/** Rebuilds a standard data-channel SDP that browsers accept from the compact form. */
export function buildDataChannelSdp(compact: CompactSdp, sessionId: string): string {
  const candidateLines = compact.candidates.map((candidate, index) => {
    const priority = TYPE_PREFERENCE[candidate.type] * 2 ** 24 + (65535 - index) * 2 ** 8 + 255;
    const related = candidate.type === 'host' ? '' : ' raddr 0.0.0.0 rport 0';
    return `a=candidate:${index + 1} 1 udp ${priority} ${candidate.address} ${candidate.port} typ ${candidate.type}${related}`;
  });
  return [
    'v=0',
    `o=- ${sessionId} 2 IN IP4 127.0.0.1`,
    's=-',
    't=0 0',
    `a=group:BUNDLE ${compact.mid}`,
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    ...candidateLines,
    'a=end-of-candidates',
    `a=ice-ufrag:${compact.ufrag}`,
    `a=ice-pwd:${compact.pwd}`,
    `a=fingerprint:${compact.hashAlgorithm} ${compact.fingerprint}`,
    `a=setup:${compact.setup}`,
    `a=mid:${compact.mid}`,
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    '',
  ].join('\r\n');
}

/** Binary form: [flags][ufrag][pwd][hash][fingerprint][mid][count][candidates…]. */
export function packCompactSdp(compact: CompactSdp, isOffer: boolean): Uint8Array {
  const out: number[] = [];
  const text = (value: string) => {
    const bytes = new TextEncoder().encode(value);
    if (bytes.length > 255) throw new RangeError('SDP field too long');
    out.push(bytes.length, ...bytes);
  };
  out.push((isOffer ? 1 : 0) | (SETUP_ROLES.indexOf(compact.setup) << 1));
  text(compact.ufrag);
  text(compact.pwd);
  out.push(HASH_NAMES.indexOf(compact.hashAlgorithm));
  out.push(...compact.fingerprint.split(':').map((hex) => parseInt(hex, 16)));
  text(compact.mid);
  const candidates = compact.candidates.slice(0, 255);
  out.push(candidates.length);
  for (const candidate of candidates) {
    const { kind, bytes } = packAddress(candidate.address);
    out.push(CANDIDATE_TYPES.indexOf(candidate.type) | (kind << 2));
    if (kind === TEXT) text(candidate.address);
    else out.push(...bytes);
    out.push(candidate.port >> 8, candidate.port & 0xff);
  }
  return Uint8Array.from(out);
}

/** Reverse of packCompactSdp; throws RangeError on truncated or invalid data. */
export function unpackCompactSdp(bytes: Uint8Array): { isOffer: boolean; compact: CompactSdp } {
  let offset = 0;
  const byte = () => {
    if (offset >= bytes.length) throw new RangeError('Truncated code');
    return bytes[offset++];
  };
  const take = (length: number) => {
    if (offset + length > bytes.length) throw new RangeError('Truncated code');
    const slice = bytes.subarray(offset, offset + length);
    offset += length;
    return slice;
  };
  const text = () => new TextDecoder('utf-8', { fatal: true }).decode(take(byte()));

  const flags = byte();
  const setup = SETUP_ROLES[(flags >> 1) & 3];
  if (!setup) throw new RangeError('Bad setup role');
  const ufrag = text();
  const pwd = text();
  const hashAlgorithm = HASH_NAMES[byte()];
  if (!hashAlgorithm) throw new RangeError('Bad hash');
  const fingerprint = Array.from(take(HASHES[hashAlgorithm]), (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(':');
  const mid = text();
  const count = byte();
  const candidates: CompactCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const head = byte();
    const type = CANDIDATE_TYPES[head & 3];
    const kind = head >> 2;
    const address =
      kind === IPV4 ? Array.from(take(4)).join('.')
      : kind === IPV6 ? formatIpv6(take(16))
      : kind === MDNS_UUID ? `${formatUuid(take(16))}.local`
      : kind === TEXT ? text()
      : undefined;
    if (!address) throw new RangeError('Bad address');
    const port = (byte() << 8) | byte();
    candidates.push({ type, address, port });
  }
  if (offset !== bytes.length || !ufrag || !pwd || !mid) throw new RangeError('Bad code');
  return { isOffer: (flags & 1) === 1, compact: { ufrag, pwd, hashAlgorithm, fingerprint, setup, mid, candidates } };
}

function packAddress(address: string): { kind: number; bytes: number[] } {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (ipv4 && ipv4.slice(1).every((part) => Number(part) <= 255)) {
    return { kind: IPV4, bytes: ipv4.slice(1).map(Number) };
  }
  const uuid = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/.exec(address);
  if (uuid) return { kind: MDNS_UUID, bytes: hexBytes(uuid.slice(1).join('')) };
  const ipv6 = parseIpv6(address);
  if (ipv6) return { kind: IPV6, bytes: ipv6 };
  return { kind: TEXT, bytes: [] };
}

function parseIpv6(address: string): number[] | null {
  if (!address.includes(':') || !/^[0-9a-fA-F:]+$/.test(address)) return null;
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.some((group) => group.length === 0 || group.length > 4)) return null;
  return groups.flatMap((group) => {
    const value = parseInt(group, 16);
    return [value >> 8, value & 0xff];
  });
}

/** Canonical lowercase form, longest run of zero groups as `::`. */
function formatIpv6(bytes: Uint8Array): string {
  const groups = Array.from({ length: 8 }, (_, i) => ((bytes[2 * i] << 8) | bytes[2 * i + 1]).toString(16));
  let best = { start: -1, length: 0 };
  for (let i = 0; i < 8; ) {
    if (groups[i] !== '0') {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === '0') j++;
    if (j - i > best.length && j - i > 1) best = { start: i, length: j - i };
    i = j;
  }
  if (best.start < 0) return groups.join(':');
  return `${groups.slice(0, best.start).join(':')}::${groups.slice(best.start + best.length).join(':')}`;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function hexBytes(hex: string): number[] {
  return Array.from({ length: hex.length / 2 }, (_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16));
}
