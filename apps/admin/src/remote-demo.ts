/**
 * Opt-in Cloudflare Quick Tunnel demo support for the admin SPA. Every export
 * is the identity unless the dedicated `demo:remote:admin` dev server set
 * `__REMOTE_DEMO__`. The application keeps its local origins as identities;
 * only browser navigation targets are mapped to the one public origin.
 */
import { remoteDemoPublicUrl, type RemoteDemoOrigins } from '@market/config';

function remoteDemo(): RemoteDemoOrigins | null {
  return typeof __REMOTE_DEMO__ === 'undefined' ? null : __REMOTE_DEMO__;
}

/** The admin's own origin as the backend knows it (handoff `origin` checks). */
export function adminIdentityOrigin() {
  return remoteDemo()?.admin ?? window.location.origin;
}

/** A local account, storefront or admin URL as the browser must open it. */
export function browserUrl(href: string) {
  const origins = remoteDemo();
  if (!origins) return href;
  return remoteDemoPublicUrl(href, window.location.origin, origins) ?? href;
}

/** The browser-side origin of a local storefront origin (postMessage checks). */
export function browserOrigin(origin: string) {
  return remoteDemo() && browserUrl(origin) !== origin
    ? window.location.origin
    : origin;
}

/**
 * Links rendered from data (canonical storefront origins, account links in
 * notifications) are translated as they are followed, without touching the
 * rendered value or anything that is saved.
 */
export function installRemoteDemoLinks() {
  if (!remoteDemo()) return;
  const translate = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const mapped = browserUrl(anchor.href);
    if (mapped !== anchor.href) anchor.href = mapped;
  };
  for (const type of ['click', 'auxclick', 'contextmenu'] as const)
    document.addEventListener(type, translate, true);
}
