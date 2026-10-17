import type { APIRoute } from 'astro';
import { AppError, safeError } from '@market/api';
import { boundedBody } from '@market/config';
import { requestApplicationDocuments } from '../../lib/shop';

export const POST: APIRoute = async (context) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    if (
      context.locals.storefront?.kind !== 'MARKET' ||
      context.request.headers.get('origin') !==
        context.locals.storefront.canonicalOrigin
    )
      throw new AppError('forbidden');
    const multipart = context.request.headers
      .get('content-type')
      ?.startsWith('multipart/form-data');
    let input: Record<string, unknown>, form: FormData | undefined;
    if (multipart) {
      // Bound bytes before multipart parsing, including requests without Content-Length.
      const reader = context.request.body?.getReader();
      if (!reader) throw new AppError('validation');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 11 * 1024 * 1024)
            throw new AppError('validation', 'DOCUMENT_TOO_LARGE');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      form = await new Response(new Blob(chunks as BlobPart[]), {
        headers: {
          'content-type': context.request.headers.get('content-type')!,
        },
      }).formData();
      input = JSON.parse(String(form.get('input')));
    } else {
      if (
        !context.request.headers
          .get('content-type')
          ?.startsWith('application/json')
      )
        throw new AppError('validation');
      input = JSON.parse(await boundedBody(context.request, 25000));
    }
    if (
      !input ||
      typeof input.slug !== 'string' ||
      !Number.isSafeInteger(input.vendorId) ||
      Number(input.vendorId) < 1
    )
      throw new AppError('validation');
    const api = requestApplicationDocuments(context, {
      slug: input.slug,
      vendorId: Number(input.vendorId),
    });
    let result: unknown;
    if (multipart) {
      const file = form!.get('file');
      if (
        !(file instanceof File) ||
        !input.metadata ||
        typeof input.metadata !== 'object'
      )
        throw new AppError('validation');
      result = await api.upload(
        file,
        input.metadata as Parameters<typeof api.upload>[1],
      );
    } else if (input.action === 'READ')
      result = await api.read(Number(input.skip ?? 0));
    else if (input.action === 'START' || input.action === 'SUBMIT')
      result = await api.command(
        input.action,
        (input.data ?? {}) as Record<string, unknown>,
        input.id as string | undefined,
        input.expectedRevision as number | undefined,
      );
    else throw new AppError('forbidden');
    return Response.json(result, { headers });
  } catch (error) {
    const safe = safeError(error);
    return Response.json(
      { error: safe.code ?? 'DOCUMENT_SERVICE_UNAVAILABLE' },
      { status: safe.kind === 'forbidden' ? 403 : 400, headers },
    );
  }
};
