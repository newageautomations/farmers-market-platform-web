import { describe, expect, it } from 'vitest';
import {
  chronologicalExpenseHistory,
  expenseHistoryEntry,
} from '../apps/admin/src/finance/expense-history';

const entry = (action: string, before: unknown, after: unknown) => ({
  id: 'private-event',
  action,
  created_at: '2026-10-21T12:00:00Z',
  before_value: before,
  after_value: after,
});
describe('expense activity presentation', () => {
  it('shows creation and signed reductions/increases from saved audit balances, including native bigint strings', () => {
    const initial = {
      amount: '10000',
      currency: 'USD',
      category: 'Equipment',
      voided: false,
    };
    expect(
      expenseHistoryEntry(entry('CREATE', null, initial), 'USD'),
    ).toMatchObject({ action: 'Created', change: 10000 });
    expect(
      expenseHistoryEntry(
        entry('EDIT', initial, { ...initial, amount: '8000' }),
        'USD',
      ),
    ).toMatchObject({ action: 'Reduced', change: -2000 });
    expect(
      expenseHistoryEntry(
        entry(
          'EDIT',
          { ...initial, amount: 8000 },
          { ...initial, amount: 12000 },
        ),
        'USD',
      ),
    ).toMatchObject({ action: 'Increased', change: 4000 });
  });
  it('voids the previous amount rather than displaying the unchanged stored total', () => {
    expect(
      expenseHistoryEntry(
        entry(
          'VOID',
          { amount: '3000', currency: 'USD', voided: false },
          { amount: '3000', currency: 'USD', voided: true },
        ),
        'USD',
      ),
    ).toMatchObject({ action: 'Voided', change: -3000 });
  });
  it('keeps one event when amount and category change together and labels nonfinancial edits', () => {
    const before = { amount: 10000, currency: 'USD', category: 'Packaging' };
    expect(
      expenseHistoryEntry(
        entry('EDIT', before, {
          ...before,
          amount: 8000,
          category: 'Equipment',
        }),
        'USD',
      ),
    ).toEqual({ action: 'Reduced', change: -2000, category: 'Equipment' });
    expect(
      expenseHistoryEntry(
        entry('EDIT', before, { ...before, category: 'Equipment' }),
        'USD',
      ),
    ).toEqual({
      action: 'Changed category',
      change: null,
      category: 'Equipment',
    });
    expect(
      expenseHistoryEntry(
        entry('EDIT', before, { ...before, description: 'Changed' }),
        'USD',
      ).action,
    ).toBe('Updated details');
  });
  it('does not invent a change when snapshots or currency evidence are insufficient', () => {
    for (const before of [
      null,
      { amount: 'not money' },
      { amount: NaN },
      { amount: 100, currency: 'EUR' },
    ])
      expect(
        expenseHistoryEntry(
          entry('EDIT', before, { amount: 80, currency: 'USD' }),
          'USD',
        ).change,
      ).toBeNull();
    expect(
      expenseHistoryEntry(entry('VOID', null, { voided: true }), 'USD').change,
    ).toBeNull();
  });
  it('sorts chronologically and breaks same-time ties without mutating authoritative records', () => {
    const values = [
      {
        ...entry('EDIT', null, null),
        id: '11',
        created_at: '2026-10-22T12:00:00Z',
      },
      { ...entry('EDIT', null, null), id: '10' },
      { ...entry('CREATE', null, null), id: '2' },
    ];
    const saved = structuredClone(values);
    expect(chronologicalExpenseHistory(values).map((e) => e.id)).toEqual([
      '2',
      '10',
      '11',
    ]);
    expect(values).toEqual(saved);
  });
});
