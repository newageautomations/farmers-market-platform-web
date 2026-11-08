import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { CloverIntegration, InPersonApi, PosSale } from '@market/api';
import {
  CloverOAuthReturn,
  CloverPaymentIntegration,
} from '../apps/admin/src/vendor/clover';
import type { VendorService } from '../apps/admin/src/vendor/service';
import { PosSaleDetails } from '../apps/admin/src/vendor/pos-payments';

function fixture() {
  const data: CloverIntegration = {
    configured: true,
    environment: 'Sandbox',
    qualification: 'CONTROLLED_TEST',
    remoteAppConfigured: true,
    applicationId: 'controlled-clover-app',
    connection: null,
    devices: [],
  };
  const connected = {
    ...data,
    connection: {
      id: 'connection',
      merchantId: 'merchant',
      merchant: 'Controlled merchant',
      status: 'CONNECTED',
    },
  };
  const clover = {
    finish: vi.fn(async () => connected),
    settings: vi.fn(async () => data),
    begin: vi.fn(async () => ({
      url: 'https://sandbox.dev.clover.com/oauth/v2/authorize',
      controlledState: 'state',
    })),
    complete: vi.fn(async () => connected),
    disconnect: vi.fn(async () => data),
    addDevice: vi.fn(async () => ({
      ...connected,
      devices: [
        {
          id: 'device',
          label: 'Counter',
          serial: 'CONTROLLED_FLEX_2',
          model: 'Clover Flex 2',
          isDefault: false,
          status: 'UNVERIFIED',
          availability: 'UNVERIFIED',
          checkedAt: null,
        },
      ],
    })),
    device: vi.fn(async () => connected),
    control: vi.fn(),
    cancel: vi.fn(),
  };
  return { data, connected, clover, api: { clover } as unknown as InPersonApi };
}
describe('Clover payment integration', () => {
  it('finishes the opaque callback once with the existing session and clears the URL', async () => {
    const f = fixture();
    window.history.replaceState(
      null,
      '',
      '/vendor/settings/clover-return?state=controlled-pending-state',
    );
    render(
      <StrictMode>
        <CloverOAuthReturn service={{ pos: f.api } as VendorService} />
      </StrictMode>,
    );
    await screen.findByText(/Clover merchant authorization verified/);
    expect(f.clover.finish).toHaveBeenCalledExactlyOnceWith(
      'controlled-pending-state',
    );
    expect(f.clover.complete).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(
      screen.getByRole('link', { name: 'Return to Payments settings' }),
    ).toHaveAttribute('href', '/vendor/settings/payments');
  });
  it('rejects missing state without invoking merchant connection APIs', async () => {
    const f = fixture();
    window.history.replaceState(null, '', '/vendor/settings/clover-return');
    render(<CloverOAuthReturn service={{ pos: f.api } as VendorService} />);
    await screen.findByText(/Clover did not return a complete authorization/);
    expect(f.clover.finish).not.toHaveBeenCalled();
    expect(f.clover.complete).not.toHaveBeenCalled();
  });
  it('shows the safe server rejection when state is expired, replayed or belongs to another session', async () => {
    const f = fixture();
    const { PosInputError } = await import('@market/api');
    f.clover.finish.mockRejectedValue(
      new PosInputError(
        'Clover authorization return is unavailable in this session. Connect again',
      ),
    );
    window.history.replaceState(
      null,
      '',
      '/vendor/settings/clover-return?state=controlled-unavailable-state',
    );
    render(<CloverOAuthReturn service={{ pos: f.api } as VendorService} />);
    await screen.findByText(/unavailable in this session/);
    expect(
      screen.queryByText(/authorization verified/),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
  it('labels controlled authorization separately and preserves server-bound OAuth state', async () => {
    const f = fixture(),
      user = userEvent.setup();
    render(<CloverPaymentIntegration api={f.api} />);
    await user.click(
      await screen.findByRole('button', {
        name: 'Connect Clover controlled test',
      }),
    );
    await screen.findByText('Controlled merchant · merchant');
    expect(f.clover.complete).toHaveBeenCalledWith(
      'state',
      expect.any(String),
      'controlled-honey-merchant',
      'controlled-clover-app',
    );
    expect(
      screen.getByText(/No Clover account is authorized/),
    ).toBeInTheDocument();
  });
  it('uses shared device dialog and verifies actual serial through the API', async () => {
    const f = fixture(),
      user = userEvent.setup();
    f.clover.settings.mockResolvedValue(f.connected);
    render(<CloverPaymentIntegration api={f.api} />);
    await user.click(
      await screen.findByRole('button', { name: 'Add Clover device' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Add Clover device' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register Clover device' }),
    ).toBeDisabled();
    await user.type(screen.getByLabelText('Friendly device label'), 'Counter');
    await user.click(
      screen.getByRole('button', { name: 'Register Clover device' }),
    );
    await screen.findByText('Availability unverified');
    expect(f.clover.addDevice).toHaveBeenCalledWith({
      key: expect.any(String),
      serial: 'CONTROLLED_FLEX_2',
      label: 'Counter',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps failed registration editable and shows backend guidance', async () => {
    const f = fixture(),
      user = userEvent.setup();
    f.clover.settings.mockResolvedValue(f.connected);
    const { PosInputError } = await import('@market/api');
    f.clover.addDevice.mockRejectedValue(
      new PosInputError('Device belongs to another merchant'),
    );
    render(<CloverPaymentIntegration api={f.api} />);
    await user.click(
      await screen.findByRole('button', { name: 'Add Clover device' }),
    );
    await user.type(screen.getByLabelText('Friendly device label'), 'Counter');
    await user.click(
      screen.getByRole('button', { name: 'Register Clover device' }),
    );
    await waitFor(() =>
      expect(
        screen.getAllByText('Device belongs to another merchant').length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('requires explicit disconnect action inside the shared dialog', async () => {
    const f = fixture(),
      user = userEvent.setup();
    f.clover.settings.mockResolvedValue(f.connected);
    render(<CloverPaymentIntegration api={f.api} />);
    await user.click(
      await screen.findByRole('button', { name: 'Disconnect Clover' }),
    );
    expect(f.clover.disconnect).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Keep connection' }));
    expect(f.clover.disconnect).not.toHaveBeenCalled();
  });
  it('reports missing application configuration without showing connection controls', async () => {
    const f = fixture();
    f.clover.settings.mockResolvedValue({ ...f.data, configured: false });
    render(<CloverPaymentIntegration api={f.api} />);
    await screen.findByText(/Clover needs backend configuration/);
    expect(
      screen.queryByRole('button', { name: 'Connect Clover controlled test' }),
    ).not.toBeInTheDocument();
  });
  it('keeps Clover receipts distinct from cash and the Stage B simulator', () => {
    const sale = {
      id: 'sale',
      orderCode: 'ABC',
      vendor: 'Honey',
      state: 'COMPLETED',
      method: 'CLOVER',
      evidenceType: 'CLOVER_CONTROLLED_TEST',
      confirmedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      customer: 'Anonymous customer',
      context: { label: 'Independent' },
      amount: 100,
      currency: 'USD',
      subtotal: 100,
      tax: 0,
      discount: 0,
      tendered: null,
      changeDue: null,
      items: [],
      units: [],
      refunds: [],
      clover: {
        merchantId: 'merchant',
        paymentId: 'payment',
        externalPaymentId: 'external',
        deviceLabel: 'Counter',
        status: 'SUCCEEDED',
        environment: 'Sandbox',
      },
    } as unknown as PosSale;
    render(<PosSaleDetails sale={sale} />);
    expect(screen.getByText('Clover controlled test only')).toBeInTheDocument();
    expect(screen.getByText(/Clover merchant merchant/)).toBeInTheDocument();
    expect(
      screen.queryByText('Simulated Terminal - Test Only'),
    ).not.toBeInTheDocument();
  });
});
