import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Products } from '../apps/admin/src/vendor/catalog';
import {
  parseTaxPercent,
  VendorTaxSettings,
} from '../apps/admin/src/vendor/tax';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createVendorApi } from '@market/api';

describe('Vendor configured tax controls', () => {
  it('preserves an omitted override in the API request when collection is disabled', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { updateOwnCatalogProduct: { id: '1' } } }),
        ),
      );
    try {
      await createVendorApi({
        endpoint: 'http://localhost:3000/admin-api',
        channelToken: 'fixture-vendor',
      }).updateProduct('1', {
        name: 'Fixture',
        slug: 'fixture',
        description: '',
        enabled: true,
        collectTaxes: false,
      });
      const input = JSON.parse(String(fetcher.mock.calls[0]![1]!.body))
        .variables.input;
      expect(input.collectTaxes).toBe(false);
      expect(input).not.toHaveProperty('taxOverride');
    } finally {
      fetcher.mockRestore();
    }
  });
  it.each([
    '-1',
    'Infinity',
    'NaN',
    '1e1',
    '8.25%',
    '8.255',
    '100.01',
    '',
    '4abc',
  ])('rejects malformed or out of range %s', (value) => {
    expect(() => parseTaxPercent(value)).toThrow();
  });
  it('distinguishes zero from missing and accepts ordinary percentages', () => {
    expect(parseTaxPercent('0')).toBe(0);
    expect(parseTaxPercent('8.25')).toBe(8.25);
    expect(parseTaxPercent('100')).toBe(100);
  });
  it('saves an override while tax collection is disabled', async () => {
    const service = createFixtureVendorService(fixtureContexts.VENDOR);
    const create = vi.spyOn(service, 'createProduct');
    render(<Products service={service} id="new" />);
    await screen.findByLabelText('Collect taxes');
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Tax fixture' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'tax-fixture' },
    });
    const details = screen.getByText('Advanced Settings').closest('details')!;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText('Advanced Settings'));
    expect(details.open).toBe(true);
    fireEvent.click(screen.getByLabelText('Override tax rate'));
    fireEvent.change(screen.getByLabelText('Custom rate (%)'), {
      target: { value: '6.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ collectTaxes: false, taxOverride: 6.5 }),
      ),
    );
  });
  it('retains saved zero override and can disable it', async () => {
    const service = createFixtureVendorService(fixtureContexts.VENDOR);
    const product = (await service.catalog('', 0)).items[0]!;
    vi.spyOn(service, 'product').mockResolvedValue({
      ...product,
      collectTaxes: true,
      taxOverride: 0,
      taxConfigured: true,
    });
    const update = vi.spyOn(service, 'updateProduct');
    render(<Products service={service} id={product.id} />);
    expect(await screen.findByLabelText('Collect taxes')).toBeChecked();
    expect(screen.getByLabelText('Override tax rate')).toBeChecked();
    expect(screen.getByLabelText('Custom rate (%)')).toHaveValue(0);
    fireEvent.click(screen.getByLabelText('Override tax rate'));
    expect(screen.queryByLabelText('Custom rate (%)')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]!);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        product.id,
        expect.objectContaining({ collectTaxes: true, taxOverride: null }),
      ),
    );
  });
  it('saves default and market-specific rates with optimistic version', async () => {
    const service = createFixtureVendorService(fixtureContexts.VENDOR);
    vi.spyOn(service, 'taxSettings').mockResolvedValue({
      version: 3,
      defaultRate: 8.25,
      newProductCollectTaxes: true,
      markets: [{ id: '17', name: 'Fixture market', rate: null }],
    });
    const save = vi.spyOn(service, 'saveTaxSettings');
    render(<VendorTaxSettings service={service} />);
    fireEvent.change(
      await screen.findByLabelText('Fixture market tax rate (%)'),
      { target: { value: '6.50' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save tax settings' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        version: 3,
        defaultRate: 8.25,
        markets: [{ marketId: '17', rate: 6.5 }],
      }),
    );
  });
  it('retains an existing override when collection is unchecked', async () => {
    const service = createFixtureVendorService(fixtureContexts.VENDOR);
    const product = (await service.catalog('', 0)).items[0]!;
    vi.spyOn(service, 'product').mockResolvedValue({
      ...product,
      collectTaxes: true,
      taxOverride: 6.5,
      taxConfigured: true,
    });
    const update = vi.spyOn(service, 'updateProduct');
    render(<Products service={service} id={product.id} />);
    fireEvent.click(await screen.findByLabelText('Collect taxes'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]!);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        product.id,
        expect.objectContaining({ collectTaxes: false, taxOverride: 6.5 }),
      ),
    );
  });
  it('preserves legacy tax configuration during unrelated metadata edits', async () => {
    const service = createFixtureVendorService(fixtureContexts.VENDOR);
    const product = (await service.catalog('', 0)).items[0]!;
    const update = vi.spyOn(service, 'updateProduct');
    render(<Products service={service} id={product.id} />);
    await screen.findByLabelText('Collect taxes');
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]!);
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]![1]).not.toHaveProperty('collectTaxes');
    expect(update.mock.calls[0]![1]).not.toHaveProperty('taxOverride');
  });
});
