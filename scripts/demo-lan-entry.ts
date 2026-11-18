import { createServer, type Server } from 'node:http';

/** Keep one browser origin for account cookies while supporting the familiar ports. */
export function createDemoLanEntry(
  origin: string,
  kind: 'storefront' | 'admin',
): Server {
  return createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.writeHead(405, { allow: 'GET, HEAD' });
      return response.end();
    }
    const target = request.url ?? '/';
    if (
      !target.startsWith('/') ||
      target.startsWith('//') ||
      target.includes('\\')
    ) {
      response.writeHead(400);
      return response.end();
    }
    const account = /^\/(account|auth)(\/|\?|$)/.test(target);
    const destination =
      kind === 'admin'
        ? target === '/'
          ? '/vendor'
          : target
        : `/store/${account ? 'auth.platform' : 'localhost'}${target}`;
    response.writeHead(302, {
      location: origin + destination,
      'cache-control': 'no-store',
    });
    response.end();
  });
}
