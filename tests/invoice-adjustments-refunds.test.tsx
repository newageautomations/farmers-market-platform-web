import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BoothInvoice } from '@market/api';
import { Invoice } from '../apps/admin/src/market/phase14/Billing';

const invoice = (): BoothInvoice => ({
  id: 17,
  marketId: 2,
  revision: 3,
  assignmentId: 4,
  occurrenceId: 5,
  directoryId: 6,
  status: 'OPEN',
  totalMinor: 10000,
  paidMinor: 4000,
  currency: 'USD',
  dueAt: null,
  recipientSnapshot: { businessName: 'Orchard' } as any,
  lines: [
    {
      description: 'Booth',
      quantity: 1,
      unitMinor: 8000,
      lineMinor: 8000,
      currency: 'USD',
    },
    {
      description: 'Table',
      quantity: 1,
      unitMinor: 2000,
      lineMinor: 2000,
      currency: 'USD',
    },
  ],
});
const payments = [
  {
    id: 8,
    invoiceId: 17,
    amountMinor: 4000,
    currency: 'USD',
    method: 'CASH',
    paidAt: '2026-11-10T15:00:00Z',
  },
];
describe('Invoice amendments and refunds', () => {
  it('reviews a reduction after partial payment and requires explicit confirmation', async () => {
    const user = userEvent.setup(),
      run = vi.fn(async () => ({ id: 1 }));
    render(
      <Invoice invoice={invoice()} payments={payments} run={run} canManage />,
    );
    await user.click(screen.getByRole('button', { name: 'Open invoice' }));
    await user.click(screen.getByRole('button', { name: 'Adjust' }));
    await user.selectOptions(screen.getByLabelText('Change'), 'decrease');
    await user.clear(screen.getByLabelText('Adjustment amount'));
    await user.type(screen.getByLabelText('Adjustment amount'), '20');
    await user.type(
      screen.getByLabelText('Reason and charge description'),
      'Remove table rental',
    );
    expect(
      screen.getByRole('button', { name: 'Confirm adjustment' }),
    ).toBeDisabled();
    await user.click(screen.getByLabelText('I authorize this invoice change'));
    await user.click(
      screen.getByRole('button', { name: 'Confirm adjustment' }),
    );
    expect(await screen.findByText('Invoice adjusted')).toBeInTheDocument();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADJUST_INVOICE',
        expectedRevision: 3,
        data: expect.objectContaining({
          amountMinor: -2000,
          reason: 'Remove table rental',
        }),
      }),
    );
  });
  it('previews offline refunds without claiming funds were returned and requires attestation', async () => {
    const user = userEvent.setup(),
      run = vi.fn(async (c: any) =>
        c.action === 'PREVIEW_INVOICE_REFUND'
          ? {
              shares: {
                principal: 4000,
                platform: 0,
                recovery: 0,
                feeTax: 0,
                gross: 4000,
              },
            }
          : { id: 1 },
      );
    render(
      <Invoice invoice={invoice()} payments={payments} run={run} canManage />,
    );
    await user.click(screen.getByRole('button', { name: 'Open invoice' }));
    await user.click(screen.getByRole('button', { name: 'Refund payment' }));
    await user.selectOptions(screen.getByLabelText('Original payment'), '8');
    await user.clear(screen.getByLabelText('Amount to refund'));
    await user.type(screen.getByLabelText('Amount to refund'), '40');
    await user.type(screen.getByLabelText('Reason'), 'Returned in cash');
    await user.click(screen.getByRole('button', { name: 'Review refund' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Confirm $40.00 refund' }),
      ).toBeDisabled(),
    );
    expect(run).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByLabelText(
        'I confirm the money was returned using the original payment method',
      ),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirm $40.00 refund' }),
    );
    expect(await screen.findByText('Refund recorded')).toBeInTheDocument();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'REFUND_PAYMENT',
        data: expect.objectContaining({
          paymentId: 8,
          amountMinor: 4000,
          fundsReturned: true,
          method: 'CASH',
          confirmed: true,
        }),
      }),
    );
  });
  it('keeps vendor views read-only and shows pending history honestly', () => {
    const i = invoice();
    i.refunds = [
      {
        id: 1,
        paymentId: 8,
        amountMinor: 1000,
        method: 'STRIPE',
        reason: 'Correction',
        state: 'CUSTOMER_RETURNED',
        reviewCode: 'INVOICE_REFUND_RECONCILIATION_REQUIRED',
        createdAt: '2026-11-10T15:00:00Z',
        returnedAt: '2026-11-10T15:00:00Z',
        shares: {
          principal: 1000,
          platform: 50,
          recovery: 35,
          feeTax: 0,
          gross: 1085,
        },
      },
    ];
    render(
      <Invoice
        invoice={i}
        payments={payments}
        run={vi.fn()}
        canManage={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }));
    expect(
      screen.queryByRole('button', { name: 'Refund payment' }),
    ).not.toBeInTheDocument();
    const history = screen.getByRole('list', {
      name: 'Invoice history, newest first',
      hidden: true,
    });
    expect(history).toHaveTextContent('requires reconciliation');
    expect(history).toHaveTextContent('pending verification');
  });
  it('blocks conflicting actions during unresolved refund operations', () => {
    const i = invoice();
    i.refunds = [
      {
        id: 1,
        paymentId: 8,
        amountMinor: 1000,
        method: 'CASH',
        reason: 'Pending',
        state: 'PENDING',
        reviewCode: null,
        createdAt: '2026-11-10T15:00:00Z',
        returnedAt: '2026-11-10T15:00:00Z',
        shares: {
          principal: 1000,
          platform: 0,
          recovery: 0,
          feeTax: 0,
          gross: 1000,
        },
      },
    ];
    render(<Invoice invoice={i} payments={payments} run={vi.fn()} canManage />);
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }));
    expect(
      screen.getByText(/Changes and new payments are unavailable/),
    ).toBeInTheDocument();
    for (const name of ['Adjust', 'Refund payment', 'Record payment'])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });
});
