import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PackingApi } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { UpcomingMarketDates } from '../apps/admin/src/vendor/UpcomingMarketDates';
import { readUpcomingMarketDates } from '../apps/admin/src/vendor/markets-data';

afterEach(() => window.history.replaceState(null, '', '/'));

const day = 86400000;

async function setup({
  manage = true,
  packed = 'Packed',
}: { manage?: boolean; packed?: string } = {}) {
  const service = createFixtureVendorService({
    ...fixtureContexts.VENDOR,
    permissions: manage
      ? fixtureContexts.VENDOR.permissions
      : ['ReadOwnVendorIdentity', 'ReadOwnOrders'],
  });
  const memberships = await service.memberships();
  const state = await service.membership(memberships[0]!.id);
  const base = state.occurrences[0]!;
  const at = (id: string, days: number) => ({
    ...base,
    id,
    status: 'scheduled',
    startsAt: new Date(Date.now() + days * day).toISOString(),
    endsAt: new Date(Date.now() + days * day + 4 * 3600000).toISOString(),
  });
  const occurrences = [at('101', 1), at('102', 2), at('103', 3), at('104', 45)];
  const participation = (
    occurrenceId: string,
    status: string,
    version: number,
  ) => ({
    ...state.participations[0]!,
    id: 'p' + occurrenceId,
    occurrenceId,
    status,
    version,
    pickupInstructions: 'North tent',
  });
  const approved = { ...state.membership, status: 'approved' };
  const pending = {
    ...state.membership,
    id: 'pending-membership',
    marketId: 'pending-market',
    status: 'pending',
    market: { ...state.membership.market, name: 'Pending Market' },
  };
  service.memberships = vi.fn(async () => [approved, pending]);
  service.membership = vi.fn(async (id: string) => ({
    ...state,
    membership: id === approved.id ? approved : pending,
    occurrences,
    participations:
      id === approved.id
        ? [
            participation('101', 'confirmed', 3),
            participation('103', 'cancelled', 2),
          ]
        : [],
  }));
  service.occurrences = vi.fn(async () => occurrences);
  service.attendance = vi.fn(async () => ({}) as never);
  service.boothAssignments = vi.fn(async () => [
    { occurrenceId: 101, space: { label: 'A12' } },
  ]) as unknown as typeof service.boothAssignments;
  service.applications = {
    read: vi.fn(async () => ({
      drafts: [],
      items: [
        {
          id: 1,
          marketId: state.membership.marketId,
          current: true,
          status: 'ACCEPTED',
          city: 'Boerne',
          state: 'TX',
          origin: 'https://market.example',
        },
      ],
      totalItems: 1,
    })),
  } as unknown as typeof service.applications;
  const packing = {
    occurrences: vi.fn(async () => [{ id: 101 }, { id: 103 }]),
    read: vi.fn(async (occurrenceId: number) => ({
      occurrence: { id: occurrenceId },
      summary: {
        status: packed,
        packed: packed === 'Packed' ? 8 : 0,
        gathered: packed === 'Packed' ? 8 : 0,
        required: 8,
        customersRemaining: 0,
      },
    })),
  };
  service.packing = packing as unknown as PackingApi;
  return { service, state, approved, packing };
}

describe('vendor upcoming market dates', () => {
  it('lists dates for approved memberships only, without packing in the table', async () => {
    const { service, state } = await setup();
    render(<UpcomingMarketDates service={service} />);
    const table = await screen.findByRole('table', {
      name: 'Upcoming market dates',
    });
    const rows = within(table).getAllByRole('row').slice(1);
    // The 45-day date is outside the default 30-day range.
    expect(rows).toHaveLength(3);
    expect(within(table).queryByText('Pending Market')).not.toBeInTheDocument();
    expect(within(table).queryByText(/packed/i)).not.toBeInTheDocument();
    expect(within(rows[0]!).getByText('A12')).toBeVisible();
    expect(within(rows[0]!).getByText('Attending')).toBeVisible();
    expect(within(rows[0]!).getByText('Accepted')).toBeVisible();
    expect(within(rows[0]!).getByText('Boerne, TX')).toBeVisible();
    expect(within(rows[1]!).getByText('Needs RSVP')).toBeVisible();
    expect(within(rows[1]!).getByText('Not assigned')).toBeVisible();
    expect(within(rows[2]!).getByText('Not attending')).toBeVisible();
    expect(
      within(table).getAllByText(state.membership.market.name),
    ).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Date range'), {
      target: { value: '60' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    fireEvent.change(screen.getByLabelText('Attendance'), {
      target: { value: 'needs-rsvp' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('shows the packing status for the selected date and links to its packing list', async () => {
    const { service, packing } = await setup();
    render(<UpcomingMarketDates service={service} />);
    const panel = await screen.findByRole('region', { name: 'Date details' });
    expect(await within(panel).findByText('Packed')).toBeVisible();
    expect(within(panel).getByText('8 / 8 units packed')).toBeVisible();
    expect(
      within(panel).getByRole('link', { name: 'Packing list' }),
    ).toHaveAttribute('href', '/vendor/orders/packing?occurrence=101');
    expect(packing.read).toHaveBeenCalledWith(101);
    // A date without a packing list is never read and offers no destination.
    fireEvent.click(
      within(screen.getByRole('table')).getByText('Needs RSVP').closest('tr')!,
    );
    expect(within(panel).getByText('No packing list yet')).toBeVisible();
    expect(
      within(panel).getByRole('button', { name: 'Packing list' }),
    ).toBeDisabled();
    expect(packing.read).not.toHaveBeenCalledWith(102);
  });

  it('marks attendance with the current version and preserves participation settings', async () => {
    const { service, approved } = await setup();
    render(<UpcomingMarketDates service={service} />);
    const panel = await screen.findByRole('region', { name: 'Date details' });
    expect(
      within(panel).getByRole('button', { name: 'Attending' }),
    ).toBeDisabled();
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Not attending' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Mark not attending' }),
    );
    expect(
      await within(panel).findByText(/not attending this date/),
    ).toBeVisible();
    expect(service.attendance).toHaveBeenCalledWith({
      membershipId: approved.id,
      occurrenceId: '101',
      expectedVersion: 3,
      status: 'cancelled',
      pickupInstructions: 'North tent',
      preorderOverride: null,
    });
    fireEvent.click(
      within(screen.getByRole('table')).getByText('Needs RSVP').closest('tr')!,
    );
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Mark attending' }),
    );
    expect(service.attendance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        occurrenceId: '102',
        expectedVersion: null,
        status: 'confirmed',
      }),
    );
  });

  it('hides attendance commands without participation authority', async () => {
    const { service } = await setup({ manage: false });
    render(<UpcomingMarketDates service={service} />);
    const panel = await screen.findByRole('region', { name: 'Date details' });
    expect(
      within(panel).queryByRole('button', { name: /attending/i }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole('link', { name: 'View market' }),
    ).toBeVisible();
  });

  it('keeps booth reads optional and never reports a failed read as unassigned', async () => {
    const { service } = await setup();
    service.boothAssignments = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await readUpcomingMarketDates(service);
    expect(result.boothsAvailable).toBe(false);
    expect(result.dates.every((d) => d.booth === undefined)).toBe(true);
    expect(result.dates.map((d) => d.occurrence.id)).toEqual([
      '101',
      '102',
      '103',
      '104',
    ]);
  });
});
