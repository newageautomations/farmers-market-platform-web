import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { Markets } from '../apps/admin/src/vendor/markets';

afterEach(() => window.history.replaceState(null, '', '/'));

const DAY = 86400000;

async function setup() {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  const [membership] = await service.memberships();
  const state = await service.membership(membership!.id);
  const template = state.occurrences[0]!;
  const occurrences = Array.from({ length: 7 }, (_, i) => ({
    ...template,
    id: `occ-${i + 1}`,
    startsAt: new Date(Date.now() + (i + 1) * 7 * DAY).toISOString(),
    endsAt: new Date(
      Date.now() + (i + 1) * 7 * DAY + 5 * 3600000,
    ).toISOString(),
  }));
  const statuses = [
    'confirmed',
    'confirmed',
    'confirmed',
    'planned',
    'cancelled',
  ];
  const participations = statuses.map((status, i) => ({
    ...state.participations[0]!,
    id: `part-${i + 1}`,
    occurrenceId: occurrences[i]!.id,
    status,
  }));
  const current = { ...state, occurrences, participations, offerings: [] };
  service.membership = vi.fn(async () => current);
  service.occurrences = vi.fn(async () => occurrences);
  service.applications = undefined;
  service.boothAssignments = vi.fn(async () => [
    {
      occurrenceId: 'occ-1' as unknown as number,
      startsAt: occurrences[0]!.startsAt,
      space: { label: 'B-12', widthFeet: 10, depthFeet: 10, amenities: [] },
      elementId: 'b12',
      map: null,
      publicInstructions: 'Located in the main produce row.',
      rentals: [],
      invoices: [],
    },
  ]);
  service.offering = vi.fn(async () => ({}) as never);
  service.marketDefault = vi.fn(async () => current.membership);
  service.requestListing = vi.fn(service.requestListing);
  return {
    service,
    membership: current.membership,
    listing: state.listings[0]!,
  };
}

describe('vendor market page', () => {
  it('summarizes the market, shows five dates and expands like market discovery', async () => {
    const { service, membership } = await setup();
    render(<Markets service={service} id={membership.id} />);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: membership.market.name,
      }),
    ).toBeVisible();
    const overview = screen.getByRole('region', { name: 'Market overview' });
    expect(overview).toHaveTextContent('Total upcoming dates7');
    expect(overview).toHaveTextContent('Booth B-12');
    expect(overview).toHaveTextContent(
      '3 Attending • 1 Tentative • 1 Not attending',
    );
    const dates = screen.getByRole('table', { name: 'Upcoming market dates' });
    expect(within(dates).getAllByRole('row')).toHaveLength(6);
    expect(
      within(dates).getAllByRole('link', { name: /Manage/ })[0],
    ).toHaveAttribute('href', `/vendor/markets/${membership.id}/dates/occ-1`);
    fireEvent.click(screen.getByRole('button', { name: 'View more dates' }));
    expect(
      within(
        screen.getByRole('table', { name: 'Upcoming market dates' }),
      ).getAllByRole('row'),
    ).toHaveLength(8);
    expect(screen.getByText('7 market dates. Showing 1 to 7.')).toBeVisible();
    expect(screen.queryByText(/Manage application/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick actions/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /Auto-enroll/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('region', { name: 'Booth assignment' }),
    ).toHaveTextContent('Located in the main produce row.');
  });

  it('turns auto-enroll on with the membership version', async () => {
    const { service, membership } = await setup();
    service.autoEnroll = vi.fn(async () => ({
      ...membership,
      autoEnroll: true,
    }));
    render(<Markets service={service} id={membership.id} />);
    const toggle = await screen.findByRole('switch', { name: /Auto-enroll/ });
    expect(toggle).toBeEnabled();
    fireEvent.click(toggle);
    expect(
      await screen.findByRole('switch', { name: 'Auto-enroll enabled' }),
    ).toBeChecked();
    expect(screen.queryByText(/Auto-enroll is on/)).not.toBeInTheDocument();
    expect(service.autoEnroll).toHaveBeenCalledWith(
      membership.id,
      membership.version,
      true,
    );
  });

  it('keeps auto-enroll unavailable until the membership is approved', async () => {
    const { service, membership } = await setup();
    const state = await service.membership(membership.id);
    service.membership = vi.fn(async () => ({
      ...state,
      membership: { ...state.membership, status: 'pending' },
    }));
    render(<Markets service={service} id={membership.id} />);
    expect(
      await screen.findByRole('switch', { name: /Auto-enroll/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        /Available once your membership with this market is approved/,
      ),
    ).toBeVisible();
  });

  it('enables preorder only for active listings and writes undeclined dates', async () => {
    const { service, membership, listing } = await setup();
    render(<Markets service={service} id={membership.id} />);
    const table = await screen.findByRole('table', {
      name: 'Items for preordering',
    });
    const switches = within(table).getAllByRole('switch');
    const active = within(table)
      .getAllByRole('row')
      .find((r) => within(r).queryByText('Active'))!;
    const activeSwitch = within(active).getByRole('switch');
    expect(activeSwitch).toBeEnabled();
    expect(
      switches.filter((s) => !(s as HTMLInputElement).disabled),
    ).toHaveLength(1);
    fireEvent.click(activeSwitch);
    await waitFor(() => expect(service.offering).toHaveBeenCalledTimes(4));
    expect(screen.queryByText(/Preorder (enabled|disabled) for/)).toBeNull();
    expect(service.offering).toHaveBeenCalledWith(
      expect.objectContaining({
        participationId: 'part-4',
        listingId: listing.id,
        enabled: true,
        preorderEnabled: true,
      }),
    );
  });

  it('on a date page, enables preorder for that market date only', async () => {
    const { service, membership, listing } = await setup();
    render(
      <Markets service={service} id={membership.id} occurrenceId="occ-2" />,
    );
    const table = await screen.findByRole('table', {
      name: 'Items for preordering',
    });
    const active = within(table)
      .getAllByRole('row')
      .find((r) => within(r).queryByText('Active'))!;
    fireEvent.click(within(active).getByRole('switch'));
    await waitFor(() => expect(service.offering).toHaveBeenCalledTimes(1));
    expect(service.offering).toHaveBeenCalledWith(
      expect.objectContaining({
        participationId: 'part-2',
        listingId: listing.id,
        preorderEnabled: true,
      }),
    );
  });

  it('requests listings only for selected unlisted items', async () => {
    const { service, membership, listing } = await setup();
    render(<Markets service={service} id={membership.id} />);
    const table = await screen.findByRole('table', {
      name: 'Items for preordering',
    });
    const request = screen.getByRole('button', { name: /Request listing/ });
    expect(request).toBeDisabled();
    const rows = within(table).getAllByRole('row').slice(1);
    const listed = rows.find((r) => within(r).queryByText('Active'))!;
    const unlisted = rows.find((r) => within(r).queryByText('Not listed'))!;
    fireEvent.click(within(listed).getByRole('checkbox'));
    fireEvent.click(within(unlisted).getByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Request listing (1)' }),
    );
    await waitFor(() =>
      expect(service.requestListing).toHaveBeenCalledTimes(1),
    );
    expect(screen.queryByText(/listing request was sent/)).toBeNull();
    expect(service.requestListing).not.toHaveBeenCalledWith(
      membership.id,
      listing.variantId,
    );
  });

  it('saves the market preorder window as a labeled manual override', async () => {
    const { service, membership } = await setup();
    render(<Markets service={service} id={membership.id} />);
    await screen.findByRole('table', { name: 'Items for preordering' });
    expect(
      screen.queryByRole('dialog', { name: 'Preorder settings' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('No override set.')).toBeVisible();
    expect(screen.getByText(/no vendor-wide preorder setting/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Preorders open: days before'), {
      target: { value: '14' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create override' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Preorder settings' }),
      ).toBeNull(),
    );
    expect(service.marketDefault).toHaveBeenCalledWith(
      membership.id,
      membership.version,
      expect.objectContaining({ opensDaysBefore: 14 }),
    );
  });
});
