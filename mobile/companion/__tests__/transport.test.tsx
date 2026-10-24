import { NativePlatformClient } from '../src/api';
import {
  CompanionController,
  type NativeReaderPort,
} from '../../core/controller';
import type { NativeCheckout } from '../../../packages/api/src/native-mobile';
import { withRequestTimeout } from '../../../packages/api/src/request-timeout';

// Use the very same limited abort implementation shipped by React Native 0.83.
const nativeAbort = jest.requireActual('abort-controller');
const originals = {
  AbortController,
  AbortSignal,
  URL,
  DOMException: globalThis.DOMException,
};
beforeAll(() => {
  globalThis.AbortController = nativeAbort.AbortController;
  globalThis.AbortSignal = nativeAbort.AbortSignal;
  // Expo installs this URL implementation before registering the real app.
  globalThis.URL = jest.requireActual('whatwg-url-minimum').URL;
  Object.defineProperty(globalThis, 'DOMException', {
    value: undefined,
    configurable: true,
    writable: true,
  });
});
afterAll(() => Object.assign(globalThis, originals));
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const endpoint = 'https://api.example.invalid/admin-api';
const proof = {
  sessionId: 'session',
  installationId: 'installation',
  secret: 'installation-proof',
};
const workspace = {
  id: '1',
  code: 'Farm',
  token: 'channel',
  permissions: ['OperateOwnPos'],
};
function response(data: unknown, token?: string) {
  return new Response(JSON.stringify({ data }), {
    headers: token ? { 'vendure-auth-token': token } : {},
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function expire(result: Promise<unknown>) {
  const rejected = expect(result).rejects.toMatchObject({
    name: 'TimeoutError',
    message: expect.stringContaining('recover its status'),
  });
  await jest.advanceTimersByTimeAsync(20000);
  await rejected;
}

describe('native transport without timeout, any, abort reasons or DOMException', () => {
  it('logs in through the existing bearer contract and filters workspace permissions', async () => {
    expect(AbortSignal.timeout).toBeUndefined();
    expect(AbortSignal.any).toBeUndefined();
    expect(new AbortController().signal).not.toHaveProperty('reason');
    expect(globalThis.DOMException).toBeUndefined();
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        response(
          {
            login: {
              __typename: 'CurrentUser',
              channels: [workspace, { ...workspace, permissions: [] }],
            },
          },
          'bearer',
        ),
      );
    const client = new NativePlatformClient(endpoint, request);
    await expect(client.login('cashier', 'password')).resolves.toEqual([
      workspace,
    ]);
    expect(client.token).toBe('bearer');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(endpoint);
    expect(request.mock.calls[0][1]).toMatchObject({
      credentials: 'omit',
      method: 'POST',
    });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({
      variables: { username: 'cashier', password: 'password' },
    });
  });

  it('rejects invalid credentials without authorizing or persisting a session', async () => {
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        response({ login: { __typename: 'InvalidCredentialsError' } }),
      );
    const client = new NativePlatformClient(endpoint, request);
    await expect(client.login('cashier', 'wrong')).rejects.toThrow(
      'Platform login was not authorized',
    );
    expect(client.token).toBe('');
    expect(client.channel).toBe('');
  });

  it('aborts stalled login at twenty seconds even if fetch ignores cancellation, and ignores its late bearer', async () => {
    const late = deferred<Response>();
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockReturnValue(late.promise);
    const client = new NativePlatformClient(endpoint, request);
    const result = client.login('cashier', 'password');
    await jest.advanceTimersByTimeAsync(19999);
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(false);
    const rejected = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
      message: expect.stringContaining('20 seconds'),
    });
    await jest.advanceTimersByTimeAsync(1);
    await rejected;
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    late.resolve(
      response(
        { login: { __typename: 'CurrentUser', channels: [workspace] } },
        'late-bearer',
      ),
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(client.token).toBe('');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps the deadline during stalled body decoding and preserves the existing session', async () => {
    const body = deferred<unknown>();
    const stalled = response({});
    jest.spyOn(stalled, 'json').mockReturnValue(body.promise);
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(stalled);
    const client = new NativePlatformClient(endpoint, request);
    client.token = 'existing-bearer';
    client.channel = 'channel';
    await expire(client.action('reconcile', proof, 'handoff'));
    body.resolve({ data: { ownPosNativeAction: { state: 'COMPLETED' } } });
    await jest.advanceTimersByTimeAsync(0);
    expect(client.token).toBe('existing-bearer');
    expect(client.channel).toBe('channel');
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('reports a timeout when native fetch rejects abort with only a generic AbortError', async () => {
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                reject(error);
              },
              { once: true },
            );
          }),
      );
    const client = new NativePlatformClient(endpoint, request);
    await expire(client.login('cashier', 'password'));
    expect(client.token).toBe('');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('forwards native caller cancellation, detaches listeners and never starts a pre-cancelled request', async () => {
    const caller = new AbortController();
    const remove = jest.spyOn(caller.signal, 'removeEventListener');
    const late = deferred<Response>();
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockReturnValue(late.promise);
    const client = new NativePlatformClient(endpoint, request);
    client.token = 'existing-bearer';
    const result = client.action('reconcile', proof, 'handoff', {
      signal: caller.signal,
    });
    const rejected = expect(result).rejects.toMatchObject({
      name: 'AbortError',
      message: expect.stringContaining('cancelled'),
    });
    caller.abort();
    await rejected;
    late.resolve(response({}, 'late-bearer'));
    await jest.advanceTimersByTimeAsync(0);
    expect(client.token).toBe('existing-bearer');
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    await expect(
      client.login('cashier', 'password', { signal: caller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('cleans up deadlines/listeners after successful and failed native requests', async () => {
    const caller = new AbortController();
    const remove = jest.spyOn(caller.signal, 'removeEventListener');
    await expect(
      withRequestTimeout(20000, async () => 'ok', caller.signal),
    ).resolves.toBe('ok');
    await expect(
      withRequestTimeout(
        20000,
        async () => {
          throw new Error('offline');
        },
        caller.signal,
      ),
    ).rejects.toThrow('offline');
    expect(remove).toHaveBeenCalledTimes(2);
    expect(caller.signal.aborted).toBe(false);
  });

  it('clears in-memory authentication even when logout times out', async () => {
    const client = new NativePlatformClient(
      endpoint,
      jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockImplementation(() => new Promise(() => {})),
    );
    client.token = 'bearer';
    client.channel = 'channel';
    await expire(client.logout());
    expect(client.token).toBe('');
    expect(client.channel).toBe('');
  });
});

// These fixtures model the existing server's one-use launch compare-and-set.
const checkout: NativeCheckout = {
  handoffId: 'bd43e0e1-c318-4cd0-93f2-b0c39f9e11ab',
  attemptId: 'attempt',
  method: 'SQUARE_MOBILE',
  merchant: {
    connectionId: 'connection',
    merchantId: 'merchant',
    merchantName: 'Farm',
    locationId: 'location',
    applicationId: 'sandbox-app',
    environment: 'Sandbox',
  },
  sale: {
    id: 'attempt',
    draftId: 'draft',
    orderId: '12',
    orderCode: 'POS12',
    orderState: 'ArrangingPayment',
    state: 'UNCERTAIN',
    method: 'SQUARE_MOBILE',
    evidenceType: 'NATIVE_PROVIDER_VERIFIED',
    vendor: 'Farm',
    amount: 1875,
    currency: 'USD',
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
    customer: 'Anonymous',
    invitationState: 'NONE',
    cashierId: '1',

    items: [],
    subtotal: 1700,
    discount: 0,
    tax: 175,
    units: [],
    refunds: [],
  },
  reference: 'reference',
  sdkAttemptId: 'sdk-attempt',
  canStart: true,
  cancelRequested: false,
  receiptPath: '/vendor/orders/12',
  readerQualification: 'SDK_SANDBOX_UNVERIFIED',
};
describe.each(['launch', 'reconcile', 'cancel'])(
  'payment response lost during %s',
  (lostAction) => {
    it('retains original identity and uncertainty, with no duplicate SDK payment or client finalization', async () => {
      let consumed = false,
        loseResponse = true;
      const late = deferred<Response>();
      const request = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockImplementation(async (_url, init) => {
          const { input } = JSON.parse(String(init?.body)).variables;
          let canStart = !consumed;
          if (input.action === 'launch') {
            consumed = true;
          } else canStart = !consumed;
          const data = response({
            ownPosNativeAction: { ...checkout, canStart },
          });
          if (input.action === lostAction && loseResponse) {
            loseResponse = false;
            return late.promise;
          }
          return data;
        });
      const client = new NativePlatformClient(endpoint, request);
      client.token = 'bearer';
      client.channel = 'channel';
      const reader: NativeReaderPort = {
        authorize: jest.fn(async () => {}),
        status: jest.fn(async () => 'SANDBOX_MOCK_READER' as const),
        settings: jest.fn(async () => {}),
        mockReader: jest.fn(async () => {}),
        pay: jest.fn(async () => {}),
        cancel: jest.fn(async () => {}),
        deauthorize: jest.fn(async () => {}),
      };
      let pending: string | null = null;
      const store = {
        read: async () => pending,
        write: jest.fn(async (id: string) => {
          pending = id;
        }),
        clear: jest.fn(async () => {
          pending = null;
        }),
      };
      const controller = new CompanionController(
        client,
        proof,
        { SQUARE_MOBILE: reader, CLOVER_GO: reader },
        store,
      );
      await controller.open(checkout.handoffId);
      if (lostAction === 'cancel') {
        await controller.pay();
        await expire(controller.cancel());
      } else await expire(controller.pay());
      expect(controller.checkout?.sale.state).toBe('UNCERTAIN');
      expect(reader.pay).toHaveBeenCalledTimes(lostAction === 'launch' ? 0 : 1);
      expect(store.clear).not.toHaveBeenCalled();
      expect(pending).toBe(checkout.handoffId);
      // A late claimed launch (or even a late success payload) cannot be applied.
      late.resolve(
        response({
          ownPosNativeAction: {
            ...checkout,
            sale: { ...checkout.sale, state: 'COMPLETED' },
          },
        }),
      );
      await jest.advanceTimersByTimeAsync(0);
      expect(controller.checkout?.sale.state).toBe('UNCERTAIN');
      await controller.recover();
      await controller.pay();
      const restarted = new CompanionController(
        client,
        proof,
        { SQUARE_MOBILE: reader, CLOVER_GO: reader },
        store,
      );
      await restarted.recover();
      expect(restarted.checkout?.canStart).toBe(false);
      expect(restarted.checkout?.sale.state).toBe('UNCERTAIN');
      expect(reader.pay).toHaveBeenCalledTimes(lostAction === 'launch' ? 0 : 1);
      expect(restarted.checkout).toMatchObject({
        handoffId: checkout.handoffId,
        reference: checkout.reference,
        sdkAttemptId: checkout.sdkAttemptId,
        merchant: checkout.merchant,
      });
      for (const [, init] of request.mock.calls) {
        expect(init).toMatchObject({
          credentials: 'omit',
          headers: {
            Authorization: 'Bearer bearer',
            'vendure-token': 'channel',
          },
        });
        const { input } = JSON.parse(String(init?.body)).variables;
        expect(input).toEqual({
          action: expect.any(String),
          proof,
          handoffId: checkout.handoffId,
        });
      }
    });
  },
);
