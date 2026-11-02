import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Overview } from '../apps/admin/src/vendor/overview';
import { MarketOverview } from '../apps/admin/src/market/overview';
import type { VendorService } from '../apps/admin/src/vendor/service';
import type { MarketService } from '../apps/admin/src/market/service';
import { AppError } from '@market/api';

describe.each(['lead', 'staff'] as const)('%s workspace overview', (role) => {
  it('loads the Vendor overview without requesting unavailable document or financial capabilities', async () => {
    const service = {
      context: {
        scope: 'VENDOR',
        membershipRole: role,
        permissions: [
          'ReadOwnVendorIdentity',
          'ReadOwnCatalog',
          'ReadOwnOrders',
        ],
      },
      catalogRead: vi.fn().mockResolvedValue({ totalItems: 0 }),
      orderList: vi.fn().mockResolvedValue({ totalItems: 0 }),
      memberships: vi.fn().mockResolvedValue([]),
      customers: vi.fn().mockRejectedValue(new AppError('forbidden')),
      availability: vi.fn().mockResolvedValue('denied'),
      totals: vi.fn().mockRejectedValue(new AppError('forbidden')),
      notifications: {
        summary: vi.fn().mockRejectedValue(new AppError('forbidden')),
        upcoming: vi.fn(),
      },
    };
    render(<Overview service={service as unknown as VendorService} />);
    await screen.findByText('Owned products');
    await screen.findByText('Operational orders');
    expect(service.notifications.summary).not.toHaveBeenCalled();
    expect(service.notifications.upcoming).not.toHaveBeenCalled();
    expect(service.customers).not.toHaveBeenCalled();
    expect(service.totals).not.toHaveBeenCalled();
  });

  it('loads the Market overview without requesting unavailable compliance data', async () => {
    const service = {
      readKey: 'employee-market',
      context: {
        scope: 'MARKET',
        membershipRole: role,
        permissions: ['ReadOwnMarket'],
      },
      overview: vi.fn().mockResolvedValue({ nextOccurrence: null }),
      relationshipPage: vi.fn().mockResolvedValue({ items: [] }),
      notifications: {
        summary: vi.fn().mockRejectedValue(new AppError('forbidden')),
      },
    };
    render(<MarketOverview service={service as unknown as MarketService} />);
    await screen.findByText('No occurrences have been scheduled.');
    await screen.findByText('No vendor relationships yet');
    expect(service.notifications.summary).not.toHaveBeenCalled();
  });
});

it('keeps a base-read-only Vendor workspace usable without catalog or order access', async () => {
  const service = {
    context: {
      scope: 'VENDOR',
      membershipRole: 'staff',
      permissions: ['ReadOwnVendorIdentity'],
    },
    catalogRead: vi.fn().mockRejectedValue(new AppError('forbidden')),
    orderList: vi.fn().mockRejectedValue(new AppError('forbidden')),
    memberships: vi.fn().mockResolvedValue([]),
    customers: vi.fn(),
    availability: vi.fn().mockResolvedValue('denied'),
    totals: vi.fn(),
  };
  render(<Overview service={service as unknown as VendorService} />);
  await waitFor(() => expect(service.memberships).toHaveBeenCalledOnce());
  expect(service.catalogRead).not.toHaveBeenCalled();
  expect(service.orderList).not.toHaveBeenCalled();
});

it('preserves the compliance panel for an authorized Owner', async () => {
  const service = {
    context: {
      scope: 'VENDOR',
      membershipRole: 'owner',
      permissions: ['ReadOwnVendorIdentity', 'ReadOwnDocuments'],
    },
    catalogRead: vi.fn(),
    orderList: vi.fn(),
    customers: vi.fn(),
    totals: vi.fn(),
    memberships: vi.fn().mockResolvedValue([]),
    availability: vi.fn().mockResolvedValue('denied'),
    notifications: {
      summary: vi.fn().mockResolvedValue({
        totals: { outstandingRequired: 0, pending: 0, rejected: 0 },
        library: { expired: 0, expiringSoon: 0 },
        markets: [],
        truncated: false,
      }),
    },
  };
  render(<Overview service={service as unknown as VendorService} />);
  await screen.findByRole('link', { name: 'Open document library' });
  expect(service.notifications.summary).toHaveBeenCalledOnce();
});
