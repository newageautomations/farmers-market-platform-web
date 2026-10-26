import { afterEach, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from '@testing-library/react';
import {
  MarketPickupCalendar,
  marketHours,
} from '../apps/storefront/src/components/MarketPickupCalendar';
import { ShopMarketSelection } from '../apps/storefront/src/components/ShopMarketSelection';
import { shopCall } from '../apps/storefront/src/components/shop-client';
import { AppError, type VendorPreorderOccurrence } from '@market/api';
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));
const call = vi.mocked(shopCall);
const first: VendorPreorderOccurrence = {
  id: '7',
  marketId: '1',
  marketName: 'Garden Market',
  scheduleDate: '2026-10-31',
  startsAt: '2026-10-31T14:00:00Z',
  endsAt: '2026-10-31T19:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Park',
};
const second = {
  ...first,
  id: '8',
  marketId: '2',
  marketName: 'Orchard Market',
  startsAt: '2026-10-31T16:00:00Z',
};
const later = {
  ...first,
  id: '9',
  scheduleDate: '2026-12-05',
  startsAt: '2026-12-05T15:00:00Z',
  endsAt: '2026-12-05T20:00:00Z',
};
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('groups same-day markets, shows names and local hours on hover/focus without repeating the date, and selects the explicit occurrence', () => {
  const select = vi.fn();
  render(
    <MarketPickupCalendar
      occurrences={[first, second]}
      selectedId="7"
      onSelect={select}
    />,
  );
  const day = screen.getByRole('button', { name: /^Saturday, October 31/ });
  expect(day).toHaveAttribute('aria-pressed', 'true');
  expect(day).not.toHaveClass('secondary');
  expect(day.textContent).toBe('31');
  expect(screen.getByText('Selected')).toHaveClass('ui-status-success');
  expect(screen.getByRole('button', { name: /^Orchard Market/ })).toHaveClass(
    'secondary',
  );
  expect(
    screen.getByRole('button', { name: /^Garden Market \(current\)/ }),
  ).not.toHaveClass('secondary');
  fireEvent.mouseEnter(day);
  expect(screen.getByRole('tooltip')).toHaveTextContent(
    'Garden Market · 9:00 AM to 2:00 PM CDT',
  );
  expect(screen.getByRole('tooltip')).toHaveTextContent(
    'Orchard Market · 11:00 AM to 2:00 PM CDT',
  );
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('October');
  fireEvent.mouseLeave(day);
  fireEvent.focus(day);
  expect(screen.getByRole('tooltip')).toBeInTheDocument();
  fireEvent.click(day);
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Orchard Market/ }));
  expect(select).toHaveBeenCalledExactlyOnceWith('8');
  expect(
    screen.queryByRole('button', { name: /October 30/ }),
  ).not.toBeInTheDocument();
});

it('browses empty months and date boundaries without changing the preorder selection', () => {
  const select = vi.fn();
  render(
    <MarketPickupCalendar
      occurrences={[later, first]}
      selectedId="7"
      onSelect={select}
    />,
  );
  expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(
    screen.getByRole('table', { name: 'November 2026' }),
  ).toBeInTheDocument();
  expect(screen.getByText('No pickup markets this month.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(
    screen.getByRole('table', { name: 'December 2026' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /^Saturday, December 5/ }),
  ).toBeEnabled();
  const unselected = screen.getByRole('button', {
    name: /^Saturday, December 5/,
  });
  expect(unselected).toHaveClass('secondary');
  expect(unselected).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(unselected);
  expect(screen.getByText('Not Selected')).toHaveClass('ui-status-danger');
  expect(unselected).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  expect(select).not.toHaveBeenCalled();
  expect(marketHours(later)).toBe('9:00 AM to 2:00 PM CST');
});

it('uses market calendar dates even across UTC boundaries and supports leap days', () => {
  const leap = {
    ...first,
    scheduleDate: '2028-02-29',
    startsAt: '2028-03-01T01:00:00Z',
    endsAt: '2028-03-01T03:00:00Z',
  };
  render(
    <MarketPickupCalendar
      occurrences={[leap]}
      selectedId="7"
      onSelect={() => {}}
    />,
  );
  expect(
    screen.getByRole('button', { name: /^Tuesday, February 29/ }),
  ).toBeInTheDocument();
  expect(screen.queryByText('30')).not.toBeInTheDocument();
  expect(marketHours(leap)).toBe('7:00 PM to 9:00 PM CST');
});

it('opens the shared modal from a real button and blocks preview and disabled mutations', () => {
  render(
    <ShopMarketSelection
      storefrontId="1"
      occurrences={[first, second]}
      selectedId="7"
      preview
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Change Market' }));
  const dialog = screen.getByRole('dialog', { name: 'Choose a pickup market' });
  const option = within(dialog).getByRole('button', {
    name: /^Orchard Market/,
  });
  expect(option).toBeDisabled();
  fireEvent.click(option);
  expect(call).not.toHaveBeenCalled();
  expect(
    screen.getByText('Market selection is disabled in the editor preview.'),
  ).toBeVisible();
});

it('serializes market changes, blocks modal dismissal while saving and retains failures for retry', async () => {
  let reject!: (error: Error) => void;
  call.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const busy = vi.fn();
  render(
    <ShopMarketSelection
      storefrontId="1"
      occurrences={[first, second]}
      selectedId="7"
      onBusyChange={busy}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Change Market' }));
  const option = screen.getByRole('button', { name: /^Orchard Market/ });
  fireEvent.click(option);
  fireEvent.click(option);
  expect(call).toHaveBeenCalledExactlyOnceWith('1', 'select-occurrence', {
    occurrenceId: '8',
  });
  expect(option).toBeDisabled();
  const dialog = screen.getByRole('dialog');
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog).toBeVisible();
  reject(new AppError('conflict', 'NONEMPTY_CONTEXT_SWITCH_DENIED'));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Remove the current items',
    ),
  );
  expect(
    screen.getByRole('link', { name: 'Review your cart' }),
  ).toHaveAttribute('href', '/cart');
  expect(option).toBeEnabled();
  expect(busy.mock.calls.map((c) => c[0])).toEqual([true, false]);
});

it('persists the chosen occurrence then reloads the current route, retaining filters and the catalog anchor', async () => {
  const assign = vi.fn();
  const original = window;
  vi.stubGlobal(
    'window',
    new Proxy(original, {
      get(target, key) {
        if (key === 'location')
          return {
            href: 'http://localhost/products?category=fruit&sort=name&page=2#farmhouse-catalog',
            assign,
          };
        if (key === 'addEventListener' || key === 'removeEventListener')
          return target[key].bind(target);
        return Reflect.get(target, key, target);
      },
    }),
  );
  call.mockResolvedValue({});
  render(
    <ShopMarketSelection
      storefrontId="1"
      occurrences={[first, second]}
      selectedId="7"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Change Market' }));
  fireEvent.click(screen.getByRole('button', { name: /^Orchard Market/ }));
  await waitFor(() =>
    expect(assign).toHaveBeenCalledWith(
      '/products?category=fruit&sort=name&occurrence=8#farmhouse-catalog',
    ),
  );
  expect(call).toHaveBeenCalledWith('1', 'select-occurrence', {
    occurrenceId: '8',
  });
});
