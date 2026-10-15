import type { MiddlewareHandler } from 'astro';
import { assertGalleryEnvironment } from '../../../../scripts/ui-gallery-policy';
import { readCandidates } from '../candidates';

// Installed before any island runs. Original component behavior is not patched.
const guard = `<script>
window.fetch = () => Promise.reject(new Error('Gallery network requests are disabled'));
XMLHttpRequest.prototype.open = function () { throw new Error('Gallery network requests are disabled'); };
navigator.sendBeacon = () => false;
document.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
document.addEventListener('click', event => {
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (anchor && !anchor.getAttribute('href')?.startsWith('#')) event.preventDefault();
}, true);
</script>`;

export const onRequest: MiddlewareHandler = async ({ request }, next) => {
  assertGalleryEnvironment('dev', process.env);
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.hostname !== '127.0.0.1' ||
    (url.pathname !== '/' &&
      !/^\/sample\/(base|admin|storefront|customer)\/?$/.test(url.pathname))
  )
    return new Response('Not found', { status: 404 });
  if (
    url.pathname.startsWith('/sample/') &&
    !readCandidates().some((c) => c.id === url.searchParams.get('id'))
  ) {
    return new Response('Unknown candidate', { status: 404 });
  }
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; form-action 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
  );
  if (!headers.get('content-type')?.includes('text/html')) return response;
  const html = (await response.text()).replace(
    /<head(?:\s[^>]*)?>/,
    '$&' + guard,
  );
  return new Response(html, { status: response.status, headers });
};
