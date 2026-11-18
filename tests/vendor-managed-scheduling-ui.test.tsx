import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { VendorManagedMarketsApi } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { MarketsWorkspace } from '../apps/admin/src/vendor/MarketsWorkspace';
import { VendorManagedMarkets } from '../apps/admin/src/vendor/VendorManagedMarkets';

beforeEach(() =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  ),
);
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

async function setup() {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  const manager = createFixtureMarketService(marketFixtureContext('1'));
  const market = {
    ...(await manager.configuration(manager.marketId)),
    ownerVendorId: service.vendorId,
  };
  const api: VendorManagedMarketsApi = {
    list: vi.fn(async () => [market]),
    create: vi.fn(async () => market),
    configuration: vi.fn(async () => market),
    occurrences: vi.fn(async () => []),
    saveSchedule: vi.fn(async () => market),
    deleteSchedule: vi.fn(async () => market),
    generate: vi.fn(async () => []),
    manual: vi.fn(),
    reviseOccurrence: vi.fn(),
    cancelOccurrence: vi.fn(),
  };
  service.managedMarkets = api;
  return { service, market, api };
}

it('uses the manager action order and isolates the wide modal from header styles', async () => {
  const { service } = await setup();
  render(<MarketsWorkspace service={service} relationshipTools={null} />);
  const header = screen
    .getByRole('heading', { name: 'Markets', level: 1 })
    .closest('header')!;
  expect(header.parentElement).toHaveClass(
    'vendor-markets',
    'farmstand-controls',
  );
  const actions = header.querySelector('.workspace-heading-actions')!;
  expect(
    within(actions as HTMLElement)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim()),
  ).toEqual(['Create single date', 'Generate occurrences']);
  fireEvent.click(
    within(header).getByRole('button', { name: 'Generate occurrences' }),
  );
  const dialog = await screen.findByRole('dialog', {
    name: 'Generate occurrences',
  });
  expect(header).not.toContainElement(dialog);
  expect(dialog).toHaveClass('farmstand-controls');
  expect(dialog).toHaveClass('ui-dialog-wide');
  expect(
    within(dialog).getByText('Step 1 of 4 · Market location'),
  ).toBeVisible();
  expect(
    within(dialog)
      .getByRole('heading', { name: 'Choose a market location' })
      .closest('.reward-stage'),
  ).not.toBeNull();
});

it('walks through the shared generator and keeps its success animation until Done', async () => {
  const { service, market, api } = await setup();
  const refresh = vi.fn();
  render(<VendorManagedMarkets service={service} refresh={refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Generate occurrences' }));
  const dialog = await screen.findByRole('dialog', {
    name: 'Generate occurrences',
  });
  fireEvent.change(
    await within(dialog).findByRole('combobox', { name: 'Market' }),
    { target: { value: market.id } },
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await within(dialog).findByText('Step 2 of 4 · Repeating schedules');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await within(dialog).findByText('Step 3 of 4 · Date range');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await within(dialog).findByText('Step 4 of 4 · Review & generate');
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Generate occurrences' }),
  );
  expect(
    await within(dialog).findByRole('heading', {
      name: 'Market dates created',
    }),
  ).toBeVisible();
  expect(dialog.querySelector('.reward-published-check')).not.toBeNull();
  expect(api.generate).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(dialog).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Generate occurrences' }),
    ).toBeNull(),
  );
});

it('keeps a newly saved location when stepping back without creating it twice', async () => {
  const { service, api } = await setup();
  vi.mocked(api.list).mockResolvedValue([]);
  render(<VendorManagedMarkets service={service} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create single date' }));
  const dialog = await screen.findByRole('dialog', {
    name: 'Create a single market date',
  });
  fireEvent.change(
    await within(dialog).findByRole('textbox', { name: 'Market name' }),
    { target: { value: 'Private Saturday market' } },
  );
  fireEvent.change(
    within(dialog).getByRole('textbox', { name: 'Location/address' }),
    { target: { value: '123 Main Plaza' } },
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await within(dialog).findByText('Step 2 of 2 · Market date');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
  await within(dialog).findByText('Step 1 of 2 · Market location');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await within(dialog).findByText('Step 2 of 2 · Market date');
  const override = within(dialog).getByRole('checkbox', { name: 'Use a preorder override' });
  const reveal = dialog.querySelector('.preorder-rule-reveal')!;
  expect(reveal).toHaveAttribute('data-open', 'false');
  expect(reveal.querySelector('fieldset')).toBeDisabled();
  fireEvent.click(override);
  expect(reveal).toHaveAttribute('data-open', 'true');
  expect(reveal.querySelector('fieldset')).not.toBeDisabled();
  fireEvent.click(override);
  expect(reveal).toHaveAttribute('data-open', 'false');
  expect(api.create).toHaveBeenCalledTimes(1);
});
