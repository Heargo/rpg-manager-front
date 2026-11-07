/**
 * GET /.netlify/functions/ice-servers → `{ iceServers: RTCIceServer[] }` from Metered's Open Relay TURN
 * (docs/adr/0003-open-relay-turn.md). The API key stays here, so it never ships in the bundle.
 *
 * Netlify environment variables: METERED_APP_NAME (the `<name>` in `<name>.metered.live`), METERED_API_KEY.
 */

export default async (): Promise<Response> => {
  const appName = process.env["METERED_APP_NAME"];
  const apiKey = process.env["METERED_API_KEY"];
  if (!appName || !apiKey || !/^[a-z0-9-]+$/i.test(appName)) {
    return json({ error: "TURN is not configured" }, 503);
  }

  const response = await fetch(
    `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
  ).catch(() => null);
  if (!response?.ok)
    return json({ error: "TURN credentials request failed" }, 502);

  // Metered answers with the iceServers array itself.
  const body = (await response.json().catch(() => null)) as unknown;
  const iceServers = Array.isArray(body)
    ? body
    : (body as { iceServers?: unknown } | null)?.iceServers;
  if (!Array.isArray(iceServers) || iceServers.length === 0) {
    return json({ error: "Unexpected TURN credentials response" }, 502);
  }
  return json({ iceServers }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
