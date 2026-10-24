import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { safeError, type ContactSubmissionInput } from '@market/api';
import { requestContact } from '../../lib/shop';
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
  });
  const storefront = context.locals.storefront;
  if (
    context.locals.editorPreview ||
    storefront?.kind !== 'VENDOR' ||
    !storefront.appearance?.contact?.enabled ||
    context.request.headers.get('origin') !== storefront.canonicalOrigin
  )
    return new Response(null, { status: 403, headers });
  if (
    !context.request.headers.get('content-type')?.startsWith('application/json')
  )
    return new Response(null, { status: 400, headers });
  let input: ContactSubmissionInput;
  try {
    input = JSON.parse(await boundedBody(context.request, 32768));
  } catch {
    return new Response(null, { status: 400, headers });
  }
  try {
    const result = await requestContact(context, headers).submit(input);
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    const kind = safeError(error).kind;
    return new Response(null, {
      status: kind === 'validation' ? 400 : kind === 'forbidden' ? 403 : 503,
      headers,
    });
  }
};
