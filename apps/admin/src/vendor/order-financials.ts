import type { FinanceApi, FinanceOrderTransaction, Portion } from '@market/api';
import type { OrderView } from './service';

/** Finance attribution is vendor-scoped and independent of CRM relationships.
 * Native fulfillment status is never treated as evidence of payment. */
export async function orderFinancials(
  finance: FinanceApi,
  portions: readonly Portion[],
): Promise<OrderView[]> {
  if (!portions.length) return [];
  const options = await finance.options();
  const months = new Set(
    portions
      .filter((p) => p.kind !== 'IN_PERSON' && p.placedAt)
      .map((p) => p.placedAt!.slice(0, 7)),
  );
  const records = new Map<string, FinanceOrderTransaction>();
  for (const month of months) {
    const [year, number] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year!, number! - 1, 0))
      .toISOString()
      .slice(0, 10);
    const through = new Date(Date.UTC(year!, number!, 1))
      .toISOString()
      .slice(0, 10);
    for (const currency of options.currencies.length
      ? options.currencies
      : [options.currency]) {
      const report = await finance.report({
        from,
        through,
        market: 'ALL',
        currency,
        timezone: options.timezone,
      });
      for (const record of report.orderTransactions ?? [])
        records.set(record.orderId, record);
    }
  }
  return portions.map((portion) => {
    const payment = records.get(portion.operationalOrderId);
    return {
      portion,
      context: payment
        ? {
            kind: portion.kind,
            marketId: portion.marketId,
            occurrenceId: portion.occurrenceId,
            currency: payment.currency,
            original: payment.payment,
            refunded: payment.refund,
            remaining: payment.remaining,
            financialStatus:
              payment.status === 'Refunded'
                ? 'REFUNDED'
                : payment.status === 'Partially refunded'
                  ? 'PARTIALLY_REFUNDED'
                  : 'PAID',
          }
        : null,
    };
  });
}
