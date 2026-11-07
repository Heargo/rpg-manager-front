/** What the host's device tells about itself (all optional values are unknown on some browsers). */
export interface DeviceSetup {
  mobile: boolean;
  /** GB, from `navigator.deviceMemory`. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  /** `navigator.connection.effectiveType`. */
  effectiveType?: string;
  /** Mbps, from `navigator.connection.downlink`. */
  downlink?: number;
}
