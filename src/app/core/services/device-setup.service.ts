import { Injectable } from '@angular/core';
import type { DeviceSetup } from '../models/device-setup';

interface NavigatorHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  userAgentData?: { mobile?: boolean };
  connection?: { effectiveType?: string; downlink?: number };
}

/** Reads what the browser says about this device (memory, cores, connection); missing values stay undefined. */
@Injectable({ providedIn: 'root' })
export class DeviceSetupService {
  read(): DeviceSetup {
    if (typeof navigator === 'undefined') return { mobile: false };
    const nav = navigator as Navigator & NavigatorHints;
    return {
      mobile:
        nav.userAgentData?.mobile ??
        /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent),
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      effectiveType: nav.connection?.effectiveType,
      downlink: nav.connection?.downlink,
    };
  }
}
