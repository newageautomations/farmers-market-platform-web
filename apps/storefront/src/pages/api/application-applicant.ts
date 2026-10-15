import type { APIRoute } from 'astro';
import { requestPublicMarketOperations } from '../../lib/shop';
export const GET: APIRoute = async (context) => {
  try {
    return Response.json(
      await requestPublicMarketOperations(context).applicant(),
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return Response.json(
      { authenticated: false },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
};
