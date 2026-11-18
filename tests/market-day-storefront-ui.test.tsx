import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  PublicOccurrenceMap,
  MarketDayPersonal,
  MarketDayPublicState,
} from '@market/api';
vi.mock('@market/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <article>{children}</article>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => (
    <p role="alert">{children}</p>
  ),
  SectionHeader: ({ title, id }: { title: string; id?: string }) => (
    <h2 id={id}>{title}</h2>
  ),
  MarketMap: ({
    overlays,
    highlightedIds,
  }: {
    overlays: Record<string, string>;
    highlightedIds: string[];
  }) => (
    <div data-testid="published-map">
      {JSON.stringify({ overlays, highlightedIds })}
    </div>
  ),
}));
import {
  MarketDayLive,
  followedBoothOverlays,
} from '../apps/storefront/src/components/market/MarketDayLive';
import { MarketDayCountdown } from '../apps/storefront/src/components/market/MarketDayCountdown';
const now = new Date();
const occurrence = {
  id: 1,
  startsAt: new Date(now.getTime() - 60000).toISOString(),
  endsAt: new Date(now.getTime() + 60000).toISOString(),
  cutoffAt: new Date(now.getTime() + 3660000).toISOString(),
  timezone: 'America/Chicago',
  venue: 'Market',
};
const state: MarketDayPublicState = {
  serverNow: now.toISOString(),
  occurrences: [occurrence],
};
const map = {
  occurrenceId: 1,
  publicInstructions: 'Published only',
  definition: { pixelsPerFoot: 10, areas: [], elements: [] },
  spaces: [
    {
      elementId: 'booth-a',
      label: 'A',
      widthFeet: 10,
      depthFeet: 10,
      amenities: [],
      vendor: {
        vendorId: 'A',
        businessName: 'Vendor A',
        description: '',
        category: '',
      },
    },
    {
      elementId: 'booth-b',
      label: 'B',
      widthFeet: 10,
      depthFeet: 10,
      amenities: [],
      vendor: {
        vendorId: 'B',
        businessName: 'Vendor B',
        description: '',
        category: '',
      },
    },
    {
      elementId: 'legacy',
      label: 'Legacy',
      widthFeet: 10,
      depthFeet: 10,
      amenities: [],
      vendor: { businessName: 'Vendor A', description: '', category: '' },
    },
  ],
} as PublicOccurrenceMap;
const first: MarketDayPersonal = {
  customerId: 'one',
  followedVendorIds: ['A', 'no-booth'],
  pickups: [
    {
      orderId: '23',
      reference: 'REF23',
      vendorId: 'B',
      vendorName: 'Vendor B',
      status: 'PENDING',
      venue: 'Shared pickup tent',
      instructions: 'Ask at the tent',
    },
  ],
};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Market Day private presentation', () => {
  it('polls public state at 30 seconds only while visible and does not poll private data every second', async () => {
    vi.useFakeTimers();
    const read = vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify(input.includes('occurrence=') ? first : state),
        ),
    );
    vi.stubGlobal('fetch', read);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    render(<MarketDayLive state={state} occurrence={occurrence} map={map} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29000);
    });
    expect(
      read.mock.calls.filter(([input]) => input === '/api/market-day'),
    ).toHaveLength(1);
    expect(
      read.mock.calls.filter(([input]) => input.includes('occurrence=')),
    ).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(
      read.mock.calls.filter(([input]) => input === '/api/market-day'),
    ).toHaveLength(2);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.queryByText('Shared pickup tent')).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(
      read.mock.calls.filter(([input]) => input === '/api/market-day'),
    ).toHaveLength(2);
  });
  it('returns an open page to the normal homepage when public eligibility ends', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { replace, reload: vi.fn() });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (input: string) =>
          new Response(
            JSON.stringify(
              input.includes('occurrence=')
                ? first
                : { ...state, occurrences: [] },
            ),
          ),
      ),
    );
    render(<MarketDayLive state={state} occurrence={occurrence} map={map} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
  it('highlights followed stable ids only, never pickup vendors, names or missing booths', () => {
    expect(followedBoothOverlays(map, first.followedVendorIds)).toEqual({
      'booth-a': 'Following',
    });
    expect(followedBoothOverlays(null, ['A'])).toEqual({});
  });
  it('keeps a shared tent on the order card and clears first-customer records on account switch and sign-out', async () => {
    let current: MarketDayPersonal | null = first;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) =>
        input.includes('occurrence=')
          ? new Response(JSON.stringify(current), {
              status: current ? 200 : 401,
            })
          : new Response(JSON.stringify(state)),
      ),
    );
    render(<MarketDayLive state={state} occurrence={occurrence} map={map} />);
    expect(await screen.findByText('Shared pickup tent')).toBeInTheDocument();
    expect(screen.getByTestId('published-map')).toHaveTextContent('booth-a');
    expect(screen.getByTestId('published-map')).not.toHaveTextContent(
      'booth-b',
    );
    expect(
      screen.getByRole('link', { name: 'View order details' }),
    ).toHaveAttribute('href', '/account/orders/23');
    current = { customerId: 'two', followedVendorIds: ['B'], pickups: [] };
    fireEvent.focus(window);
    expect(screen.queryByText('Shared pickup tent')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('published-map')).toHaveTextContent('booth-b'),
    );
    expect(screen.getByTestId('published-map')).not.toHaveTextContent(
      'booth-a',
    );
    current = null;
    fireEvent.focus(window);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument(),
    );
    expect(screen.getByTestId('published-map')).not.toHaveTextContent(
      'booth-b',
    );
  });
  it('renders ended-hours and pickups without a published map', async () => {
    const ended = {
      ...occurrence,
      endsAt: new Date(now.getTime() - 60000).toISOString(),
    };
    const endedState = { ...state, occurrences: [ended] };
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (input: string) =>
          new Response(
            JSON.stringify(input.includes('occurrence=') ? first : endedState),
          ),
      ),
    );
    render(
      <>
        <MarketDayCountdown occurrence={ended} serverNow={state.serverNow} />
        <MarketDayLive state={endedState} occurrence={ended} map={null} />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Market hours have ended',
    );
    expect(await screen.findByText('Shared pickup tent')).toBeInTheDocument();
    expect(screen.getByText(/No map is published/)).toBeInTheDocument();
  });
  it('ignores a private response from a prior session after a focus refresh', async () => {
    let resolveFirst!: (response: Response) => void;
    let requests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (!input.includes('occurrence='))
          return Promise.resolve(new Response(JSON.stringify(state)));
        requests++;
        if (requests === 1)
          return new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          });
        return Promise.resolve(
          new Response(
            JSON.stringify({
              customerId: 'two',
              followedVendorIds: ['B'],
              pickups: [],
            }),
          ),
        );
      }),
    );
    render(<MarketDayLive state={state} occurrence={occurrence} map={map} />);
    fireEvent.focus(window);
    await waitFor(() =>
      expect(screen.getByTestId('published-map')).toHaveTextContent('booth-b'),
    );
    await act(async () => {
      resolveFirst(new Response(JSON.stringify(first)));
    });
    expect(screen.queryByText('Shared pickup tent')).not.toBeInTheDocument();
    expect(screen.getByTestId('published-map')).not.toHaveTextContent(
      'booth-a',
    );
  });
});
