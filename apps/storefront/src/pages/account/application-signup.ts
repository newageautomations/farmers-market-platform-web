import type { APIRoute } from 'astro';
export const GET: APIRoute = async (context) => {
  const id = context.url.searchParams.get('application');
  if (
    !id ||
    !/^[1-9]\d*$/.test(id) ||
    !context.cookies.has(`application-claim-${id}`)
  )
    return new Response(
      'Return to the market invitation to track your application.',
      { status: 410 },
    );
  return context.redirect(`/vendor/application-continue?claim=${id}`);
};
