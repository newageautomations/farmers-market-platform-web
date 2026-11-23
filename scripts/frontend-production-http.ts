import { readFileSync } from 'node:fs';
import { createServer as httpServer } from 'node:http';
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http';
import { createServer as httpsServer } from 'node:https';
import type { frontendListener } from '@market/config/hosted';
import {
  hasForwardingHeaders,
  ingressClient,
  stripIngressHeaders,
  wireAuthority,
} from '@market/config/hosted';

type Listener = ReturnType<typeof frontendListener>;

export function frontendServer(listener: Listener, handler: RequestListener) {
  const native = listener.keyPath !== undefined;
  let ready = false;
  const server = native
    ? httpsServer(
        {
          key: readFileSync(listener.keyPath!),
          cert: readFileSync(listener.certPath!),
        },
        handler,
      )
    : httpServer(handler);
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.keepAliveTimeout = 5000;
  server.once('listening', () => {
    ready = true;
  });
  server.listen(listener.port, listener.address);
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => {
      ready = false;
      const deadline = setTimeout(() => {
        server.closeAllConnections();
        process.exitCode = 1;
      }, 30000);
      server.close(() => clearTimeout(deadline));
      server.closeIdleConnections();
    });
  return () => ready;
}

export function authorizeFrontendRequest(
  request: IncomingMessage,
  response: ServerResponse,
  listener: Listener,
  ready: boolean,
  allowedHost: (host: string) => boolean,
) {
  const host = wireAuthority(request);
  const fail = (status: number, message: string) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(message);
  };
  if (
    !host ||
    hasForwardingHeaders(request) ||
    (request.headersDistinct.origin?.length ?? 0) > 1
  )
    return fail(400, 'Invalid request authority');
  const healthPath = ['/health/live', '/health/ready'].includes(request.url!);
  if (
    (listener.ingressKey && host === 'healthcheck.railway.app') ||
    (!listener.ingressKey && healthPath && allowedHost(host))
  ) {
    if (!healthPath || !['GET', 'HEAD'].includes(request.method!))
      return fail(421, 'Host unavailable');
    const live = request.url === '/health/live';
    response.writeHead(live || ready ? 200 : 503, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    response.end(
      request.method === 'HEAD'
        ? undefined
        : JSON.stringify({
            status: live ? 'live' : ready ? 'ready' : 'unavailable',
          }),
    );
    return;
  }
  if (!allowedHost(host)) return fail(421, 'Host unavailable');
  if (listener.ingressKey) {
    const address = ingressClient(request, listener.ingressKey);
    if (!address) return fail(403, 'Ingress required');
    stripIngressHeaders(request);
    // Astro's standalone adapter reads these properties from the request socket.
    // Project verified metadata on this request only, leaving the actual socket
    // and all other requests on the connection untouched.
    const socket = request.socket;
    request.socket = new Proxy(socket, {
      has(target, property) {
        return property === 'encrypted' || Reflect.has(target, property);
      },
      get(target, property) {
        if (property === 'encrypted') return true;
        if (property === 'remoteAddress') return address;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }
  if (!ready) return fail(503, 'Temporarily unavailable');
  return host;
}
