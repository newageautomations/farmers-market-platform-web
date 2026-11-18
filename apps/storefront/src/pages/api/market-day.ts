import type { APIRoute } from 'astro';
import { safeError } from '@market/api';
import { requestMarketDay } from '../../lib/shop';

export const GET: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json',
    Vary: 'Cookie',
    'X-Robots-Tag': 'noindex',
  });
  try {
    if (context.locals.editorPreview)
      return new Response('{}', { status: 403, headers });
    const api = requestMarketDay(context, headers);
    const personal = context.url.searchParams.get('occurrence');
    const data = personal
      ? await api.personal(Number(personal))
      : await api.state();
    return new Response(JSON.stringify(data), { headers });
  } catch (error) {
    const kind = safeError(error).kind;
    return new Response(
      JSON.stringify({ error: 'Market Day data unavailable' }),
      {
        status: ['authentication', 'forbidden'].includes(kind) ? 401 : 503,
        headers,
      },
    );
  }
};
