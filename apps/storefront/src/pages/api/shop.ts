import type { APIRoute } from 'astro';
import { AppError, safeError } from '@market/api';
import { boundedBody } from '@market/config';
import {
  requestShop,
  requestMarketShop,
  requestCheckout,
  requestPreferences,
} from '../../lib/shop';

export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
  });
  try {
    if (!context.locals.storefront)
      throw context.locals.storefrontError ?? new AppError('unavailable');
    const storefront = context.locals.storefront;
    if (context.request.headers.get('origin') !== storefront.canonicalOrigin)
      throw new AppError('forbidden');
    if (
      !context.request.headers
        .get('content-type')
        ?.startsWith('application/json')
    )
      throw new AppError('validation');
    const text = await boundedBody(context.request);
    if (text.length > 4096) throw new AppError('validation');
    const input: Record<string, unknown> = JSON.parse(text);
    if (input.storefrontId !== storefront.storefrontId)
      throw new AppError('conflict');
    const api =
      storefront.kind === 'MARKET'
        ? requestMarketShop(context, headers)
        : requestShop(context, headers);
    const id = (value: unknown) => {
      if (typeof value !== 'string' || !/^[0-9]+$/.test(value))
        throw new AppError('validation');
      return value;
    };
    const quantity = () => {
      if (
        !Number.isSafeInteger(input.quantity) ||
        Number(input.quantity) < 1 ||
        Number(input.quantity) > 2147483647
      )
        throw new AppError('validation');
      return Number(input.quantity);
    };
    let result: unknown;
    const checkout = requestCheckout(context, headers);
    switch (input.action) {
      case 'communication-settings':
      case 'communication-change': {
        if (
          ['vendorId', 'marketId', 'customerId', 'subjectId'].some(
            (key) => key in input,
          )
        )
          throw new AppError('forbidden');
        const preferences = requestPreferences(context, headers);
        if (input.action === 'communication-settings')
          result = await preferences.read();
        else {
          if (
            !['EMAIL', 'SMS'].includes(String(input.medium)) ||
            ![
              'PREORDER_WINDOW_OPEN',
              'RESTOCK',
              'VENDOR_ANNOUNCEMENT',
              'MARKET_ANNOUNCEMENT',
            ].includes(String(input.purpose)) ||
            typeof input.subscribed !== 'boolean' ||
            typeof input.noticeVersion !== 'string' ||
            input.noticeVersion.length > 80
          )
            throw new AppError('validation');
          result = await preferences.change({
            medium: input.medium as 'EMAIL' | 'SMS',
            purpose: input.purpose as
              | 'PREORDER_WINDOW_OPEN'
              | 'RESTOCK'
              | 'VENDOR_ANNOUNCEMENT'
              | 'MARKET_ANNOUNCEMENT',
            subscribed: input.subscribed,
            noticeVersion: input.noticeVersion,
          });
        }
        break;
      }
      case 'checkout-status':
        result = await checkout.status(
          input.orderId ? id(input.orderId) : undefined,
        );
        break;
      case 'checkout-contact': {
        const fields = [
          'firstName',
          'lastName',
          'emailAddress',
          'phoneNumber',
        ] as const;
        if (
          fields.some(
            (k) => k !== 'phoneNumber' && typeof input[k] !== 'string',
          )
        )
          throw new AppError('validation');
        result = await checkout.contact({
          firstName: String(input.firstName),
          lastName: String(input.lastName),
          emailAddress: String(input.emailAddress),
          phoneNumber:
            typeof input.phoneNumber === 'string'
              ? input.phoneNumber
              : undefined,
        });
        break;
      }
      case 'checkout-pickup':
        result = await checkout.pickup();
        break;
      case 'checkout-select-pickup':
        if (!Array.isArray(input.methodIds) || input.methodIds.length > 50)
          throw new AppError('validation');
        result = await checkout.selectPickup(input.methodIds.map(id));
        break;
      case 'checkout-begin': {
        const current = await checkout.status();
        if (!current || current.availability.state !== 'AVAILABLE')
          throw new AppError('unavailable');
        result =
          current.attempt ?? (await checkout.begin(current.availability.mode));
        break;
      }
      case 'checkout-finalize':
      case 'checkout-release': {
        const current = await checkout.status();
        if (
          !current?.attempt ||
          current.attempt.attemptId !== id(input.attemptId)
        )
          throw new AppError('conflict');
        result =
          input.action === 'checkout-finalize'
            ? await checkout.finalize(
                current.availability.mode,
                current.attempt.attemptId,
              )
            : await checkout.release(
                current.availability.mode,
                current.attempt.attemptId,
              );
        break;
      }
      case 'purchase-account-link':
        result = await checkout.purchaseLink(
          id(input.orderId),
          storefront.canonicalOrigin,
        );
        break;
      case 'logout':
        result = await checkout.logout();
        break;
      case 'cart':
      case 'session':
        result = await api.bootstrap();
        break;
      case 'login':
        if (
          typeof input.username !== 'string' ||
          typeof input.password !== 'string' ||
          input.username.length > 320 ||
          input.password.length > 1024
        )
          throw new AppError('validation');
        result = await api.login(input.username, input.password);
        break;
      case 'add':
        result = {
          cart:
            storefront.kind === 'MARKET'
              ? await requestMarketShop(context, headers).add(
                  id(input.occurrenceId),
                  id(input.variantId),
                  quantity(),
                )
              : await requestShop(context, headers).add(
                  id(input.variantId),
                  quantity(),
                ),
        };
        break;
      case 'select-occurrence':
        result = {
          cart: await requestMarketShop(context, headers).select(
            id(input.occurrenceId),
          ),
        };
        break;
      case 'apply-coupon':
      case 'remove-coupon': {
        if (
          typeof input.code !== 'string' ||
          !/^[A-Za-z0-9_-]{1,80}$/.test(input.code.trim())
        )
          throw new AppError('validation');
        const marketApi = requestMarketShop(context, headers);
        result = {
          cart:
            input.action === 'apply-coupon'
              ? await marketApi.applyCoupon(input.code.trim())
              : await marketApi.removeCoupon(input.code.trim()),
        };
        break;
      }
      case 'adjust':
        result = { cart: await api.adjust(id(input.lineId), quantity()) };
        break;
      case 'remove':
        result = { cart: await api.remove(id(input.lineId)) };
        break;
      default:
        throw new AppError('validation');
    }
    return new Response(JSON.stringify({ result }), { headers });
  } catch (error) {
    const safe =
      error instanceof SyntaxError
        ? new AppError('validation')
        : safeError(error);
    const status =
      safe.kind === 'not-found'
        ? 404
        : safe.kind === 'unavailable' || safe.kind === 'network'
          ? 503
          : safe.kind === 'forbidden' || safe.kind === 'authentication'
            ? 403
            : 400;
    return new Response(
      JSON.stringify({ error: { kind: safe.kind, code: safe.code } }),
      { status, headers },
    );
  }
};
