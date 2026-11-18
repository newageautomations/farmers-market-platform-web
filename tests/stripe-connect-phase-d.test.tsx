import { PurchaseSuccess } from '../apps/storefront/src/components/PurchaseSuccess';
import { Success } from '../apps/storefront/src/components/modern-farmhouse/Success';
import { CartTotals } from '../apps/storefront/src/components/CartTotals';
import type { PublicCart } from '@market/api';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreorderFeeSettings } from '../apps/admin/src/settings/PreorderFeeSettings';
import type { VendorService } from '../apps/admin/src/vendor/service';
import { CheckoutSummary } from '../apps/storefront/src/components/Checkout';
import { Summary } from '../apps/storefront/src/components/modern-farmhouse/Checkout';
import type { CheckoutView } from '@market/api';

function fixture(mode = 'AUTOMATIC', customAmount = 0) {
  let settings = {
    mode,
    customAmount,
    customPercentageBps: 0,
    currency: 'USD',
    version: 0,
    editable: true,
    maxCustomAmount: 10000,
    platformPercent: 5,
    example: { platform: 500, recovery: 345, preorderFee: 845, total: 10845 },
  };
  return {
    vendorId: '7',
    preorderFeeSettings: vi.fn(async () => settings),
    savePreorderFeeSettings: vi.fn(async (input) => {
      settings = {
        ...settings,
        ...input,
        customAmount: Math.round(Number(input.customAmount) * 100),
        customPercentageBps: Math.round(
          Number(input.customPercentage ?? 0) * 100,
        ),
        version: settings.version + 1,
      };
      return settings;
    }),
  } as unknown as VendorService;
}
/** Reads one row of the fee example's label/value list. */
const fact = (label: string, value: string) =>
  waitFor(() =>
    expect(
      screen.getByText(label, { selector: 'dt' }).nextElementSibling,
    ).toHaveTextContent(value),
  );
describe('Phase D preorder fees', () => {
  it('previews and saves a custom percentage while retaining the 5% platform fee', async () => {
    const service = fixture(),
      user = userEvent.setup();
    render(<PreorderFeeSettings service={service} />);
    await user.click(
      await screen.findByRole('radio', { name: 'Custom percentage' }),
    );
    const field = screen.getByLabelText('Your processing recovery (%)');
    await user.clear(field);
    await user.type(field, '2.50');
    await fact('Final customer charge', '$107.50');
    await user.click(
      screen.getByRole('button', { name: 'Save online payment fee settings' }),
    );
    await waitFor(() =>
      expect(service.savePreorderFeeSettings).toHaveBeenCalledWith({
        mode: 'PERCENTAGE',
        customAmount: '0.00',
        customPercentage: '2.5',
        currency: 'USD',
        version: 0,
      }),
    );
    expect(
      await screen.findByRole('radio', { name: 'Custom percentage' }),
    ).toBeChecked();
  });
  it('keeps restricted settings read-only without a save action', async () => {
    const service = fixture();
    vi.mocked(service.preorderFeeSettings).mockResolvedValue({
      ...(await service.preorderFeeSettings()),
      editable: false,
    });
    render(<PreorderFeeSettings service={service} />);
    expect(
      await screen.findByRole('radio', { name: /Automatically/ }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', {
        name: 'Save online payment fee settings',
      }),
    ).toBeNull();
  });
  it.each(['Preorder fee', 'Online payment fee'])(
    'combines historical/current %s rows without changing cart amounts',
    (description) => {
      const cart = {
        subTotalWithTax: 20000,
        shippingWithTax: 0,
        totalWithTax: 21790,
        currencyCode: 'USD',
        discounts: [],
        taxSummary: [],
        surcharges: [
          { description, priceWithTax: 845 },
          { description: 'Preorder fee', priceWithTax: 845 },
          { description: 'Other fee', priceWithTax: 100 },
        ],
      } as unknown as PublicCart;
      render(<CartTotals cart={cart} />);
      expect(screen.getAllByText('Online payment fee')).toHaveLength(1);
      expect(screen.getByText('$16.90')).toBeInTheDocument();
      expect(screen.getByText('Other fee')).toBeInTheDocument();
      expect(screen.getByText('$1.00')).toBeInTheDocument();
      expect(screen.queryByText('Preorder fee')).toBeNull();
      expect(cart.surcharges[0]?.description).toBe(description);
      expect(screen.getByText('$217.90')).toBeInTheDocument();
    },
  );

  it('defaults to automatic, previews the fixed platform fee and saves custom zero', async () => {
    const service = fixture(),
      user = userEvent.setup();
    render(<PreorderFeeSettings service={service} />);
    expect(
      await screen.findByRole('radio', { name: /Automatically/ }),
    ).toBeChecked();
    await fact('Final customer charge', '$108.45');
    expect(screen.queryByLabelText(/Platform fee/)).toBeNull();
    expect(screen.getByText(/Customers will see one/)).toHaveTextContent(
      'Online payment fee',
    );
    await fact('Online payment fee', '$8.45');
    await user.click(
      screen.getByRole('radio', { name: 'Custom fixed amount' }),
    );
    const field = screen.getByLabelText('Your processing recovery (USD)');
    await user.clear(field);
    await user.type(field, '0.00');
    await user.click(
      screen.getByRole('button', { name: 'Save online payment fee settings' }),
    );
    await waitFor(() =>
      expect(service.savePreorderFeeSettings).toHaveBeenCalledWith({
        mode: 'CUSTOM',
        customAmount: '0.00',
        customPercentage: '0.00',
        currency: 'USD',
        version: 0,
      }),
    );
    await fact('Final customer charge', '$105.00');
  });
  it('switches a saved custom preference back to the standard automatic preview', async () => {
    const user = userEvent.setup();
    render(<PreorderFeeSettings service={fixture('CUSTOM', 150)} />);
    await fact('Final customer charge', '$106.50');
    await user.click(screen.getByRole('radio', { name: /Automatically/ }));
    await fact('Final customer charge', '$108.45');
    expect(
      screen.queryByLabelText(/Your processing recovery \(USD\)/),
    ).toBeNull();
  });
  it.each([CheckoutSummary, Summary, PurchaseSuccess, Success])(
    'shows authoritative vendor and combined fees without adding them twice',
    (Component) => {
      const view = {
        currency: 'USD',
        committed: true,
        code: 'TEST',
        paymentStatus: 'SUCCEEDED',
        groups: [
          {
            vendorId: '7',
            vendorName: 'Fixture vendor',
            lines: [],
            pickup: [],
          },
        ],
        pickupPromise: {},
        discounts: [],
        taxes: [],
        subtotal: 10000,
        shipping: 0,
        total: 10845,
        preorderFee: {
          quoteId: '1',
          total: 10845,
          preorderFee: 845,
          vendors: [
            {
              vendorId: '7',
              platform: 500,
              recovery: 345,
              feeTax: 0,
              preorderFee: 845,
              total: 10845,
            },
          ],
        },
      } as unknown as CheckoutView;
      render(<Component view={view} storefrontId="fixture" />);
      expect(screen.getByText('Online payment fee: $8.45')).toBeInTheDocument();
      expect(screen.getByText('Online payment fee')).toBeInTheDocument();
      expect(screen.queryByText('Preorder fee')).toBeNull();
      expect(screen.getByText('$108.45')).toBeInTheDocument();
    },
  );
});
