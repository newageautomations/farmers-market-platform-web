import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckoutTotals,
  OrderTotals,
} from '../apps/storefront/src/components/CartTotals';
import type { CheckoutView } from '@market/api';

const rows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('dl > div')).map((row) => [
    row.querySelector('dt')!.textContent,
    row.querySelector('dd')!.textContent,
  ]);

describe('order summary totals', () => {
  it('shows Subtotal, Tax, Preorder fee and Total due that add up', () => {
    // $20.00 of goods less a $2.00 discount, $1.00 pickup fee, $1.57 tax and
    // a $0.75 fee: the discount and pickup fee stay inside Subtotal.
    const { container } = render(
      <OrderTotals total={2032} tax={157} preorderFee={75} currency="USD" />,
    );
    expect(rows(container)).toEqual([
      ['Subtotal', '$18.00'],
      ['Tax', '$1.57'],
      ['Preorder fee', '$0.75'],
      ['Total due', '$20.32'],
    ]);
  });

  it('leaves out Tax when there is none and says when the fee is not quoted yet', () => {
    const { container } = render(
      <OrderTotals total={1800} tax={0} preorderFee={null} currency="USD" />,
    );
    expect(rows(container)).toEqual([
      ['Subtotal', '$18.00'],
      ['Preorder fee', 'Calculated at payment'],
      ['Total due', '$18.00'],
    ]);
  });

  it('adds every checkout tax into one row and takes the quoted fee', () => {
    const view = {
      total: 2032,
      currency: 'USD',
      taxes: [
        { name: 'State', total: 120 },
        { name: 'City', total: 37 },
      ],
      preorderFee: { quoteId: '1', total: 2032, preorderFee: 75, vendors: [] },
    } as unknown as CheckoutView;
    render(<CheckoutTotals view={view} />);
    const list = screen.getByText('Tax').closest('dl')!;
    expect(within(list).getByText('$1.57')).toBeTruthy();
    expect(within(list).getByText('$18.00')).toBeTruthy();
    expect(within(list).queryByText(/State|City|included/)).toBeNull();
  });
});
