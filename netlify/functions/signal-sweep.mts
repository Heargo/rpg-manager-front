/**
 * Hourly sweep of the signalling mailbox (docs/adr/0004-signal-mailbox.md): deletes the boxes nobody cleaned up
 * (a host who closed the tab, a player who never came). The logic is `sweepMailbox`; this only connects Blobs to it.
 */
import { getStore } from "@netlify/blobs";
import { sweepMailbox } from "../../src/app/core/p2p/helpers/mailbox-handler";

export default async (): Promise<void> => {
  const store = getStore("signal");
  await sweepMailbox(
    {
      get: (key) => store.get(key, { type: "json" }),
      set: (key, value) => store.setJSON(key, value as Record<string, unknown>),
      delete: (key) => store.delete(key),
      list: async () => {
        const keys: string[] = [];
        for await (const page of store.list({ paginate: true })) {
          keys.push(...page.blobs.map((blob) => blob.key));
        }
        return keys;
      },
    },
    Date.now(),
  );
};

export const config = { schedule: "@hourly" };
