import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AppError } from '@market/api';
import { routeAllowed, visibleNavigation } from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { CatalogWorkspace } from '../apps/admin/src/vendor/CatalogWorkspace';

function setup() {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.categories = {
    list: vi.fn().mockResolvedValue([
      {
        id: 'vegetables',
        name: 'Vegetables',
        imageAssetId: null,
        image: null,
        productIds: ['1001', '1023'],
        productCount: 2,
      },
      {
        id: 'fruit',
        name: 'Fruit',
        imageAssetId: null,
        image: null,
        productIds: ['1003'],
        productCount: 1,
      },
    ]),
    images: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
  };
  return service;
}

async function loaded() {
  await screen.findByRole('button', {
    name: 'Adjust stock for Synthetic A Product 2',
  });
}

function openStock() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Adjust stock for Synthetic A Product 2',
    }),
  );
  return screen.getByRole('dialog', { name: 'Adjust inventory total' });
}

function review(dialog: HTMLElement, value: string) {
  fireEvent.change(within(dialog).getByLabelText('New on-hand total'), {
    target: { value },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Review adjustment' }),
  );
}

describe('vendor Products & Inventory workspace', () => {
  it.each([
    { quantity: 20, state: 'success' },
    { quantity: 4, state: 'warning' },
    { quantity: 0, state: 'danger' },
  ])('uses the $state stock check indicator', async ({ quantity, state }) => {
    const service = setup();
    const original = service.inventory;
    service.inventory = async (...args) => {
      const page = await original(...args);
      return {
        ...page,
        items: page.items.map((row) => ({ ...row, stockOnHand: quantity })),
      };
    };
    render(<CatalogWorkspace service={service} />);
    await loaded();
    const heading = screen.getByRole('heading', {
      name: 'A little stock check',
    }).parentElement!;
    expect(heading).toHaveClass(`catalog-stock-check-${state}`);
    expect(!!heading.querySelector('svg')).toBe(state === 'success');
  });

  it('opens the product from a row while stock actions remain independent', async () => {
    const service = setup();
    render(<CatalogWorkspace service={service} />);
    await loaded();
    const action = screen.getByRole('button', {
      name: 'Adjust stock for Synthetic A Product 2',
    });
    const row = action.closest('tr')!;
    const link = within(row).getByRole('link', {
      name: 'Synthetic A Product 2',
    });
    const click = vi.spyOn(link, 'click');
    fireEvent.click(row.querySelector('td')!);
    expect(click).toHaveBeenCalledTimes(1);
    fireEvent.click(action);
    expect(click).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('dialog', { name: 'Adjust inventory total' }),
    ).toBeInTheDocument();
    expect(action).not.toHaveClass('button-tertiary');
  });

  it('reuses the existing category editor and refreshes categories after saving', async () => {
    const service = setup();
    vi.mocked(service.categories!.save).mockResolvedValue({
      id: 'pantry',
      name: 'Pantry',
      imageAssetId: null,
      image: null,
      productIds: [],
      productCount: 0,
    });
    render(<CatalogWorkspace service={service} />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const dialog = screen.getByRole('dialog', { name: 'Create category' });
    fireEvent.change(within(dialog).getByLabelText('Category name'), {
      target: { value: 'Pantry' },
    });
    await waitFor(() =>
      expect(
        dialog.querySelector('input[name="categoryImagePending"]'),
      ).toHaveValue('false'),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create category' }),
    );
    await waitFor(() =>
      expect(service.categories!.save).toHaveBeenCalledWith({
        name: 'Pantry',
        imageAssetId: null,
        productIds: [],
      }),
    );
    await waitFor(() =>
      expect(service.categories!.list).toHaveBeenCalledTimes(2),
    );
  });

  it('resolves the actual featured photograph beyond the first asset-library page', async () => {
    const service = setup();
    const original = service.catalog;
    service.catalog = async (search, skip) => {
      const result = await original(search, skip);
      return {
        ...result,
        items: result.items.map((product) =>
          product.id === '1001'
            ? { ...product, assetIds: ['featured'] }
            : product,
        ),
      };
    };
    vi.mocked(service.categories!.images).mockImplementation(
      async (skip = 0) =>
        skip
          ? [
              {
                id: 'featured',
                name: 'Featured photo',
                preview: '/assets/featured-photo.png',
              },
            ]
          : Array.from({ length: 100 }, (_, index) => ({
              id: String(index),
              name: 'Library photo',
              preview: '/assets/other.png',
            })),
    );
    render(<CatalogWorkspace service={service} />);
    await loaded();
    await waitFor(() =>
      expect(service.categories!.images).toHaveBeenCalledWith(100),
    );
    await waitFor(() =>
      expect(
        document.querySelector('.catalog-product-photo img'),
      ).toHaveAttribute('src', '/assets/featured-photo.png'),
    );
  });

  it('combines real paged reads, variant actions, category filters and SKU search', async () => {
    const service = setup();
    const catalog = vi.spyOn(service, 'catalog');
    const inventory = vi.spyOn(service, 'inventory');
    render(<CatalogWorkspace service={service} />);
    await loaded();
    expect(catalog).toHaveBeenCalledWith('', 20);
    expect(inventory).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Products & Inventory',
    );
    expect(
      screen.queryByRole('button', { name: 'Export' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: '22 in stock, 0 low stock, 1 out of stock',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Adjust stock for Synthetic A Product 1 Synthetic A Family box',
      }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'SYN-1-23' },
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      2,
    );
    expect(
      screen.getByRole('link', { name: 'Synthetic A Product 23' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter by category'), {
      target: { value: 'fruit' },
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      2,
    );
    expect(
      screen.getByRole('link', { name: 'Synthetic A Product 3' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by stock'), {
      target: { value: 'in' },
    });
    expect(screen.getByText('No matching products')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Manage categories' }),
    ).toHaveAttribute('href', '/vendor/categories');
  });

  it('keeps one dialog and the draft when going back, then saves only after confirmation', async () => {
    const service = setup();
    const adjust = vi.spyOn(service, 'adjust');
    const restock = vi.spyOn(service, 'restock');
    render(<CatalogWorkspace service={service} />);
    await loaded();
    expect(
      screen.queryByRole('button', { name: /^Restock / }),
    ).not.toBeInTheDocument();
    const dialog = openStock();
    expect(within(dialog).getAllByRole('heading')).toHaveLength(1);
    expect(
      dialog.querySelectorAll('.catalog-stock-cards .ui-card'),
    ).toHaveLength(3);
    fireEvent.focus(
      within(dialog).getByRole('button', { name: 'About inventory values' }),
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Available: stock left after allocations and active checkout holds.',
    );
    const input = within(dialog).getByLabelText('New on-hand total');
    expect(input).toHaveValue(50);
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Increase new on-hand total',
      }),
    );
    expect(input).toHaveValue(51);
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Decrease new on-hand total',
      }),
    );
    expect(input).toHaveValue(50);
    review(dialog, '57');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Confirm adjust stock' })).toBe(
      dialog,
    );
    expect(
      within(dialog).getByText('On hand amount: 50 → 57'),
    ).toBeInTheDocument();
    expect(adjust).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('dialog', { name: 'Adjust inventory total' })).toBe(
      dialog,
    );
    expect(within(dialog).getByLabelText('New on-hand total')).toHaveValue(57);
    review(dialog, '56');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm change' }),
    );
    await waitFor(() =>
      expect(adjust).toHaveBeenCalledWith({
        operationKey: expect.any(String),
        variantId: '1102',
        quantity: 6,
      }),
    );
    expect(await screen.findByRole('dialog', { name: 'Stock updated' })).toBe(
      dialog,
    );
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Inventory total updated.',
    );
    expect(restock).not.toHaveBeenCalled();
  });

  it('shows saving in the same dialog, prevents duplicate writes and guards dismissal', async () => {
    const service = setup();
    let finish!: () => void;
    const original = service.adjust;
    const adjust = vi
      .spyOn(service, 'adjust')
      .mockImplementation(async (input) => {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        return original(input);
      });
    render(<CatalogWorkspace service={service} />);
    await loaded();
    const dialog = openStock();
    review(dialog, '55');
    const confirm = within(dialog).getByRole('button', {
      name: 'Confirm change',
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(adjust).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Updating stock' })).toBe(dialog);
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Saving stock',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Close' }),
    ).toBeDisabled();
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog).toHaveAttribute('open');
    finish();
    expect(await screen.findByRole('dialog', { name: 'Stock updated' })).toBe(
      dialog,
    );
  });

  it('discards an unconfirmed draft on dismissal and never writes an unchanged total', async () => {
    const service = setup();
    const adjust = vi.spyOn(service, 'adjust');
    render(<CatalogWorkspace service={service} />);
    await loaded();
    let dialog = openStock();
    review(dialog, '100');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(adjust).not.toHaveBeenCalled();
    dialog = openStock();
    expect(within(dialog).getByLabelText('New on-hand total')).toHaveValue(50);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Review adjustment' }),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm change' }),
    );
    await screen.findByRole('dialog', { name: 'Stock updated' });
    expect(adjust).not.toHaveBeenCalled();
  });

  it('shows a failure result without enabling an unsafe retry after an uncertain outcome', async () => {
    const service = setup();
    const adjust = vi
      .spyOn(service, 'adjust')
      .mockRejectedValue(new AppError('network'));
    render(<CatalogWorkspace service={service} />);
    await loaded();
    const dialog = openStock();
    review(dialog, '51');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm change' }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Stock update failed' }),
    ).toBe(dialog);
    expect(
      dialog.querySelector('.catalog-stock-result-error svg'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The command outcome is unconfirmed/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Confirm change' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Back' }),
    ).not.toBeInTheDocument();
    expect(adjust).toHaveBeenCalledTimes(1);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Check current records' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('accepts a zero stocktake total, confirms it, and translates it into the existing signed command', async () => {
    const service = setup();
    const adjust = vi.spyOn(service, 'adjust');
    render(<CatalogWorkspace service={service} />);
    await loaded();
    const dialog = openStock();
    review(dialog, '0');
    expect(adjust).not.toHaveBeenCalled();
    const confirmation = screen.getByRole('dialog', {
      name: 'Confirm adjust stock',
    });
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Confirm change' }),
    );
    await waitFor(() =>
      expect(adjust).toHaveBeenCalledWith({
        operationKey: expect.any(String),
        variantId: '1102',
        quantity: -50,
      }),
    );
  });

  it('requires a fresh review when the count changed while the stocktake dialog was open', async () => {
    const service = setup();
    const adjust = vi.spyOn(service, 'adjust');
    render(<CatalogWorkspace service={service} />);
    await loaded();
    const dialog = openStock();
    fireEvent.change(within(dialog).getByLabelText('New on-hand total'), {
      target: { value: '25' },
    });
    await service.restock({
      operationKey: 'another-operator',
      variantId: '1102',
      quantity: 10,
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Review adjustment' }),
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Confirm adjust stock' }),
      ).getByRole('button', { name: 'Confirm change' }),
    );
    await screen.findByRole('button', { name: 'Check current records' });
    expect(adjust).not.toHaveBeenCalled();
    expect(
      (await service.inventory('1')).items.find(
        (row) => row.variantId === '1102',
      )?.stockOnHand,
    ).toBe(60);
  });

  it('keeps catalog and inventory permissions independent and the old inventory URL useful', async () => {
    const service = setup();
    service.context = {
      ...service.context,
      membershipRole: 'staff',
      permissions: ['ReadOwnInventory'],
    };
    const catalog = vi.spyOn(service, 'catalog');
    render(<CatalogWorkspace service={service} />);
    await screen.findByText('Showing 1 to 20 of 23 products');
    expect(catalog).not.toHaveBeenCalled();
    expect(service.categories!.list).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('link', { name: 'Add product' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Adjust stock / }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Synthetic A Product 1' }),
    ).not.toBeInTheDocument();
    expect(
      visibleNavigation(service.context).find(
        (item) => item.path === '/vendor/products',
      )?.label,
    ).toBe('Products & Inventory');
    expect(
      visibleNavigation(service.context).some(
        (item) => item.path === '/vendor/inventory',
      ),
    ).toBe(false);
    expect(routeAllowed(service.context, '/vendor/inventory')).toBe(true);
    expect(routeAllowed(service.context, '/vendor/products')).toBe(true);
    expect(routeAllowed(service.context, '/vendor/products/1001')).toBe(false);
  });

  it('does not turn missing inventory into zero stock or offer stock writes after a failed read', async () => {
    const service = setup();
    vi.spyOn(service, 'inventory').mockRejectedValue(
      new AppError('unavailable'),
    );
    render(<CatalogWorkspace service={service} />);
    await screen.findByText('Inventory could not be loaded.');
    await screen.findAllByRole('link', { name: 'Synthetic A Product 1' });
    expect(
      screen.queryByRole('button', { name: /^Adjust stock / }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filter by stock')).toBeDisabled();
    expect(
      screen.queryByText('Your stock is ready for your next market.'),
    ).not.toBeInTheDocument();
  });
});
