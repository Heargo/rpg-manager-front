/** The local player identity: no account, stored on this device only. */
export interface Profile {
  /** Stable across sessions; used to give a player their seat back in a room. */
  playerId: string;
  name: string;
}
