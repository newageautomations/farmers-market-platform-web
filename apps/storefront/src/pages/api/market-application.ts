import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { AppError, safeError } from '@market/api';
import { requestPublicMarketOperations } from '../../lib/shop';
export const POST: APIRoute = async (context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
  };
  try {
    if (
      context.locals.storefront?.kind !== 'MARKET' ||
      context.request.headers.get('origin') !==
        context.locals.storefront.canonicalOrigin
    )
      throw new AppError('forbidden');
    if (
      !context.request.headers
        .get('content-type')
        ?.startsWith('application/json')
    )
      throw new AppError('validation');
    const body = await boundedBody(context.request, 60000),
      input = JSON.parse(body) as Record<string, unknown>;
    if (
      Object.keys(input).some(
        (k) =>
          ![
            'slug',
            'versionId',
            'answers',
            'occurrenceIds',
            'rentals',
            'idempotencyKey',
            'accountAnswer',
            'vendorId',
          ].includes(k),
      )
    )
      throw new AppError('validation');
    if (
      typeof input.slug !== 'string' ||
      !['YES', 'NO'].includes(String(input.accountAnswer)) ||
      (input.vendorId !== undefined &&
        input.vendorId !== null &&
        (!Number.isSafeInteger(input.vendorId) ||
          Number(input.vendorId) <= 0)) ||
      typeof input.versionId !== 'number' ||
      typeof input.idempotencyKey !== 'string' ||
      !input.answers ||
      typeof input.answers !== 'object' ||
      Array.isArray(input.answers) ||
      !Array.isArray(input.occurrenceIds) ||
      !Array.isArray(input.rentals)
    )
      throw new AppError('validation');
    const result = await requestPublicMarketOperations(context).submit(
      input as unknown as Parameters<
        ReturnType<typeof requestPublicMarketOperations>['submit']
      >[0],
    );
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          safeError(error).code === 'APPLICATION_DOCUMENTS_REQUIRED'
            ? 'APPLICATION_DOCUMENTS_REQUIRED'
            : 'APPLICATION_SUBMISSION_UNAVAILABLE',
      }),
      { status: 400, headers },
    );
  }
};
