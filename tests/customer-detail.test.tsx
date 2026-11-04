import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { Customers } from '../apps/admin/src/vendor/customers';
import {
  favoriteItem,
  readCustomerDetail,
} from '../apps/admin/src/vendor/customer-detail';
import { readOrdersWorkspace } from '../apps/admin/src/vendor/orders-data';

const setup = () => createFixtureVendorService(fixtureContexts.VENDOR);

describe('individual customer orders', () => {
  it('reads loyalty by customer identity and distinguishes lifetime earnings from the available balance', async () => {
    const service = setup();
    service.loyalty = {
      overview: vi.fn(async () => ({
        leaderboard: [
          {
            id: 1301,
            customerId: 'someone-else',
            earned: '99999',
            available: '99999',
          },
          { id: 8800, customerId: '1301', earned: '12480', available: '2000' },
        ],
        take: 100,
      })),
    } as unknown as NonNullable<typeof service.loyalty>;
    render(<Customers service={service} id="1201" />);
    expect(await screen.findByText('12,480')).toBeVisible();
    expect(
      screen.getByText(/Net lifetime earned.*2,000 available/),
    ).toBeVisible();
    expect(screen.queryByText('99,999')).toBeNull();
  });

  it('reuses order filters and navigation, scopes rows by purchase IDs, and omits excluded controls', async () => {
    const service = setup();
    const history = service.history;
    service.history = vi.fn(async (id, options) => {
      const result = await history(id, options);
      return { totalItems: 1, items: result.items.slice(0, 1) };
    });
    const customers = vi.spyOn(service, 'customers');
    render(<Customers service={service} id="1201" />);
    const table = await screen.findByRole('table', { name: 'Vendor orders' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Synthetic A Customer 1',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(
      within(table).getByRole('link', { name: 'Open order 1401' }),
    ).toHaveAttribute('href', '/vendor/orders/1401');
    expect(
      screen.getByText('Favorite item').nextElementSibling,
    ).toHaveTextContent('Synthetic A Variant 1');
    expect(customers).not.toHaveBeenCalled();
    expect(service.history).toHaveBeenCalledWith('1301', {
      skip: 0,
      take: 100,
      search: null,
    });
    expect(screen.queryByLabelText('Order summary')).not.toBeInTheDocument();
    for (const name of [
      'Edit Customer',
      'View Purchase History',
      'Export Orders',
      'Create Sale',
    ])
      expect(
        screen.queryByRole('button', { name }) ??
          screen.queryByRole('link', { name }),
      ).not.toBeInTheDocument();
    expect(screen.queryByText('Preferred channel')).not.toBeInTheDocument();
    for (const label of [
      'Market',
      'Market Date',
      'Date Range',
      'Sale Type',
      'Payment Status',
      'Pickup Status',
      'Sort By',
    ])
      expect(screen.getByLabelText(label)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: '1423' },
    });
    expect(screen.getByText('No matching orders')).toBeVisible();
    expect(
      screen.getByText('Favorite item').nextElementSibling,
    ).toHaveTextContent('Synthetic A Variant 1');
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: '1401' },
    });
    fireEvent.click(
      within(table).getByRole('link', { name: 'Open order 1401' }),
    );
    expect(window.location.pathname).toBe('/vendor/orders/1401');
  });

  it('loads full history and keeps the customer summary independent of table pagination and filters', async () => {
    const service = setup();
    const history = service.history;
    service.history = vi.fn((id, options) =>
      history(id, { ...options, take: 20 }),
    );
    render(<Customers service={service} id="1201" />);
    const table = await screen.findByRole('table', { name: 'Vendor orders' });
    expect(service.history).toHaveBeenCalledWith('1301', {
      skip: 20,
      take: 100,
      search: null,
    });
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: '1401' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('Purchases').nextElementSibling).toHaveTextContent(
      '22 orders',
    );
  });

  it('counts units instead of order frequency and excludes cancellations, including later history pages', async () => {
    const service = setup();
    const { purchases, customer } = await readCustomerDetail(service, '1201');
    const rows = await readOrdersWorkspace(service, {
      customer: customer.firstName,
      purchases,
    });
    const base = purchases[0]!;
    const item = base.lines[0]!;
    const input = [
      {
        ...base,
        lines: [{ ...item, variantId: 'a', quantity: 2, cancelledQuantity: 0 }],
      },
      {
        ...base,
        lines: [{ ...item, variantId: 'a', quantity: 2, cancelledQuantity: 0 }],
      },
      {
        ...base,
        lines: [
          { ...item, variantId: 'b', quantity: 10, cancelledQuantity: 3 },
        ],
      },
      {
        ...base,
        nativeState: 'Cancelled',
        lines: [{ ...item, variantId: 'c', quantity: 100 }],
      },
    ];
    rows[0]!.portion = {
      ...rows[0]!.portion,
      lines: ['a', 'b', 'c'].map((id) => ({
        ...rows[0]!.portion.lines[0]!,
        variantId: id,
        variantName: `Item ${id}`,
      })),
    };
    expect(favoriteItem(input, rows)).toBe('Item b');
    expect(favoriteItem([], rows)).toBe('No purchases yet');
  });

  it('shows empty history honestly and rejects incomplete history rather than showing partial totals', async () => {
    const service = setup();
    const customer = await service.customer('1201');
    service.customer = async () => ({
      ...customer,
      purchaseCount: 0,
      attribution: [],
    });
    service.history = async () => ({ items: [], totalItems: 0 });
    render(<Customers service={service} id="1201" />);
    const table = await screen.findByRole('table', { name: 'Vendor orders' });
    expect(within(table).getAllByRole('row')).toHaveLength(1);
    expect(screen.getByText('No orders yet')).toBeVisible();
    expect(screen.getByText('No purchases yet')).toBeVisible();
    service.history = async () => ({ items: [], totalItems: 2 });
    await expect(readCustomerDetail(service, '1201')).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
