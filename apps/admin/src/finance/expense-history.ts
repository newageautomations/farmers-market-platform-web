import type { ExpenseDetails } from '@market/api';

function snapshot(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function amount(value: unknown): number | null {
  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && /^\d+$/.test(value))
  )
    return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 100000000000 ? n : null;
}

/** Presentation only: never infer a missing balance from a neighboring audit event. */
export function expenseHistoryEntry(
  event: ExpenseDetails['history'][number],
  currency: string,
) {
  const before = snapshot(event.before_value),
    after = snapshot(event.after_value);
  const sameCurrency =
    (!before.currency || before.currency === currency) &&
    (!after.currency || after.currency === currency);
  const beforeAmount = amount(before.amount),
    afterAmount = amount(after.amount);
  const reliable =
    sameCurrency && beforeAmount !== null && afterAmount !== null;
  let action = 'Updated details',
    change: number | null = null;
  if (event.action === 'CREATE') {
    action = 'Created';
    if (sameCurrency && afterAmount !== null) change = afterAmount;
  } else if (event.action === 'VOID') {
    action = 'Voided';
    if (
      sameCurrency &&
      beforeAmount !== null &&
      before.voided !== true &&
      after.voided === true
    )
      change = -beforeAmount;
  } else if (
    event.action === 'EDIT' &&
    reliable &&
    before.voided !== true &&
    after.voided !== true
  ) {
    const difference = afterAmount! - beforeAmount!;
    if (difference !== 0) {
      action = difference > 0 ? 'Increased' : 'Reduced';
      change = difference;
    }
  }
  const category =
    event.action === 'EDIT' &&
    typeof before.category === 'string' &&
    typeof after.category === 'string' &&
    before.category !== after.category
      ? after.category
      : null;
  if (category && change === null) action = 'Changed category';
  return { action, change, category };
}

export function chronologicalExpenseHistory(
  history: ExpenseDetails['history'],
) {
  return [...history].sort((a, b) => {
    const at = Date.parse(a.created_at),
      bt = Date.parse(b.created_at);
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}
