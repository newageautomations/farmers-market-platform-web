/**
 * Remote-demo (Cloudflare Quick Tunnel) URL mapping. Pure functions, no I/O.
 *
 * Locally, the application uses several origins: the admin SPA
 * (`http://localhost:4322`), Vendure assets (`http://localhost:3000/assets/`)
 * and one Astro "site" per authority (`http://auth.platform.localhost:4321`,
 * `http://manna-roots.localhost:4321`, bare `http://localhost:4321`). The
 * remote demo has one public HTTPS origin. Internal site origins are presented
 * publicly as `/store/<site>/...`, where `<site>` is the local hostname without
 * its `.localhost` suffix (`localhost` for the bare authority).
 *
 * Used by the loopback proxy (scripts/remote-demo-proxy-core.ts) and by the
 * opt-in remote admin. Never used when remote-demo mode is off.
 */
export const REMOTE_DEMO_SITE_PREFIX = '/store';

export interface RemoteDemoOrigins {
  /** Internal admin SPA origin, e.g. `http://localhost:4322`. */
  admin: string;
  /** Internal Vendure origin whose `/assets/` URLs are browser-facing. */
  vendure: string;
  /** Local Astro port shared by every site authority. */
  storefrontPort: number;
}

const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const SITE_ID = new RegExp(`^${LABEL}(?:\\.${LABEL}){0,4}$`);

/** A public site id, or undefined. Lowercase DNS labels only, at most 5 labels. */
export function remoteDemoSiteId(value: string | undefined | null) {
  return value &&
    value.length <= 200 &&
    SITE_ID.test(value) &&
    value !== 'localhost.localhost' &&
    !value.endsWith('.localhost')
    ? value
    : undefined;
}

/** `manna-roots` -> `manna-roots.localhost:4321`; `localhost` -> `localhost:4321`. */
export function remoteDemoSiteHost(site: string, port: number) {
  return site === 'localhost'
    ? `localhost:${port}`
    : `${site}.localhost:${port}`;
}

export function remoteDemoSiteOrigin(site: string, port: number) {
  return `http://${remoteDemoSiteHost(site, port)}`;
}

/** The site id of an internal Astro origin (`http://<site>.localhost:<port>`). */
export function remoteDemoSiteOf(origin: string, port: number) {
  const match = /^http:\/\/((?:[a-z0-9-]+\.)*)localhost:(\d+)$/.exec(origin);
  if (!match || Number(match[2]) !== port) return undefined;
  return remoteDemoSiteId(match[1] ? match[1].slice(0, -1) : 'localhost');
}

/**
 * The public URL for an absolute internal URL, or undefined when the URL is not
 * one of the mapped internal origins. `currentSite` is the site the response
 * belongs to: links back to it stay unprefixed.
 */
export function remoteDemoPublicUrl(
  value: string,
  publicOrigin: string,
  origins: RemoteDemoOrigins,
  currentSite?: string,
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.username || url.password) return undefined;
  const rest = url.pathname + url.search + url.hash;
  if (url.origin === origins.admin) return publicOrigin + rest;
  if (url.origin === origins.vendure)
    return url.pathname.startsWith('/assets/')
      ? publicOrigin + rest
      : undefined;
  const site = remoteDemoSiteOf(url.origin, origins.storefrontPort);
  if (!site) return undefined;
  return site === currentSite
    ? publicOrigin + rest
    : `${publicOrigin}${REMOTE_DEMO_SITE_PREFIX}/${site}${rest}`;
}

/**
 * Rewrites internal absolute URLs inside text (HTML, JSON, headers).
 *
 * A URL that continues with a path (`origin/...`), or a bare origin that is
 * the whole start of an `href`/`src`/`action` attribute, is a link and is
 * rewritten. Any other bare site origin (`value="http://x.localhost:4321"`) is
 * an identity value, such as a handoff `origin` form field or a canonical
 * origin the backend validates, and stays internal. The admin origin maps to the public
 * origin exactly, so it is rewritten bare or not. Vendure is rewritten only for
 * `/assets/` paths.
 */
export function rewriteRemoteDemoText(
  text: string,
  publicOrigin: string,
  origins: RemoteDemoOrigins,
  currentSite?: string,
  options: { bareSites?: boolean } = {},
) {
  return text.replace(
    // A bare origin that starts a link attribute (`href="http://x.localhost:4321"`)
    // is still a link. `(?<![\w.+-])`/`(?![\w.@-])`: never part of a longer
    // host, and never a userinfo trick.
    /(\b(?:href|src|action|formaction|poster)=["']|"href":")?(?<![\w.+-])http:\/\/((?:[a-z0-9-]+\.)*localhost):(\d+)(?![\w.@-])(\/assets\/|\/)?/g,
    (
      match,
      link: string | undefined,
      host: string,
      port: string,
      slash: string | undefined,
    ) => {
      const lead = link ?? '';
      const origin = `http://${host}:${port}`;
      if (origin === origins.admin) return lead + publicOrigin + (slash ?? '');
      if (origin === origins.vendure)
        return slash === '/assets/' ? `${lead}${publicOrigin}/assets/` : match;
      const site = remoteDemoSiteOf(origin, origins.storefrontPort);
      if (!site || (!slash && !link && !options.bareSites)) return match;
      const base =
        site === currentSite
          ? publicOrigin
          : `${publicOrigin}${REMOTE_DEMO_SITE_PREFIX}/${site}`;
      return lead + base + (slash ?? '');
    },
  );
}
