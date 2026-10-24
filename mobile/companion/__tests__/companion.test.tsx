import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react-native';
import App from '../App';
import type { NativeCheckout } from '../../../packages/api/src/native-mobile';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        platformEndpoint: 'https://api.example.invalid/admin-api',
        dashboardOrigin: 'https://admin.example.invalid',
        squareApplicationId: 'sandbox-controlled-ui-test',
        environment: 'Sandbox',
      },
    },
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactMock = jest.requireActual('react'),
    { View } = jest.requireActual('react-native');
  return {
    SafeAreaProvider: ({ children }: React.PropsWithChildren) =>
      ReactMock.createElement(View, null, children),
    SafeAreaView: View,
  };
});
jest.mock('../src/square', () => {
  const reader = {
    authorize: jest.fn(async () => {}),
    status: jest.fn(async () => 'READER_NOT_CONNECTED'),
    settings: jest.fn(async () => {}),
    mockReader: jest.fn(async () => {}),
    pay: jest.fn(async () => {}),
    cancel: jest.fn(async () => {}),
    deauthorize: jest.fn(async () => {}),
    observe: jest.fn(() => () => {}),
    tapToPayCapability: jest.fn(async () => ({
      supported: false,
      paymentEnabled: false,
    })),
  };
  return { SquareNativeReader: jest.fn(() => reader), reader };
});
jest.mock('../src/clover', () => {
  const reader = {
    authorize: jest.fn(async () => {}),
    status: jest.fn(async () => 'SDK_UNAVAILABLE'),
    settings: jest.fn(async () => {}),
    mockReader: jest.fn(async () => {}),
    pay: jest.fn(async () => {}),
    cancel: jest.fn(async () => {}),
    deauthorize: jest.fn(async () => {}),
  };
  return { CloverGoNativeReader: jest.fn(() => reader), reader };
});
jest.mock('../src/api', () => {
  const client = {
    token: 'controlled-native-bearer',
    channel: '',
    endpoint: 'https://api.example.invalid/admin-api',
    login: jest.fn(),
    register: jest.fn(),
    action: jest.fn(),
    logout: jest.fn(async () => {}),
  };
  return { NativePlatformClient: jest.fn(() => client), client };
});
jest.mock('../src/storage', () => ({
  readSecure: jest.fn(async () => null),
  writeSecure: jest.fn(async () => {}),
  clearSession: jest.fn(async () => {}),
  installation: jest.fn(async () => ({
    id: 'controlled-installation',
    secret: 'controlled-installation-proof',
  })),
  pendingStore: {
    read: jest.fn(async () => null),
    write: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));

const client = jest.requireMock('../src/api').client,
  storage = jest.requireMock('../src/storage'),
  reader = jest.requireMock('../src/square').reader;
const handoffId = 'bd43e0e1-c318-4cd0-93f2-b0c39f9e11ab';
const checkout: NativeCheckout = {
  handoffId,
  attemptId: 'attempt',
  method: 'SQUARE_MOBILE',
  merchant: {
    connectionId: 'connection',
    merchantId: 'merchant',
    merchantName: 'Controlled merchant',
    locationId: 'location',
    applicationId: 'sandbox-controlled-ui-test',
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
    evidenceType: 'NATIVE_CONTROLLED_TEST',
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
    financialStatus: 'PAID',
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
  readerQualification: 'CONTROLLED_TEST',
};
beforeEach(() => {
  jest.clearAllMocks();
  client.token = 'controlled-native-bearer';
  client.channel = '';
  client.login.mockResolvedValue([
    {
      id: '1',
      code: 'Farm workspace',
      token: 'channel',
      permissions: ['OperateOwnPos'],
    },
  ]);
  client.register.mockResolvedValue({ sessionId: 'native-session' });
  client.action.mockResolvedValue(checkout);
  client.logout.mockResolvedValue(undefined);
  storage.readSecure.mockResolvedValue(null);
  storage.pendingStore.read.mockResolvedValue(null);
});
afterEach(cleanup);
async function signIn() {
  render(<App />);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState
        .disabled,
    ).toBe(false),
  );
  fireEvent.changeText(
    screen.getByLabelText('Platform username'),
    'controlled-user',
  );
  fireEvent.changeText(
    screen.getByLabelText('Password'),
    'controlled-password',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('button', { name: 'Use Farm workspace' });
  expect(screen.getByLabelText('Password').props.value).toBe('');
  fireEvent.press(screen.getByRole('button', { name: 'Use Farm workspace' }));
  await screen.findByLabelText('Checkout handoff reference');
}
async function open() {
  fireEvent.changeText(
    screen.getByLabelText('Checkout handoff reference'),
    handoffId,
  );
  fireEvent.press(
    screen.getByRole('button', { name: 'Open prepared checkout' }),
  );
  await screen.findByText('Order POS12 · Farm');
}
describe('controlled React Native screens, no SDK or hardware', () => {
  it('uses existing login/workspace identity and stores the native session without the password', async () => {
    await signIn();
    expect(client.login).toHaveBeenCalledWith(
      'controlled-user',
      'controlled-password',
    );
    const saved = storage.writeSecure.mock.calls.find(
      (c: string[]) => c[0] === 'pos.session',
    )[1];
    expect(JSON.parse(saved).token).toBe('controlled-native-bearer');
    expect(saved).not.toContain('controlled-password');
  });
  it('shows the authoritative amount and clearly labels controlled checkout without SDK charge controls', async () => {
    await signIn();
    await open();
    expect(screen.getByText('$18.75')).toBeTruthy();
    expect(screen.getByText(/Controlled adapter checkout/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Take authorized payment' }),
    ).toBeNull();
    expect(reader.pay).not.toHaveBeenCalled();
  });
  it('denies payment initiation with a disconnected reader before requesting launch', async () => {
    client.action.mockResolvedValue({
      ...checkout,
      readerQualification: 'SDK_SANDBOX_UNVERIFIED',
    });
    await signIn();
    await open();
    fireEvent.press(
      screen.getByRole('button', { name: 'Take authorized payment' }),
    );
    await screen.findByText('Connect an authorized reader first');
    expect(
      client.action.mock.calls.some((c: string[]) => c[0] === 'launch'),
    ).toBe(false);
    expect(reader.pay).not.toHaveBeenCalled();
  });
  it('restores an uncertain payment without starting an SDK operation', async () => {
    storage.readSecure.mockResolvedValue(
      JSON.stringify({
        endpoint: client.endpoint,
        token: client.token,
        channel: 'channel',
        proof: {
          sessionId: 'session',
          installationId: 'installation',
          secret: 'controlled-proof',
        },
      }),
    );
    storage.pendingStore.read.mockResolvedValue(handoffId);
    client.action.mockResolvedValue({ ...checkout, canStart: false });
    render(<App />);
    await screen.findByText(/Payment uncertain/);
    expect(client.action).toHaveBeenCalledWith(
      'reconcile',
      expect.any(Object),
      handoffId,
    );
    expect(reader.pay).not.toHaveBeenCalled();
  });
  it('cleans up SDK state and native secure storage when platform logout is interrupted', async () => {
    await signIn();
    client.logout.mockRejectedValueOnce(
      new Error('Controlled logout interruption'),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Sign out or switch workspace' }),
    );
    await screen.findByRole('button', { name: 'Sign in' });
    expect(reader.deauthorize).toHaveBeenCalled();
    expect(client.action).toHaveBeenCalledWith('revoke', expect.any(Object));
    expect(storage.clearSession).toHaveBeenCalled();
    expect(client.token).toBe('');
  });
});
