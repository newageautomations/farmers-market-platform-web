import type { APIRoute } from 'astro';
import { blocksIndexing, restrictiveRobots } from '@market/config';
export const GET: APIRoute = ({ locals }) =>
  new Response(
    !blocksIndexing(locals.deployment) &&
      locals.storefront?.source === 'backend'
      ? 'User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /auth\nDisallow: /api/\n'
      : restrictiveRobots,
    { headers: { 'Content-Type': 'text/plain' } },
  );
