import type { APIRoute } from 'astro';
import { authorizeEditorRender } from '../../lib/editor-preview-server';
export const POST: APIRoute = async (context) => {
  try {
    context.locals.editorPreview = await authorizeEditorRender(context);
    return context.rewrite(
      new Request(new URL(context.locals.editorPreview.path, context.url), {
        method: 'GET',
        // Request(URL) does not populate Host. Tenant resolution must keep the
        // authority already validated by the original request and preview grant.
        headers: { host: context.url.host },
      }),
    );
  } catch {
    return new Response(
      'Preview unavailable. Return to the editor and reconnect the preview.',
      {
        status: 403,
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  }
};
