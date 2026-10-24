import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  nativeHandoffId,
  nativePaymentStatus,
  type NativeCheckout,
  type InPersonApi,
  type PosDraft,
} from '@market/api';
import {
  CompanionController,
  type NativeReaderPort,
} from '../mobile/core/controller';
import { squarePaymentTerms } from '../mobile/core/square-request';
import { cloverGoRequest } from '../mobile/core/clover-request';
import { PosPaymentDialog } from '../apps/admin/src/vendor/pos-payments';
import { nativeTokens } from '../scripts/native-tokens';
import tokens from '../mobile/companion/src/design-tokens.json';
import { NativePlatformClient } from '../mobile/companion/src/api';

const id = 'bd43e0e1-c318-4cd0-93f2-b0c39f9e11ab';
const checkout = {
  handoffId: id,
  attemptId: 'attempt',
  method: 'SQUARE_MOBILE',
  merchant: {
    connectionId: 'connection',
    merchantId: 'merchant',
    merchantName: 'Native merchant',
    locationId: 'location',
    applicationId: 'sandbox-app',
    environment: 'Sandbox',
  },
  sale: {
    id: 'attempt',
    draftId: 'draft',
    orderId: '12',
    orderState: 'ArrangingPayment',
    method: 'SQUARE_MOBILE',
    evidenceType: 'NATIVE_PROVIDER_VERIFIED',
    tendered: null,
    changeDue: null,
    confirmedAt: '2026-10-19T12:00:00Z',
    completedAt: null,
    context: {
      kind: 'INDEPENDENT',
      label: 'Independent sale',
      marketId: null,
      occurrenceId: null,
    },
    customer: 'Anonymous customer',
    invitationState: 'NONE',
    cashierId: '1',
    financialStatus: 'PAID',
    subtotal: 1700,
    discount: 0,
    state: 'UNCERTAIN',
    amount: 1875,
    currency: 'USD',
    tax: 175,
    orderCode: 'POS12',
    vendor: 'Farm',
    items: [],
    units: [],
    refunds: [],
  },
  reference: 'reference',
  sdkAttemptId: 'sdk-attempt',
  canStart: true,
  cancelRequested: false,
  receiptPath: '/vendor/orders/12',
  readerQualification: 'SDK_SANDBOX_UNVERIFIED',
} as NativeCheckout;
function fixture() {
  let c = structuredClone(checkout),
    pending: string | null = null;
  const api = {
    action: vi.fn(async (action: string) => {
      if (action === 'launch') {
        const launch = { ...c };
        c = { ...c, canStart: false };
        return launch;
      }
      return { ...c };
    }),
  };
  const reader: NativeReaderPort = {
    authorize: vi.fn(async () => {}),
    status: vi.fn(async () => 'SANDBOX_MOCK_READER' as const),
    settings: vi.fn(async () => {}),
    mockReader: vi.fn(async () => {}),
    pay: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    deauthorize: vi.fn(async () => {}),
  };
  const store = {
    read: vi.fn(async () => pending),
    write: vi.fn(async (id: string) => {
      pending = id;
    }),
    clear: vi.fn(async () => {
      pending = null;
    }),
  };
  const proof = {
    sessionId: 'session',
    installationId: 'install',
    secret: 'secret',
  };
  const controller = new CompanionController(
    api as never,
    proof,
    { SQUARE_MOBILE: reader, CLOVER_GO: reader },
    store,
  );
  return {
    controller,
    api,
    reader,
    store,
    proof,
    set: (next: NativeCheckout) => {
      c = next;
    },
  };
}
describe('native companion contracts and lifecycle', () => {
  it('accepts only exact locator links, without credentials or financial parameters', () => {
    expect(nativeHandoffId(`market-pos://checkout/${id}`)).toBe(id);
    for (const value of [
      `https://evil.invalid/${id}`,
      `market-pos://checkout/${id}?amount=1`,
      `market-pos://checkout/${id}#token`,
      `market-pos://other/${id}`,
    ])
      expect(() => nativeHandoffId(value)).toThrow();
  });
  it('keeps provider and SDK attempt references distinct and uses exact online-only terms without fees', () => {
    const terms = squarePaymentTerms(checkout);
    expect(terms).toMatchObject({
      amountMoney: { amount: 1875, currencyCode: 'USD' },
      referenceId: 'reference',
      paymentAttemptId: 'sdk-attempt',
      processingMode: 0,
      allowCardSurcharge: false,
      acceptPartialAuthorization: false,
      appFeeMoney: { amount: 0 },
      tipMoney: { amount: 0 },
    });
    expect(terms).not.toHaveProperty('idempotencyKey');
    for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        squarePaymentTerms({ ...checkout, sale: { ...checkout.sale, amount } }),
      ).toThrow();
    expect(() =>
      squarePaymentTerms({
        ...checkout,
        sale: { ...checkout.sale, currency: 'EUR' },
      }),
    ).toThrow();
  });
  it('maps Clover only from authoritative amount, tax and original reference without manual entry', () => {
    expect(cloverGoRequest({ ...checkout, method: 'CLOVER_GO' })).toEqual({
      amount: 1875,
      taxAmount: 175,
      tipAmount: 0,
      final: true,
      capture: true,
      externalPaymentId: 'reference',
      externalReferenceId: 'reference',
      keyedInCard: null,
    });
    expect(() => cloverGoRequest(checkout)).toThrow();
  });
  it('persists the original locator before SDK launch, and callback success stays uncertain', async () => {
    const f = fixture();
    await f.controller.open(id);
    expect(f.store.write).toHaveBeenCalledWith(id);
    await f.controller.pay();
    expect(f.reader.pay).toHaveBeenCalledOnce();
    expect(f.controller.checkout?.sale.state).toBe('UNCERTAIN');
    expect(nativePaymentStatus(f.controller.checkout!)).toContain('uncertain');
    await f.controller.pay();
    expect(f.reader.pay).toHaveBeenCalledOnce();
    expect(f.api.action.mock.calls.map((c) => c[0])).toEqual([
      'claim',
      'launch',
      'reconcile',
      'launch',
    ]);
  });
  it('recovers from a killed app without invoking another SDK charge', async () => {
    const f = fixture();
    await f.controller.open(id);
    await f.controller.pay();
    const restarted = new CompanionController(
      f.api as never,
      f.proof,
      { SQUARE_MOBILE: f.reader, CLOVER_GO: f.reader },
      f.store,
    );
    await restarted.recover();
    expect(restarted.checkout?.canStart).toBe(false);
    expect(f.reader.pay).toHaveBeenCalledOnce();
  });
  it('never retries the SDK when its response or provider finalization is lost', async () => {
    const f = fixture();
    vi.mocked(f.reader.pay).mockRejectedValueOnce(
      new Error('SDK response lost'),
    );
    await f.controller.open(id);
    await f.controller.pay();
    expect(f.controller.checkout?.sale.state).toBe('UNCERTAIN');
    await f.controller.recover();
    expect(f.reader.pay).toHaveBeenCalledOnce();
  });
  it('does not claim SDK success for controlled fixture credentials', async () => {
    const f = fixture();
    f.set({ ...checkout, readerQualification: 'CONTROLLED_TEST' });
    await f.controller.open(id);
    await expect(f.controller.authorizeReader()).rejects.toThrow('fixtures');
    await expect(f.controller.pay()).rejects.toThrow('fixture');
    expect(f.reader.pay).not.toHaveBeenCalled();
  });
  it('requires a connected authorized reader before consuming launch permission', async () => {
    const f = fixture();
    vi.mocked(f.reader.status).mockResolvedValue('READER_NOT_CONNECTED');
    await f.controller.open(id);
    await expect(f.controller.pay()).rejects.toThrow('Connect');
    expect(f.api.action).toHaveBeenCalledOnce();
  });
  it('blocks concurrent SDK starts and switching an unresolved checkout', async () => {
    const f = fixture();
    await f.controller.open(id);
    await expect(f.controller.open('another')).rejects.toThrow('Recover');
    let release: () => void = () => {};
    vi.mocked(f.reader.pay).mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    const first = f.controller.pay();
    await waitFor(() => expect(f.reader.pay).toHaveBeenCalledOnce());
    await expect(f.controller.pay()).rejects.toThrow('in progress');
    release();
    await first;
  });
  it('cancellation racing with capture follows verified server completion', async () => {
    const f = fixture();
    await f.controller.open(id);
    f.set({
      ...checkout,
      canStart: false,
      sale: { ...checkout.sale, state: 'COMPLETED' },
    });
    await f.controller.cancel();
    expect(f.controller.checkout?.sale.state).toBe('COMPLETED');
    expect(nativePaymentStatus(f.controller.checkout!)).toBe(
      'Payment independently verified',
    );
  });
  it('cleans up native authorization on logout and preserves the recovery locator', async () => {
    const f = fixture();
    await f.controller.open(id);
    await f.controller.logout();
    expect(f.reader.deauthorize).toHaveBeenCalled();
    expect(f.api.action).toHaveBeenLastCalledWith('revoke', f.proof);
    expect(f.store.clear).not.toHaveBeenCalled();
  });
  it('derives native colors from the existing approved design tokens', () =>
    expect(tokens).toEqual(nativeTokens));
});
describe('native platform client security', () => {
  it('accepts HTTPS and rejects credentials or authorization in endpoint URLs', () => {
    expect(
      () => new NativePlatformClient('https://api.example.invalid/admin-api'),
    ).not.toThrow();
    for (const endpoint of [
      'http://api.example.invalid/admin-api',
      'https://user:password@example.invalid/admin-api',
      'https://api.example.invalid/admin-api?token=value',
    ])
      expect(() => new NativePlatformClient(endpoint)).toThrow();
  });
  it('uses the existing login and only permitted workspace channels with cookie omission', async () => {
    const request = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              login: {
                __typename: 'CurrentUser',
                channels: [
                  {
                    id: '1',
                    code: 'vendor',
                    token: 'channel',
                    permissions: ['OperateOwnPos'],
                  },
                  {
                    id: '2',
                    code: 'unavailable',
                    token: 'other',
                    permissions: [],
                  },
                ],
              },
            },
          }),
          { headers: { 'vendure-auth-token': 'controlled-platform-bearer' } },
        ),
    );
    const client = new NativePlatformClient(
      'https://api.example.invalid/admin-api',
      request,
    );
    expect(await client.login('user', 'controlled-password')).toHaveLength(1);
    expect(client.token).toBe('controlled-platform-bearer');
    expect(request.mock.calls[0]?.[1]?.credentials).toBe('omit');
    expect(String(request.mock.calls[0]?.[0])).not.toContain(
      'controlled-password',
    );
  });
  it('sends installation proof in authenticated native request bodies, never URL parameters', async () => {
    const request = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            data: { ownPosNativeAction: { state: 'UNCERTAIN' } },
          }),
        ),
    );
    const client = new NativePlatformClient(
      'https://api.example.invalid/admin-api',
      request,
    );
    client.token = 'controlled-platform-bearer';
    client.channel = 'channel';
    await client.action(
      'context',
      {
        sessionId: 'session',
        installationId: 'installation',
        secret: 'controlled-proof',
      },
      id,
    );
    const [url, options] = request.mock.calls[0]!;
    expect(String(url)).toBe('https://api.example.invalid/admin-api');
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer controlled-platform-bearer',
      'vendure-token': 'channel',
    });
    expect(
      JSON.parse(options!.body as string).variables.input.proof.secret,
    ).toBe('controlled-proof');
  });
  it('clears native platform bearer and workspace even if server logout is interrupted', async () => {
    const request = vi.fn<typeof fetch>(async () => {
      throw new Error('controlled disconnection');
    });
    const client = new NativePlatformClient(
      'https://api.example.invalid/admin-api',
      request,
    );
    client.token = 'controlled-platform-bearer';
    client.channel = 'channel';
    await expect(client.logout()).rejects.toThrow();
    expect(client.token).toBe('');
    expect(client.channel).toBe('');
  });
});
describe('browser mobile-reader handoff', () => {
  const draft = {
    id: 'draft',
    version: 2,
    quote: {
      id: 'quote',
      version: 2,
      expiresAt: '2026-10-20T00:00:00Z',
      paymentAvailable: true,
    },
    state: 'READY_FOR_PAYMENT',
    expiresAt: '2026-10-20T00:00:00Z',
    subtotal: 1700,
    tax: 175,
    discount: 0,
    customer: 'Anonymous',
    customerMode: 'ANONYMOUS',
    coupons: [],
    items: [],
    total: 1875,
    currency: 'USD',
    context: {
      kind: 'INDEPENDENT',
      label: 'Independent sale',
      marketId: null,
      occurrenceId: null,
    },
  } as PosDraft;
  it('explains unavailable native setup without simulating reader discovery', async () => {
    const api = { nativeHandoff: vi.fn() } as unknown as InPersonApi;
    render(
      <PosPaymentDialog
        api={api}
        draft={draft}
        methods={{
          cash: true,
          simulated: false,
          scenarios: [],
          native: [
            {
              method: 'CLOVER_GO',
              available: false,
              merchant: null,
              reason: 'Clover Go developer setup required',
            },
          ],
        }}
        sale={null}
        onSale={vi.fn()}
        onClose={vi.fn()}
        onNewSale={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Payment method'), {
      target: { value: 'CLOVER_GO' },
    });
    expect(screen.getByText(/Browser checkout cannot pair/)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Prepare companion checkout' }),
    ).toBeDisabled();
    expect(api.nativeHandoff).not.toHaveBeenCalled();
  });
  it('sends only backend quote identity and displays an expiring companion locator', async () => {
    const api = {
      nativeHandoff: vi.fn(async () => ({
        id,
        expiresAt: '2026-10-20T00:00:00Z',
        url: `market-pos://checkout/${id}`,
        requiresCompanion: true,
      })),
    } as unknown as InPersonApi;
    render(
      <PosPaymentDialog
        api={api}
        draft={draft}
        methods={{
          cash: true,
          simulated: false,
          scenarios: [],
          native: [
            {
              method: 'SQUARE_MOBILE',
              available: true,
              merchant: checkout.merchant,
              reason: 'Requires the native companion app',
            },
          ],
        }}
        sale={null}
        onSale={vi.fn()}
        onClose={vi.fn()}
        onNewSale={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Payment method'), {
      target: { value: 'SQUARE_MOBILE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Prepare companion checkout' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: 'Open payment companion' }),
      ).toHaveAttribute('href', `market-pos://checkout/${id}`),
    );
    expect(api.nativeHandoff).toHaveBeenCalledWith({
      draftId: 'draft',
      version: 2,
      quoteId: 'quote',
      method: 'SQUARE_MOBILE',
    });
    expect(screen.getByText(/If the app is unavailable/)).toBeVisible();
  });
});
