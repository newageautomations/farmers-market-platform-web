import { describe, expect, it } from 'vitest';
import type {
  ComplianceData,
  FinanceReport,
  VendorBoothAssignment,
} from '@market/api';
import {
  attendanceUrgencies,
  boothFeeUrgencies,
  customerActivity,
  documentUrgencies,
  periodChange,
  readPeriodCustomers,
  salesByChannel,
  salesByMarket,
  sortUrgent,
  weekTasks,
} from '../apps/admin/src/vendor/dashboard-data';
import {
  dashboardWidgets,
  normalizeLayout,
} from '../apps/admin/src/vendor/dashboard-layout';
import type { UpcomingMarketDate } from '../apps/admin/src/vendor/markets-data';
import {
  compact,
  freeCell,
  cornerResize,
  moveItem,
  resizeItem,
  resizeTo,
} from '../apps/admin/src/vendor/dashboard-grid';

const now = Date.parse('2026-11-06T18:00:00Z');
const sale = (
  gross: number,
  channel: string | undefined,
  marketId: string | null,
) => ({ kind: 'SALE', gross, channel, marketId, orderId: String(gross) });
const report = {
  transactions: [
    sale(1000, 'IN_PERSON', '1'),
    sale(500, 'MARKET_OCCURRENCE', '2'),
    sale(250, 'DIRECT_VENDOR', null),
    sale(100, undefined, 'UNATTRIBUTED'),
    { kind: 'REFUND', gross: 0, channel: 'IN_PERSON', marketId: '1' },
  ],
} as unknown as FinanceReport;
function date(
  id: string,
  startsAt: string,
  status?: string,
): UpcomingMarketDate {
  return {
    key: `m:${id}`,
    membership: { id: 'm', market: { name: 'Riverside' } },
    occurrence: { id, startsAt, timezone: 'UTC' },
    participation: status ? { status } : undefined,
  } as unknown as UpcomingMarketDate;
}

describe('vendor dashboard data', () => {
  it('compares periods without inventing a baseline', () => {
    expect(periodChange(120, 100, '30')).toEqual({
      text: '↑ 20% vs previous 30 days',
      tone: 'positive',
    });
    expect(periodChange(50, 100, '7').tone).toBe('negative');
    expect(periodChange(10, 0, '30').text).toBe('No prior-period baseline');
    expect(periodChange(0, 0, '30').tone).toBe('neutral');
  });

  it('splits gross sales by channel and attributed market', () => {
    expect(salesByChannel(report)).toEqual([
      { id: 'IN_PERSON', name: 'In person', value: 1000 },
      { id: 'MARKET_OCCURRENCE', name: 'Market preorders', value: 500 },
      { id: 'DIRECT_VENDOR', name: 'Online orders', value: 250 },
      { id: 'OTHER', name: 'Other', value: 100 },
    ]);
    expect(
      salesByMarket(report, (id) => (id === '1' ? 'Riverside' : undefined)),
    ).toEqual([
      { id: '1', name: 'Riverside', value: 1000 },
      { id: '2', name: 'Market 2', value: 500 },
      { id: 'INDEPENDENT', name: 'Independent sales', value: 350 },
    ]);
  });

  it('counts new and repeat customers', () => {
    const customers = [
      { purchaseCount: 3, firstActivityAt: '2026-10-20T10:00:00Z' },
      { purchaseCount: 1, firstActivityAt: '2026-09-20T10:00:00Z' },
      { purchaseCount: 0, firstActivityAt: '2026-08-01T10:00:00Z' },
    ] as never;
    expect(customerActivity(customers, '2026-10-08', '2026-09-08')).toEqual({
      total: 3,
      newCustomers: 1,
      previousNew: 1,
      repeat: 1,
      oneTime: 1,
    });
  });

  it('raises expired and expiring documents and missing requests', () => {
    const items = documentUrgencies(
      {
        documents: [
          {
            id: 'a',
            expiration: 'Expired',
            metadata: { title: 'Insurance', expiresOn: '2026-10-25' },
          },
          {
            id: 'b',
            expiration: 'Expiring Soon',
            metadata: { title: 'Permit', expiresOn: '2026-11-18' },
          },
          { id: 'c', expiration: 'Current', metadata: { title: 'Ok' } },
        ],
        requests: [
          {
            id: 'r',
            required: true,
            waived: false,
            status: 'Missing',
            title: 'Food Handler Certificate',
            market_name: 'Boerne',
            market_id: 2,
            due_on: '2026-11-13',
          },
          { id: 'w', required: true, waived: true, status: 'Missing' },
          { id: 'p', required: true, waived: false, status: 'Approved' },
        ],
      } as unknown as ComplianceData,
      now,
    );
    expect(items.map((i) => [i.title, i.tone])).toEqual([
      ['Insurance expired', 'danger'],
      ['Permit expiring soon', 'warning'],
      ['Boerne needs Food Handler Certificate', 'warning'],
    ]);
    expect(items[1]!.detail).toBe('Expires in 12 days (Nov 18, 2026).');
    expect(items[2]!.href).toBe('/vendor/documents?view=requests&market=2');
  });

  it('asks for attendance only on near dates without a response', () => {
    const items = attendanceUrgencies(
      [
        date('1', '2026-11-07T15:00:00Z', 'confirmed'),
        date('2', '2026-11-14T15:00:00Z'),
        date('3', '2026-12-14T15:00:00Z'),
      ],
      now,
    );
    expect(items.map((i) => i.href)).toEqual(['/vendor/markets/m/dates/2']);
  });

  it('lists open booth balances and skips paid invoices', () => {
    const assignments = new Map([
      [
        '1',
        {
          startsAt: '2026-11-07T15:00:00Z',
          space: { label: 'A01' },
          invoices: [
            {
              id: 1,
              status: 'OPEN',
              currency: 'USD',
              totalMinor: 4500,
              paidMinor: 0,
            },
            {
              id: 2,
              status: 'PAID',
              currency: 'USD',
              totalMinor: 4500,
              paidMinor: 4500,
            },
          ],
        },
      ],
    ]) as unknown as Map<string, VendorBoothAssignment>;
    const items = boothFeeUrgencies(assignments, [
      date('1', '2026-11-07T15:00:00Z', 'confirmed'),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]!.detail).toMatch(/^\$45\.00 due for Riverside/);
    expect(
      sortUrgent([...items, { ...items[0]!, id: 'x', tone: 'danger' }])[0]!.id,
    ).toBe('x');
  });

  it('derives this week from records, open work first', () => {
    const tasks = weekTasks({
      dates: [
        date('1', '2026-11-07T15:00:00Z', 'confirmed'),
        date('2', '2026-11-10T15:00:00Z'),
        date('3', '2026-11-20T15:00:00Z'),
      ],
      packing: new Map([
        [
          '1',
          {
            customers: [{}, {}],
            summary: { customersRemaining: 1 },
          },
        ],
      ]) as never,
      urgent: [],
      now,
    });
    expect(tasks.map((t) => [t.id, t.done])).toEqual([
      ['pack:m:1', false],
      ['attend:m:2', false],
      ['attend:m:1', true],
    ]);
  });
});

describe('top customers', () => {
  it('ranks customers by net spending inside the period only', async () => {
    const purchase = (
      id: string,
      purchasedAt: string,
      original: number,
      refunded = 0,
    ) => ({
      operationalOrderId: id,
      purchasedAt,
      original,
      refunded,
      currency: 'USD',
    });
    const histories: Record<string, unknown[]> = {
      a: [
        purchase('1', '2026-11-01T18:00:00Z', 2000, 500),
        purchase('2', '2026-09-01T18:00:00Z', 9000),
      ],
      b: [purchase('3', '2026-11-02T18:00:00Z', 1800)],
    };
    const service = {
      history: async (customerId: string) => ({
        items: histories[customerId] ?? [],
        totalItems: (histories[customerId] ?? []).length,
      }),
    } as never;
    const customer = (id: string, lastActivityAt: string) => ({
      id: 'rel-' + id,
      customerId: id,
      firstName: id.toUpperCase(),
      lastName: '',
      purchaseCount: 2,
      lastActivityAt,
    });
    const result = await readPeriodCustomers(
      service,
      [
        customer('a', '2026-11-01T18:00:00Z'),
        customer('b', '2026-11-02T18:00:00Z'),
        customer('c', '2026-08-01T18:00:00Z'),
      ] as never,
      '2026-10-08',
      'USD',
    );
    expect(
      result.ranking.map((r) => [r.customer.customerId, r.amount, r.orders]),
    ).toEqual([
      ['b', 1800, 1],
      ['a', 1500, 1],
    ]);
    expect(result.orderNames.get('1')).toBe('A');
    expect(result.orderNames.has('2')).toBe(false);
  });
});

describe('vendor dashboard layout', () => {
  it('starts older saved layouts from the default grid and keeps settings', () => {
    const layout = normalizeLayout({
      order: ['customers', 'bogus', 'urgent'],
      hidden: ['kpis', 'bogus'],
      period: '90',
    });
    expect(layout.period).toBe('90');
    expect(layout.hidden).toEqual(['kpis']);
    expect(layout.grid?.map((c) => c.id).sort()).toEqual(
      dashboardWidgets.map((w) => w.id).sort(),
    );
    // Hidden Key metrics leaves no gap: the next row rises.
    expect(layout.grid?.find((c) => c.id === 'next-market')).toMatchObject({
      x: 0,
      y: 1,
      w: 4,
      h: 2,
    });
    expect(normalizeLayout(null).period).toBe('30');
    expect(normalizeLayout({ period: '365' as never }).period).toBe('30');
  });

  it('clamps saved cells to each section and settles overlaps', () => {
    const layout = normalizeLayout({
      order: [],
      hidden: [],
      period: '30',
      grid: [
        { id: 'sales-channel', x: 0, y: 0, w: 8, h: 9 },
        { id: 'sales-market', x: 0, y: 0, w: 2, h: 2 },
      ],
    });
    // Square charts stop at half width and three rows.
    expect(layout.grid?.find((c) => c.id === 'sales-channel')).toMatchObject({
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    });
    const market = layout.grid!.find((c) => c.id === 'sales-market')!;
    expect(market.x >= 4 || market.y >= 3).toBe(true);
  });
});

describe('dashboard grid engine', () => {
  const limits = (id: string) =>
    id === 'b'
      ? { minW: 2, maxW: 4, minH: 1, maxH: 3 }
      : { minW: 1, maxW: 8, minH: 1, maxH: 3 };
  const row = [
    { id: 'a', x: 0, y: 0, w: 4, h: 2 },
    { id: 'b', x: 4, y: 0, w: 4, h: 2 },
  ];

  it('settles items upward and keeps a pinned item in place', () => {
    expect(
      compact([{ id: 'a', x: 0, y: 3, w: 2, h: 1 }]).map((i) => i.y),
    ).toEqual([0]);
    expect(
      compact(
        [
          { id: 'a', x: 0, y: 0, w: 2, h: 1 },
          { id: 'b', x: 0, y: 1, w: 2, h: 1 },
        ],
        'b',
      ).find((i) => i.id === 'a')!.y,
    ).toBe(0);
  });

  it('moves an item and pushes what it lands on', () => {
    const next = moveItem(
      [
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
        { id: 'b', x: 0, y: 2, w: 4, h: 2 },
      ],
      'b',
      0,
      0,
    );
    expect(next.map((i) => [i.id, i.y])).toEqual([
      ['b', 0],
      ['a', 2],
    ]);
  });

  it('squeezes a right-hand neighbour before pushing it down', () => {
    const squeezed = resizeItem(row, 'a', 6, 2, limits);
    expect(squeezed.find((i) => i.id === 'a')).toMatchObject({ w: 6 });
    expect(squeezed.find((i) => i.id === 'b')).toMatchObject({
      x: 6,
      y: 0,
      w: 2,
    });
    const pushed = resizeItem(row, 'a', 7, 2, limits);
    expect(pushed.find((i) => i.id === 'b')).toMatchObject({ y: 2, w: 4 });
  });

  it('resizes from any corner, keeping the opposite corner fixed', () => {
    const origin = { id: 'b', x: 4, y: 2, w: 2, h: 2 };
    const wide = { minW: 1, maxW: 4, minH: 1, maxH: 3 };
    expect(cornerResize(origin, 'nw', -2, -1, wide)).toEqual({
      id: 'b',
      x: 2,
      y: 1,
      w: 4,
      h: 3,
    });
    expect(cornerResize(origin, 'ne', 1, 1, wide)).toMatchObject({
      x: 4,
      y: 3,
      w: 3,
      h: 1,
    });
    // Limits hold: never past the left edge or below the minimum.
    expect(cornerResize(origin, 'sw', -9, 0, wide)).toMatchObject({
      x: 2,
      w: 4,
    });
    expect(cornerResize(origin, 'se', -5, -5, wide)).toMatchObject({
      w: 1,
      h: 1,
    });
  });

  it('squeezes a left-hand neighbour when growing leftward', () => {
    const next = resizeTo(
      row,
      cornerResize(row[1]!, 'sw', -1, 0, limits('a')),
      limits,
    );
    expect(next.find((i) => i.id === 'a')).toMatchObject({ x: 0, w: 3 });
    expect(next.find((i) => i.id === 'b')).toMatchObject({ x: 3, w: 5 });
  });

  it('finds the first free cell for a size', () => {
    expect(freeCell(row, 2, 1)).toEqual({ x: 0, y: 2 });
    expect(freeCell([{ id: 'a', x: 0, y: 0, w: 4, h: 1 }], 4, 1)).toEqual({
      x: 4,
      y: 0,
    });
  });
});
