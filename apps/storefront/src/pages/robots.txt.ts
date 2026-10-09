import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ locals }) =>
  new Response(
    locals.storefront?.source === 'backend'
      ? 'User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /auth\nDisallow: /api/\n'
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain' } },
  );
