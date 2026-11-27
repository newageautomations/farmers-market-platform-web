import type { APIContext } from 'astro';
import { AppError, type CheckoutView } from '@market/api';
import { requestCheckout, requestShop, requestMarketShop } from './shop';
import { openCheckoutData, sealCheckoutData } from './private-checkout-data';

type Draft = {
  orderId: string;
  occurrenceId: string;
  contact: CheckoutView['contact'];
  pickup: string[];
  lines: Array<{ variantId: string; quantity: number }>;
  coupons: readonly string[];
};
/** Rebuild only after the backend confirms cancellation, retaining an encrypted
 * recovery draft until every item is restored. Existing APIs retain all authority. */
export async function restartCheckout(
  context: APIContext,
  headers: Headers,
  orderId: string,
) {
  const checkout = requestCheckout(context, headers);
  const original = await checkout.status(orderId);
  const payment = await checkout.stripeStatus(orderId);
  if (
    !original ||
    original.committed ||
    !payment ||
    ![
      'CANCELED',
      'DECLINED',
      'AUTHORIZATION_FAILED',
      'CAPTURE_FAILED',
      'COMPENSATION_COMPLETED',
    ].includes(payment.state)
  )
    throw new AppError('conflict');
  const vendor =
    context.locals.storefront?.kind === 'VENDOR'
      ? requestShop(context, headers)
      : null;
  const market =
    context.locals.storefront?.kind === 'MARKET'
      ? requestMarketShop(context, headers)
      : null;
  const api = market ?? vendor;
  if (!api) throw new AppError('forbidden');
  let draft = openCheckoutData<Draft>(
    context.cookies.get('checkout-recovery')?.value,
    'cart-recovery',
  );
  if (draft?.orderId !== orderId) draft = undefined;
  if (!draft) {
    const cart = (await api.bootstrap()).cart;
    if (!cart || cart.id !== orderId || !original.occurrenceId)
      throw new AppError('conflict');
    const lines =
      'groups' in cart
        ? cart.groups.flatMap((g) =>
            g.lines.map((l) => ({
              variantId: l.variantId,
              quantity: l.quantity,
            })),
          )
        : cart.lines.map((l) => ({
            variantId: l.productVariant.id,
            quantity: l.quantity,
          }));
    draft = {
      orderId,
      occurrenceId: original.occurrenceId,
      contact: original.contact,
      pickup: original.groups.flatMap((g) =>
        g.pickup.map((p) =>
          p.methodId ? `method:${p.methodId}` : `${g.vendorId}:${p.name}`,
        ),
      ),
      lines,
      coupons: 'couponCodes' in cart ? cart.couponCodes : [],
    };
    const token = sealCheckoutData(draft, 'cart-recovery');
    if (token.length > 3500) throw new AppError('validation');
    context.cookies.set('checkout-recovery', token, {
      httpOnly: true,
      secure: context.url.protocol === 'https:',
      sameSite: 'strict',
      path: '/',
      maxAge: 1800,
    });
  }
  let current = (await api.bootstrap()).cart;
  if (current?.id === orderId) {
    const ids =
      'groups' in current
        ? current.groups.flatMap((g) => g.lines.map((l) => l.id))
        : current.lines.map((l) => l.id);
    for (const lineId of ids) await api.remove(lineId);
  }
  await api.select(draft.occurrenceId);
  current = (await api.bootstrap()).cart;
  const present = !current
    ? []
    : 'groups' in current
      ? current.groups.flatMap((g) =>
          g.lines.map((l) => ({
            id: l.id,
            variantId: l.variantId,
            quantity: l.quantity,
          })),
        )
      : current.lines.map((l) => ({
          id: l.id,
          variantId: l.productVariant.id,
          quantity: l.quantity,
        }));
  if (
    present.some((l) => !draft.lines.some((d) => d.variantId === l.variantId))
  )
    throw new AppError('conflict');
  for (const line of draft.lines) {
    const existing = present.find((l) => l.variantId === line.variantId);
    if (existing) {
      if (existing.quantity !== line.quantity)
        await api.adjust(existing.id, line.quantity);
    } else if (market)
      await market.add(draft.occurrenceId, line.variantId, line.quantity);
    else await vendor!.add(line.variantId, line.quantity, draft.occurrenceId);
  }
  if (market) for (const code of draft.coupons) await market.applyCoupon(code);
  if (draft.contact)
    await checkout.contact({
      ...draft.contact,
      phoneNumber: draft.contact.phoneNumber ?? undefined,
    });
  const options = await checkout.pickup();
  const selected = original.groups.map(({ vendorId }) =>
    options.filter(
      (o) =>
        o.vendorId === vendorId &&
        (draft.pickup.includes(`method:${o.methodId}`) ||
          draft.pickup.includes(`${o.vendorId}:${o.name}`)),
    ),
  );
  if (selected.length && selected.every((group) => group.length === 1))
    await checkout.selectPickup(
      selected.flatMap((group) => group.map((o) => o.methodId)),
    );
  context.cookies.delete('checkout-recovery', { path: '/' });
  return checkout.status();
}
