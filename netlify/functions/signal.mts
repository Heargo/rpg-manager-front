/**
 * Signalling mailbox (docs/adr/0004-signal-mailbox.md): lets a player's browser hand its answer code to the host's
 * browser without anyone pasting it.
 *
 *   PUT    /.netlify/functions/signal?box=<id>&from=host|player   body { seq, code }
 *   GET    /.netlify/functions/signal?box=<id>&from=host|player   → the other side's latest message, or 204
 *   DELETE /.netlify/functions/signal?box=<id>[&reason=used|expired]
 *
 * A player's GET answers 409 when the invite was used and 410 when it expired (cancelled, or past the TTL).
 *
 * Boxes live in Netlify Blobs (store `signal`) and count as empty after 30 minutes. The logic is in
 * `createMailboxHandler`; this file only connects it to Netlify.
 */
import { getStore } from "@netlify/blobs";
import { createMailboxHandler } from "../../src/app/core/p2p/helpers/mailbox-handler";

const MAX_BODY_CHARS = 4096;

export default async (request: Request): Promise<Response> => {
  const store = getStore("signal");
  const handle = createMailboxHandler(
    {
      get: (key) => store.get(key, { type: "json" }),
      set: (key, value) => store.setJSON(key, value as Record<string, unknown>),
      delete: (key) => store.delete(key),
    },
    () => Date.now(),
  );

  const url = new URL(request.url);
  let body: unknown;
  if (request.method === "PUT") {
    // A message is a code of at most 2,000 characters: refuse anything bigger before parsing it.
    if (Number(request.headers.get("content-length")) > MAX_BODY_CHARS) {
      return new Response(null, {
        status: 413,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return new Response(null, {
        status: 413,
        headers: { "Cache-Control": "no-store" },
      });
    }
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  const { status, body: responseBody } = await handle({
    method: request.method,
    box: url.searchParams.get("box") ?? "",
    from: url.searchParams.get("from") ?? undefined,
    body,
    reason: url.searchParams.get("reason") ?? undefined,
  });
  return new Response(
    responseBody === undefined ? null : JSON.stringify(responseBody),
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(responseBody === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
    },
  );
};
