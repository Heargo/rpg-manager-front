import type { DeviceSetup } from '../../../core/models/device-setup';

export type { DeviceSetup };

const BASE_MAX = 8;
const MIN_MAX = 2;
const MAX_MAX = 16;
const SLOW_DOWNLINK_MBPS = 1.5;
const STRUGGLING_MEDIAN_MS = 400;
const STRUGGLING_PINGS = 3;
const STRUGGLING_BUFFERED_BYTES = 1_000_000;

/** How many people (host included) the host's device should handle comfortably. */
export function recommendedMax(setup: DeviceSetup): number {
  let max = setup.mobile ? BASE_MAX / 2 : BASE_MAX;
  if (setup.deviceMemory !== undefined) {
    if (setup.deviceMemory <= 2) max -= 3;
    else if (setup.deviceMemory >= 8) max += 4;
  }
  if (setup.hardwareConcurrency !== undefined) {
    if (setup.hardwareConcurrency <= 2) max -= 2;
    else if (setup.hardwareConcurrency >= 8) max += 2;
  }
  const slow =
    setup.effectiveType === '2g' ||
    setup.effectiveType === '3g' ||
    (setup.downlink !== undefined && setup.downlink < SLOW_DOWNLINK_MBPS);
  if (slow) max -= 3;
  return Math.min(MAX_MAX, Math.max(MIN_MAX, max));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * True when a player's median round trip over their last 3 pings is above 400 ms,
 * or more than 1 MB is buffered on any channel.
 */
export function isStruggling(
  pingsByPlayer: number[][],
  bufferedBytes: number[],
): boolean {
  if (bufferedBytes.some((bytes) => bytes > STRUGGLING_BUFFERED_BYTES))
    return true;
  return pingsByPlayer.some((pings) => {
    const recent = pings.slice(-STRUGGLING_PINGS);
    return recent.length > 0 && median(recent) > STRUGGLING_MEDIAN_MS;
  });
}
