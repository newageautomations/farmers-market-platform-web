import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { safeError, type InboxApi } from '@market/api';
import {
  accountBridge,
  isCentral,
  AccountBridgeError,
} from '../../lib/account';
import { requestInbox } from '../../lib/shop';
const bridgeActions = {
  list: 'notificationInbox',
  detail: 'notificationDetail',
  settings: 'notificationSettings',
  mutate: 'notificationUpdate',
  preference: 'notificationPreference',
} as const;
function api(context: Parameters<APIRoute>[0], headers: Headers): InboxApi {
  if (!isCentral(context.url)) return requestInbox(context, headers);
  const central = context.cookies.get('platform-unified-account')?.value ?? '';
  return Object.fromEntries(
    Object.entries(bridgeActions).map(([name, action]) => [
      name,
      (input?: unknown) =>
        accountBridge({
          action,
          central,
          ...(name === 'detail'
            ? { id: input }
            : name === 'settings'
              ? {}
              : { input: input ?? {} }),
        }),
    ]),
  ) as unknown as InboxApi;
}
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  try {
    if (context.request.headers.get('origin') !== context.url.origin)
      return new Response(null, { status: 403, headers });
    const body = JSON.parse(await boundedBody(context.request, 8192)) as {
      action: keyof typeof bridgeActions;
      input?: never;
      id?: string;
    };
    if (!Object.hasOwn(bridgeActions, body.action))
      return new Response(null, { status: 400, headers });
    const service = api(context, headers);
    const result =
      body.action === 'detail'
        ? await service.detail(body.id ?? '')
        : body.action === 'settings'
          ? await service.settings()
          : await service[body.action](body.input as never);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    if (
      error instanceof AccountBridgeError &&
      [400, 401, 403].includes(error.status)
    )
      return new Response(null, { status: error.status, headers });
    const kind = safeError(error).kind;
    return new Response(null, {
      status:
        kind === 'authentication' ? 401 : kind === 'forbidden' ? 403 : 503,
      headers,
    });
  }
};
/** Re-authorize the record, then select its business through the existing channel handoff. */
export const GET: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  try {
    const service = api(context, headers),
      n = await service.detail(context.url.searchParams.get('id') ?? '');
    if (
      !n.destination ||
      !/^\/(account|vendor|market)(\/|$)/.test(n.destination) ||
      n.destination.includes('\\')
    )
      return new Response(null, { status: 404, headers });
    let target = new URL(n.destination, context.url.origin);
    if (n.workspace_id) {
      const settings = await service.settings(),
        business = settings.affiliations.find(
          (a) =>
            a.id === n.workspace_id &&
            a.mode === (n.context === 'vendor' ? 'VENDOR' : 'MARKET_MANAGER'),
        );
      if (!business || !process.env.ADMIN_ORIGIN)
        return new Response(null, { status: 403, headers });
      target = new URL(n.destination, process.env.ADMIN_ORIGIN);
      target.searchParams.set('channel', business.channelId);
      target.searchParams.set('account', '1');
    }
    headers.set('Location', target.toString());
    return new Response(null, { status: 303, headers });
  } catch {
    return new Response(null, { status: 403, headers });
  }
};
