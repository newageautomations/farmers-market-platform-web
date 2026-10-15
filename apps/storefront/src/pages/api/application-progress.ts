import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { AppError } from '@market/api';
import { requestPublicMarketOperations } from '../../lib/shop';
import {
  restoreProgress,
  saveProgressBinding,
  retainSealedProgress,
  readSealedProgress,
  clearRetainedProgress,
} from '../../lib/application-progress';
export const POST: APIRoute = async (context) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    if (
      context.locals.storefront?.kind !== 'MARKET' ||
      context.request.headers.get('origin') !== context.url.origin ||
      !context.request.headers
        .get('content-type')
        ?.startsWith('application/json')
    )
      throw new Error('Denied');
    const body = JSON.parse(
      await boundedBody(context.request, 100000),
    ) as Record<string, unknown>;
    const api = requestPublicMarketOperations(context);
    let principalId: string | null = null;
    try {
      principalId = (await api.applicant()).principalId;
    } catch (error) {
      if (
        !(error instanceof AppError) ||
        !['authentication', 'forbidden'].includes(error.kind)
      )
        throw error;
    }
    if (body.action === 'restore') {
      if (!principalId) throw new Error('Denied');
      const sealed = readSealedProgress(context);
      if (!sealed) return new Response(null, { status: 204, headers });
      try {
        const result = restoreProgress(context, sealed, principalId);
        if (result.path !== body.path) throw new Error('Different destination');
        return Response.json(result, { headers });
      } finally {
        clearRetainedProgress(context);
      }
    }
    if (
      body.action !== 'save' ||
      typeof body.path !== 'string' ||
      !body.progress ||
      typeof body.progress !== 'object' ||
      JSON.stringify(body.progress).length > 60000
    )
      throw new Error('Denied');
    const binding = saveProgressBinding(context, body.path, principalId);
    retainSealedProgress(context, { binding, progress: body.progress });
    return Response.json({ saved: true }, { headers });
  } catch {
    return Response.json(
      { error: 'APPLICATION_PROGRESS_UNAVAILABLE' },
      { status: 400, headers },
    );
  }
};
