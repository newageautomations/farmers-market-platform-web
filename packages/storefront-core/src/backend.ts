import { AppError } from '@market/api';
import { platformTheme, vendorTheme } from '@market/theme';
import type { BackendStorefrontResolver, StorefrontContext } from './index';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

// Node fetch discards an explicit Host header. Native HTTP preserves the direct
// incoming authority while connecting only to the configured backend endpoint.
const resolverFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input)),
    headers = Object.fromEntries(new Headers(init?.headers));
  return new Promise<Response>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        headers,
        // Merchant Host is routing input, never the TLS peer's identity.
        ...(url.protocol === 'https:' ? { servername: url.hostname } : {}),
        signal: init?.signal ?? undefined,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 65536)
            request.destroy(new Error('Resolver response exceeds limit'));
          else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () =>
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
            }),
          ),
        );
      },
    );
    request.on('error', reject);
    request.end();
  });
};

export function publicStorefrontResolver(
  shopEndpoint: string,
  requestFetch: typeof fetch = resolverFetch,
): BackendStorefrontResolver {
  const endpoint = new URL('/storefront-context/resolve', shopEndpoint);
  return {
    async resolve(authority) {
      let response: Response;
      try {
        response = await requestFetch(endpoint, {
          headers: { Host: authority },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        throw new AppError('unavailable');
      }
      if (response.status === 404 || response.status === 400) return null;
      if (!response.ok) throw new AppError('unavailable');
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new AppError('unavailable');
      }
      if (!data || typeof data !== 'object') throw new AppError('unavailable');
      const dto = data as Record<string, unknown>,
        subject = dto.subject as Record<string, unknown> | undefined,
        shop = dto.shopContext as Record<string, unknown> | undefined;
      if (
        !['VENDOR', 'MARKET'].includes(String(dto.kind)) ||
        ![
          dto.storefrontId,
          dto.storefrontKey,
          dto.displayName,
          dto.canonicalHostname,
          dto.canonicalOrigin,
          subject?.id,
          shop?.channelToken,
        ].every((v) => typeof v === 'string' && !!v)
      )
        throw new AppError('unavailable');
      const origin = new URL(String(dto.canonicalOrigin));
      if (
        !['http:', 'https:'].includes(origin.protocol) ||
        origin.hostname !== dto.canonicalHostname ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash
      )
        throw new AppError('unavailable');
      const context: StorefrontContext = {
        storefrontId: String(dto.storefrontId),
        storefrontKey: String(dto.storefrontKey),
        subjectId: String(subject!.id),
        name: String(dto.displayName),
        kind: dto.kind as StorefrontContext['kind'],
        canonicalOrigin: origin.origin,
        source: 'backend',
        channelToken: String(shop!.channelToken),
        template: dto.kind === 'VENDOR' ? 'modern' : 'community',
        theme: { ...(dto.kind === 'VENDOR' ? vendorTheme : platformTheme) },
      };
      return context;
    },
  };
}
