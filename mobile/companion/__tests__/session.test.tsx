import React from 'react';
import {
  act,
  cleanupAsync,
  fireEvent,
  renderAsync,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import App from '../App';
import { readSecure } from '../src/storage';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { platformEndpoint: 'https://api.example.invalid/admin-api' },
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
jest.mock('../src/square', () => ({
  SquareNativeReader: jest.fn(() => ({
    observe: () => () => {},
    deauthorize: jest.fn(async () => {}),
  })),
}));
jest.mock('../src/clover', () => ({
  CloverGoNativeReader: jest.fn(() => ({
    deauthorize: jest.fn(async () => {}),
  })),
}));
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'installation',
  getRandomBytesAsync: async (length: number) => new Uint8Array(length).fill(7),
}));

const originals = {
  fetch: globalThis.fetch,
  AbortController,
  AbortSignal,
  URL,
};
const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
beforeAll(() => {
  Object.assign(globalThis, {
    fetch: request,
    AbortController: jest.requireActual('abort-controller').AbortController,
    AbortSignal: jest.requireActual('abort-controller').AbortSignal,
    URL: jest.requireActual('whatwg-url-minimum').URL,
  });
});
afterAll(() => Object.assign(globalThis, originals));
beforeEach(async () => {
  await SecureStore.deleteItemAsync('pos.session');
  await SecureStore.deleteItemAsync('pos.installation');
  await SecureStore.deleteItemAsync('pos.pending');
  jest.clearAllMocks();
  request.mockReset();
  request.mockImplementation(async (_url, init) => {
    const { query, variables } = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        data: query.includes('login(')
          ? {
              login: {
                __typename: 'CurrentUser',
                channels: [
                  {
                    id: '1',
                    code: 'Farm',
                    token: 'channel',
                    permissions: ['OperateOwnPos'],
                  },
                ],
              },
            }
          : {
              ownPosNativeAction:
                variables.input?.action === 'register'
                  ? {
                      sessionId: 'native-session',
                      expiresAt: '2026-10-20T12:00:00Z',
                    }
                  : {},
            },
      }),
      {
        headers: query.includes('login(')
          ? { 'vendure-auth-token': 'bearer' }
          : {},
      },
    );
  });
});
afterEach(async () => {
  await cleanupAsync();
  jest.useRealTimers();
});

async function beginLogin(beforePress?: () => void) {
  await renderAsync(<App />);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState
        .disabled,
    ).toBe(false),
  );
  fireEvent.changeText(screen.getByLabelText('Platform username'), 'cashier');
  fireEvent.changeText(screen.getByLabelText('Password'), 'test-password');
  beforePress?.();
  fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('real native login transport and secure session lifecycle without AbortSignal.timeout', () => {
  it('persists the bearer, workspace and installation proof and restores them after remount', async () => {
    expect(AbortSignal.timeout).toBeUndefined();
    await beginLogin();
    await screen.findByRole('button', { name: 'Use Farm' });
    expect(screen.getByLabelText('Password').props.value).toBe('');
    fireEvent.press(screen.getByRole('button', { name: 'Use Farm' }));
    await screen.findByLabelText('Checkout handoff reference');
    const saved = await readSecure('pos.session');
    expect(JSON.parse(saved!)).toEqual({
      endpoint: 'https://api.example.invalid/admin-api',
      token: 'bearer',
      channel: 'channel',
      proof: {
        sessionId: 'native-session',
        installationId: 'installation',
        secret: expect.any(String),
      },
    });
    expect(saved).not.toContain('test-password');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'pos.session',
      saved,
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
    const registration = request.mock.calls[1][1];
    expect(registration).toMatchObject({
      credentials: 'omit',
      headers: { Authorization: 'Bearer bearer', 'vendure-token': 'channel' },
    });
    await cleanupAsync();
    request.mockClear();
    await renderAsync(<App />);
    await screen.findByLabelText('Checkout handoff reference');
    expect(request).not.toHaveBeenCalled();
    expect(await readSecure('pos.session')).toBe(saved);
  });

  it('rejects invalid credentials without writing secure session or registration data', async () => {
    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { login: { __typename: 'InvalidCredentialsError' } },
        }),
      ),
    );
    await beginLogin();
    await screen.findByText('Platform login was not authorized');
    expect(await readSecure('pos.session')).toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });

  it('shows a meaningful login deadline and never persists a late successful response', async () => {
    let release!: (response: Response) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    await beginLogin(() => jest.useFakeTimers());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20000);
    });
    expect(
      screen.getByText(/Platform request timed out after 20 seconds/),
    ).toBeTruthy();
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      release(
        new Response(
          JSON.stringify({
            data: { login: { __typename: 'CurrentUser', channels: [] } },
          }),
          { headers: { 'vendure-auth-token': 'late-bearer' } },
        ),
      );
    });
    expect(await readSecure('pos.session')).toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Checkout handoff reference')).toBeNull();
    expect(screen.getByLabelText('Password').props.value).toBe('');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
