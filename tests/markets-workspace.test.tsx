import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { Markets } from '../apps/admin/src/vendor/markets';
import { readMarketsOverview } from '../apps/admin/src/vendor/markets-data';

afterEach(() => window.history.replaceState(null, '', '/'));

async function setup(status = 'confirmed', manage = true) {
  const service = createFixtureVendorService({
    ...fixtureContexts.VENDOR,
    permissions: manage
      ? fixtureContexts.VENDOR.permissions
      : ['ReadOwnVendorIdentity'],
  });
  const memberships = await service.memberships();
  const state = await service.membership(memberships[0]!.id);
  const next = {
    ...state.occurrences[0]!,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 86400000 + 14400000).toISOString(),
  };
  service.memberships = vi.fn(async () => [state.membership]);
  service.membership = vi.fn(async () => ({
    ...state,
    occurrences: [next],
    participations: state.participations.map((p) => ({ ...p, status })),
  }));
  service.occurrences = vi.fn(async () => [next]);
  service.attendance = vi.fn(service.attendance);
  service.applications = {
    read: vi.fn(async () => ({
      drafts: [],
      items: [
        {
          marketId: state.membership.marketId,
          current: true,
          origin: 'https://market.example',
        },
      ],
      totalItems: 1,
    })),
  } as unknown as typeof service.applications;
  return { service, next, state };
}

describe('vendor markets overview', () => {
  it('shows memberships and the next scheduled market without booth information, and filters records', async () => {
    const { service, state } = await setup();
    render(<Markets service={service} />);
    const table = await screen.findByRole('table', { name: 'Your markets' });
    expect(within(table).getByText(state.membership.market.name)).toBeVisible();
    expect(within(table).queryByText('Attending')).not.toBeInTheDocument();
    expect(within(table).queryByText(/pavilion/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Next upcoming market' }),
    ).toHaveTextContent('Attending');
    expect(screen.queryByText(/booth/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Configure' })).toHaveLength(2);
    expect(
      within(table).getByRole('link', { name: /Website/ }),
    ).toHaveAttribute('href', 'https://market.example');
    expect(
      within(table).getByRole('link', { name: /Website/ }),
    ).toHaveAttribute('target', '_blank');
    fireEvent.change(screen.getByLabelText('Search markets'), {
      target: { value: 'unmatched market' },
    });
    expect(screen.getByText('No matching markets')).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Next upcoming market' }),
    ).toHaveTextContent(state.membership.market.name);
  });

  it('opens the selected market date page without submitting a command', async () => {
    const { service, next, state } = await setup('cancelled');
    const { unmount } = render(<Markets service={service} />);
    const links = await screen.findAllByRole('link', {
      name: 'Request attendance',
    });
    expect(links[0]).toHaveAttribute(
      'href',
      `/vendor/markets/${state.membership.id}/dates/${next.id}`,
    );
    fireEvent.click(links[0]!);
    expect(service.attendance).not.toHaveBeenCalled();
    unmount();
    render(
      <Markets
        service={service}
        id={state.membership.id}
        occurrenceId={next.id}
      />,
    );
    expect(
      await screen.findByRole('button', { name: 'Attending' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Not attending' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses hash navigation, supports history changes, and retains read-only authority', async () => {
    const { service } = await setup('planned', false);
    render(<Markets service={service} />);
    await screen.findByRole('table', { name: 'Your markets' });
    expect(
      screen.queryByRole('link', { name: 'Request attendance' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Applications' }));
    expect(window.location.hash).toBe('#applications');
    expect(screen.getByText('Applications unavailable')).toBeVisible();
    act(() => {
      window.history.replaceState(null, '', '/vendor/markets#overview');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await screen.findByRole('table', { name: 'Your markets' });
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the existing Applications entry inside the persistent markets menu', async () => {
    const { service } = await setup('planned', false);
    render(<Markets service={service} initialView="applications" />);
    expect(window.location.pathname + window.location.hash).toBe(
      '/vendor/markets#applications',
    );
    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('heading', { name: 'Markets', level: 1 }),
    ).toBeVisible();
  });

  it('filters past and cancelled occurrences and orders next dates independently of participation', async () => {
    const { service, next } = await setup('cancelled');
    service.occurrences = vi.fn(async () => [
      {
        ...next,
        id: 'past',
        startsAt: new Date(Date.now() - 86400000).toISOString(),
      },
      { ...next, id: 'cancelled', status: 'cancelled' },
      {
        ...next,
        id: 'later',
        startsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
      next,
    ]);
    const result = await readMarketsOverview(service);
    expect(result.rows[0]!.next!.id).toBe(next.id);
    expect(result.rows[0]!.upcoming.map((o) => o.id)).toEqual([
      next.id,
      'later',
    ]);
  });

  it('shows empty and error states without manufacturing market counts', async () => {
    const { service } = await setup();
    service.memberships = vi.fn(async () => []);
    const { unmount } = render(<Markets service={service} />);
    expect(await screen.findByText('No market memberships yet')).toBeVisible();
    unmount();
    service.memberships = vi.fn(async () => {
      throw new AppError('unavailable');
    });
    render(<Markets service={service} />);
    await screen.findByRole('button', { name: 'Refresh records' });
    expect(screen.queryByText('Active markets')).not.toBeInTheDocument();
  });
});
