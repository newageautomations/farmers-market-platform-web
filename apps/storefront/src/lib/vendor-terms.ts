import type { APIContext } from 'astro';
import { backendFetch } from './private-api';

export async function vendorTermsRevision(
  locals: APIContext['locals'],
  version: string,
) {
  if (!locals.shopApiUrl || !/^[a-f0-9]{64}$/.test(version)) return null;
  const response = await backendFetch(
    new URL(`/storefront-context/vendor-terms/${version}`, locals.shopApiUrl),
    { cache: 'no-store', signal: AbortSignal.timeout(8000) },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Terms revision unavailable');
  const revision: unknown = await response.json();
  if (
    !revision ||
    typeof revision !== 'object' ||
    !('version' in revision) ||
    revision.version !== version ||
    !('vendorId' in revision) ||
    typeof revision.vendorId !== 'string' ||
    !('name' in revision) ||
    typeof revision.name !== 'string' ||
    !('body' in revision) ||
    typeof revision.body !== 'string' ||
    !revision.body.trim()
  )
    throw new Error('Terms revision unavailable');
  return {
    vendorId: revision.vendorId,
    name: revision.name,
    body: revision.body,
  };
}
