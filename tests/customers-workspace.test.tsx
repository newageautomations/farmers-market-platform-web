import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { Customers } from '../apps/admin/src/vendor/customers';
import {
  averageCustomerSpend,
  customersCsv,
  filterCustomers,
  readCustomersWorkspace,
  readCustomerTrends,
  customerTrend,
  type CustomerFilters,
} from '../apps/admin/src/vendor/customers-data';

const defaults: CustomerFilters = {
  search: '',
  segment: 'all',
  activity: 'all',
  orders: 'all',
  sort: 'name',
};
const setup = () => createFixtureVendorService(fixtureContexts.VENDOR);

describe('customer workspace', () => {
  it('selects customers without contact, avatar, or action columns and links both history actions to their detail', async () => {
    const service = setup();
    render(<Customers service={service} />);
    const table = await screen.findByRole('table', {
      name: 'Owned customer relationships',
    });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Customer', 'Orders', 'Total spent', 'Last order']);
    expect(table.querySelector('svg, .farmstand-icon')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Add customer/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(table).getByRole('link', { name: 'Synthetic A Customer 2' }),
    );
    for (const name of ['View Purchase History', 'View All']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        '/vendor/customers/1202',
      );
    }
    expect(await screen.findByText('#1401')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Close customer preview' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View All' })).toHaveAttribute(
      'href',
      '/vendor/customers/1202',
    );
  });

  it('searches across pages and resets pagination when filters change', async () => {
    render(<Customers service={setup()} />);
    const table = await screen.findByRole('table', {
      name: 'Owned customer relationships',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Search customer name or email'), {
      target: { value: 'synthetic-1-23@' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(
      within(table).getByRole('link', { name: 'Synthetic A Customer 23' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('uses purchase history dates and preserves the list if a preview fails', async () => {
    const service = setup();
    const base = (
      await service.history('1301', { skip: 0, take: 3, search: null })
    ).items[0]!;
    service.history = vi.fn(async (id) => {
      if (id === '1302') throw new AppError('unavailable');
      return {
        totalItems: 1,
        items: [{ ...base, purchasedAt: '2024-11-02T12:00:00Z' }],
      };
    });
    render(<Customers service={service} />);
    const table = await screen.findByRole('table', {
      name: 'Owned customer relationships',
    });
    expect(await within(table).findAllByText('Nov 2, 2024')).toHaveLength(19);
    fireEvent.click(
      within(table).getByRole('link', { name: 'Synthetic A Customer 2' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Service unavailable',
    );
    expect(table).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View Purchase History' }),
    ).toHaveAttribute('href', '/vendor/customers/1202');
  });

  it('keeps currencies separate, bounds calendar filters, and escapes exported names', async () => {
    const rows = await readCustomersWorkspace(setup());
    const customer = {
      ...rows[0]!,
      firstName: '=SUM(1,2)',
      lastName: '"Name"',
      firstActivityAt: '2026-10-31T12:00:00Z',
      lastActivityAt: '2026-10-31T12:00:00Z',
      attribution: [
        { currency: 'USD', original: 1000, remaining: 900, refunded: 100 },
        { currency: 'EUR', original: 2000, remaining: 2000, refunded: 0 },
      ],
    };
    const now = new Date(2026, 10, 3, 12);
    expect(
      filterCustomers([customer], { ...defaults, segment: 'new' }, now),
    ).toHaveLength(0);
    expect(
      filterCustomers([customer], { ...defaults, activity: 'month' }, now),
    ).toHaveLength(0);
    expect(
      filterCustomers(
        [customer],
        { ...defaults, activity: '30', segment: 'repeat' },
        now,
      ),
    ).toHaveLength(1);
    const average = averageCustomerSpend([customer]);
    expect(average).toContain('10.00');
    expect(average).toContain('20.00');
    const csv = customersCsv([customer]);
    expect(csv).toContain('"\'=SUM(1,2) ""Name"""');
    expect(csv.split('\r\n')).toHaveLength(3);
  });
  it('compares real monthly snapshots and handles decreases and zero baselines', async () => {
    const service = setup();
    const customers = (await readCustomersWorkspace(service))
      .slice(0, 2)
      .map((row, index) => ({
        ...row,
        firstActivityAt: index
          ? '2026-11-01T12:00:00Z'
          : '2026-10-01T12:00:00Z',
        purchaseCount: index ? 1 : 2,
        attribution: [
          {
            currency: 'USD',
            original: index ? 4000 : 3000,
            refunded: 0,
            remaining: index ? 4000 : 3000,
          },
        ],
      }));
    const base = (
      await service.history(customers[0]!.customerId, {
        skip: 0,
        take: 1,
        search: null,
      })
    ).items[0]!;
    service.history = vi.fn(async (id) => {
      const items =
        id === customers[0]!.customerId
          ? [
              { ...base, purchasedAt: '2026-10-01T12:00:00Z', original: 1000 },
              { ...base, purchasedAt: '2026-11-01T12:00:00Z', original: 2000 },
            ]
          : [{ ...base, purchasedAt: '2026-11-01T12:00:00Z', original: 4000 }];
      return { totalItems: items.length, items };
    });
    const trends = await readCustomerTrends(
      service,
      customers,
      new Date(2026, 10, 3),
    );
    expect(trends.map((trend) => trend.label)).toEqual([
      'Up 100% from last month',
      'No change from last month',
      'Up from 0 last month',
      'Up 250% from last month',
    ]);
    expect(customerTrend(85, 100)).toEqual({
      direction: 'down',
      label: 'Down 15% from last month',
    });
    expect(customerTrend(0, 0).direction).toBe('neutral');
  });
});
