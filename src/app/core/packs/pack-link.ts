/** A link to an unofficial pack, resolved to the URL of its manifest. `error` is an i18n key. */
export type PackLinkResolution =
  | { ok: true; manifestUrl: string; source: string }
  | { ok: false; error: string };

const RAW = 'https://raw.githubusercontent.com';

const refuse = (error: string): PackLinkResolution => ({ ok: false, error });

/**
 * Turns a GitHub repository link (`/<owner>/<repo>`, `/tree/<ref>[/<path>]`, `/blob/<ref>/<path>.json`) into the
 * raw URL of its `pack.json`, or keeps a direct HTTPS `.json` URL. Anything else is refused.
 */
export function resolvePackLink(link: string): PackLinkResolution {
  const trimmed = link.trim();
  if (!trimmed) return refuse('packs.link.empty');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return refuse('packs.link.invalid');
  }
  if (url.protocol !== 'https:') return refuse('packs.link.notHttps');

  if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return refuse('packs.link.notRepository');
    parts[1] = parts[1].replace(/\.git$/, '');
    const [owner, repo, mode, ref, ...path] = parts;
    if (!owner || !repo) return refuse('packs.link.notRepository');
    const source = `https://github.com/${parts.join('/')}`;
    if (parts.length === 2)
      return {
        ok: true,
        manifestUrl: `${RAW}/${owner}/${repo}/HEAD/pack.json`,
        source,
      };
    if (mode === 'tree' && ref) {
      const folder = path.length ? `${path.join('/')}/` : '';
      return {
        ok: true,
        manifestUrl: `${RAW}/${owner}/${repo}/${ref}/${folder}pack.json`,
        source,
      };
    }
    if (
      mode === 'blob' &&
      ref &&
      path.length &&
      path[path.length - 1].endsWith('.json')
    )
      return {
        ok: true,
        manifestUrl: `${RAW}/${owner}/${repo}/${ref}/${path.join('/')}`,
        source,
      };
    return refuse('packs.link.notRepository');
  }

  if (!url.pathname.endsWith('.json')) return refuse('packs.link.notJson');
  return { ok: true, manifestUrl: trimmed, source: trimmed };
}
