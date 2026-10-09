import { AppError } from '@market/api';
import type { Theme } from '@market/theme';
export type StorefrontKind = 'VENDOR' | 'MARKET'; // Backend uses mutually exclusive vendorId / marketId, not a GraphQL enum.
export type Template = 'community' | 'minimal' | 'modern';
export interface StorefrontContext {
  storefrontId?: string;
  storefrontKey?: string;
  subjectId?: string;
  name: string;
  kind: StorefrontKind;
  canonicalOrigin: string;
  theme: Theme;
  template: Template;
  source: 'fixture' | 'backend';
  channelToken?: string;
  timezone?: string;
}
export interface RequestContext {
  url: URL;
  authority?: string;
  fixtureMode: boolean;
  production: boolean;
}
export interface BackendStorefrontResolver {
  resolve(hostname: string): Promise<StorefrontContext | null>;
}
const templateKinds: Record<Template, readonly StorefrontKind[]> = {
  community: ['MARKET'],
  minimal: ['MARKET', 'VENDOR'],
  modern: ['VENDOR'],
};
export function composition(
  context: Pick<StorefrontContext, 'kind' | 'template'>,
) {
  if (!templateKinds[context.template].includes(context.kind))
    throw new AppError('validation');
  return context.kind === 'MARKET' ? 'market' : 'vendor';
}
export function seo(context: StorefrontContext, path = '/') {
  const origin = new URL(context.canonicalOrigin);
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password
  )
    throw new AppError('validation');
  const canonical = new URL(path, origin);
  if (canonical.origin !== origin.origin) throw new AppError('validation');
  return {
    title: context.name,
    description:
      context.source === 'fixture'
        ? `Development ${context.kind === 'MARKET' ? 'Market' : 'Vendor'} fixture for ${context.name}.`
        : `${context.name} storefront.`,
    canonical: canonical.href,
    robots: context.source === 'fixture' ? 'noindex,nofollow' : 'index,follow',
    favicon: context.theme.favicon,
  };
}
export async function resolveStorefront(
  request: RequestContext,
  backend: BackendStorefrontResolver,
  fixtureResolver?: (hostname: string) => StorefrontContext | null,
): Promise<StorefrontContext> {
  if (request.fixtureMode) {
    if (request.production) throw new AppError('forbidden');
    const local = request.url.hostname;
    if (
      ![
        'localhost',
        '127.0.0.1',
        'market.localhost',
        'vendor.localhost',
      ].includes(local)
    )
      throw new AppError('not-found');
    const fixture = fixtureResolver?.(local);
    if (!fixture) throw new AppError('not-found');
    return fixture;
  }
  // This never falls back to a fixture, including when the backend is unavailable.
  const context = await backend.resolve(request.authority ?? request.url.host);
  if (!context || context.source !== 'backend' || !context.channelToken?.trim())
    throw new AppError('not-found');
  composition(context);
  if (request.production && context.canonicalOrigin.startsWith('http:'))
    throw new AppError('unavailable');
  return context;
}
export const unavailableStorefrontResolver: BackendStorefrontResolver = {
  async resolve() {
    throw new AppError('unavailable');
  },
};
export * from './backend';
export * from './catalog';
export * from './market';
