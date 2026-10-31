import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { safeError, applicationErrorMessage } from '@market/api';
import { applicantApplicationsApi } from '../../lib/applicant-applications';
export const POST: APIRoute = async (context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
  };
  try {
    if (
      context.request.headers.get('origin') !== context.url.origin ||
      !context.request.headers
        .get('content-type')
        ?.startsWith('application/json')
    )
      throw new Error();
    const body = JSON.parse(await boundedBody(context.request, 62000));
    const api = applicantApplicationsApi(context);
    let result;
    if (body.action === 'READ') result = await api.read(body.input ?? {});
    else {
      if (
        ![
          'SAVE_DRAFT',
          'SUBMIT_DRAFT',
          'DISCARD_DRAFT',
          'WITHDRAW',
          'SAVE_INFORMATION_RESPONSE',
          'SUBMIT_INFORMATION_RESPONSE',
          'CLAIM',
        ].includes(body.action)
      )
        throw new Error();
      let input = body.input;
      if (body.action === 'CLAIM') {
        if (!Number.isSafeInteger(input?.id) || input.id <= 0)
          throw new Error();
        input = {
          id: input.id,
          vendorId: input.vendorId,
          secret:
            context.cookies.get(`application-claim-${input.id}`)?.value ?? '',
        };
      }
      result = await api.command(body.action, input);
      if (body.action === 'CLAIM')
        context.cookies.delete(`application-claim-${input.id}`, { path: '/' });
    }
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          applicationErrorMessage(safeError(error)) ??
          'This application is unavailable or the action could not be completed. Reload to check its status. A changed form may require a new application.',
      }),
      { status: 400, headers },
    );
  }
};
