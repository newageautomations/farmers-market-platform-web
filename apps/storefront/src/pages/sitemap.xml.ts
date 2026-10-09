import type { APIRoute } from 'astro';
import { seo } from '@market/storefront-core';
export const GET: APIRoute = ({ locals }) => {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const home =
    locals.storefront?.source === 'backend'
      ? `<url><loc>${escape(seo(locals.storefront).canonical)}</loc></url>`
      : '';
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${home}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
