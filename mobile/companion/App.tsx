import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  Linking,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  nativeHandoffId,
  nativePaymentLabel,
  nativePaymentStatus,
  type NativeCheckout,
} from '../../packages/api/src/native-mobile';
import { CompanionController, type ReaderState } from '../core/controller';
import { NativePlatformClient, type Workspace } from './src/api';
import { SquareNativeReader } from './src/square';
import { CloverGoNativeReader } from './src/clover';
import {
  readSecure,
  writeSecure,
  clearSession,
  installation,
  pendingStore,
  type StoredSession,
} from './src/storage';
import { Action, Input, Notice, Panel, styles } from './src/ui';

const extra = Constants.expoConfig?.extra ?? {};
const endpoint = String(
  extra.platformEndpoint ?? 'http://10.0.2.2:3549/admin-api',
);
const dashboard = String(extra.dashboardOrigin ?? 'http://localhost:4592');
const square = new SquareNativeReader(
  String(extra.squareApplicationId ?? ''),
  __DEV__ && extra.environment === 'Sandbox',
);
const readers = {
  SQUARE_MOBILE: square,
  CLOVER_GO: new CloverGoNativeReader(),
};

export default function App() {
  const client = useRef(new NativePlatformClient(endpoint));
  const controller = useRef<CompanionController | null>(null);
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [checkout, setCheckout] = useState<NativeCheckout | null>(null),
    [handoff, setHandoff] = useState(''),
    [reader, setReader] = useState<ReaderState>('MERCHANT_NOT_AUTHORIZED');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [authenticated, setAuthenticated] = useState(false);
  const lock = useRef(false);
  const [tapCapability, setTapCapability] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
      setCheckout(controller.current?.checkout ?? null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Native operation could not be completed',
      );
    } finally {
      setCheckout(controller.current?.checkout ?? null);
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    const receive = (url: string) => {
      try {
        const id = nativeHandoffId(url);
        if (active) setHandoff(id);
      } catch {
        if (active) setError('Invalid companion handoff');
      }
    };
    void Linking.getInitialURL().then((url) => {
      if (url) receive(url);
    });
    const links = Linking.addEventListener('url', (e) => receive(e.url));
    void run(async () => {
      const stored = await readSecure('pos.session');
      if (!stored) return;
      const s = JSON.parse(stored) as StoredSession;
      if (s.endpoint !== endpoint)
        throw new Error('Stored platform endpoint changed. Sign in again');
      client.current.token = s.token;
      client.current.channel = s.channel;
      controller.current = new CompanionController(
        client.current,
        s.proof,
        readers,
        pendingStore,
      );
      setAuthenticated(true);
      await controller.current.recover();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active' && controller.current)
        void run(() => controller.current!.recover());
    });
    const stop = square.observe(() => {
      if (controller.current?.checkout?.method === 'SQUARE_MOBILE')
        void square
          .status()
          .then((s) => {
            if (active) setReader(s);
          })
          .catch(() => {
            if (active) setReader('MERCHANT_NOT_AUTHORIZED');
          });
    });
    return () => {
      active = false;
      links.remove();
      app.remove();
      stop();
    };
  }, []);
  async function choose(workspace: Workspace) {
    await Promise.all(Object.values(readers).map((r) => r.deauthorize()));
    const install = await installation();
    client.current.channel = workspace.token;
    const registered = await client.current.register(
      install.id,
      install.secret,
    );
    const proof = {
      sessionId: registered.sessionId,
      installationId: install.id,
      secret: install.secret,
    };
    await writeSecure(
      'pos.session',
      JSON.stringify({
        endpoint,
        token: client.current.token,
        channel: workspace.token,
        proof,
      } satisfies StoredSession),
    );
    controller.current = new CompanionController(
      client.current,
      proof,
      readers,
      pendingStore,
    );
    setAuthenticated(true);
    setWorkspaces([]);
    await controller.current.recover();
  }
  async function logout() {
    try {
      await controller.current?.logout();
    } finally {
      try {
        await client.current.logout();
      } finally {
        await clearSession();
        client.current.token = '';
        client.current.channel = '';
        controller.current = null;
        setAuthenticated(false);
        setCheckout(null);
        setReader('MERCHANT_NOT_AUTHORIZED');
      }
    }
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={styles.amount}>
            Payment companion
          </Text>
          {busy && (
            <ActivityIndicator accessibilityLabel="Checking original payment" />
          )}
          {!!error && <Notice>{error}</Notice>}
          {!authenticated ? (
            <Panel>
              <Input
                label="Platform username"
                value={username}
                onChange={setUsername}
              />
              <Input
                label="Password"
                value={password}
                onChange={setPassword}
                secret
              />
              <Action
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    try {
                      setWorkspaces(
                        await client.current.login(username, password),
                      );
                    } finally {
                      setPassword('');
                    }
                  })
                }
              >
                Sign in
              </Action>
              {workspaces.map((w) => (
                <Action
                  key={w.id}
                  disabled={busy}
                  onPress={() => void run(() => choose(w))}
                >{`Use ${w.code}`}</Action>
              ))}
            </Panel>
          ) : (
            <>
              <Panel>
                <Input
                  label="Checkout handoff reference"
                  value={handoff}
                  onChange={setHandoff}
                />
                <Action
                  disabled={busy || !handoff}
                  onPress={() =>
                    void run(() =>
                      controller.current!.open(
                        nativeHandoffId(`market-pos://checkout/${handoff}`),
                      ),
                    )
                  }
                >
                  Open prepared checkout
                </Action>
                <Action
                  disabled={busy}
                  onPress={() => void run(() => controller.current!.recover())}
                >
                  Recover original payment
                </Action>
              </Panel>
              {checkout && (
                <Panel>
                  <Text style={styles.text}>
                    {nativePaymentLabel(checkout.method)} ·{' '}
                    {checkout.merchant.merchantName}
                  </Text>
                  <Text style={styles.text}>
                    Order {checkout.sale.orderCode} · {checkout.sale.vendor}
                  </Text>
                  <Text style={styles.amount}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: checkout.sale.currency,
                    }).format(checkout.sale.amount / 100)}
                  </Text>
                  {checkout.sale.items.map((item) => (
                    <Text key={item.id} style={styles.text}>
                      {item.quantity} × {item.name}
                    </Text>
                  ))}
                  <Notice>{nativePaymentStatus(checkout)}</Notice>
                  <Text accessibilityLiveRegion="polite" style={styles.text}>
                    {reader.replaceAll('_', ' ').toLowerCase()}
                  </Text>
                  {checkout.readerQualification === 'CONTROLLED_TEST' ? (
                    <Notice>
                      Controlled adapter checkout. Use the controlled
                      qualification command; this app will not invoke a real SDK
                      for fixture credentials.
                    </Notice>
                  ) : (
                    <>
                      <Action
                        disabled={busy}
                        onPress={() =>
                          void run(async () =>
                            setReader(
                              await controller.current!.authorizeReader(),
                            ),
                          )
                        }
                      >
                        Authorize merchant
                      </Action>
                      <Action
                        disabled={busy}
                        onPress={() =>
                          void run(() => readers[checkout.method].settings())
                        }
                      >
                        Find and connect reader
                      </Action>
                      {Platform.OS === 'ios' &&
                        checkout.method === 'SQUARE_MOBILE' && (
                          <>
                            <Action
                              disabled={busy}
                              onPress={() =>
                                void run(async () => {
                                  const capability =
                                    await square.tapToPayCapability();
                                  setTapCapability(
                                    `${capability.supported ? 'Device capability detected' : 'Device capability unavailable'}. Tap to Pay payments remain disabled pending Stage F qualification`,
                                  );
                                })
                              }
                            >
                              Check Tap to Pay compatibility
                            </Action>
                            {tapCapability && <Notice>{tapCapability}</Notice>}
                          </>
                        )}
                      {__DEV__ &&
                        checkout.method === 'SQUARE_MOBILE' &&
                        checkout.merchant.environment === 'Sandbox' && (
                          <Action
                            disabled={busy}
                            onPress={() => void run(() => square.mockReader())}
                          >
                            Open Square Sandbox Mock Reader
                          </Action>
                        )}
                      <Action
                        disabled={
                          busy || !checkout.canStart || checkout.cancelRequested
                        }
                        onPress={() =>
                          void run(() => controller.current!.pay())
                        }
                      >
                        Take authorized payment
                      </Action>
                    </>
                  )}
                  <Action
                    disabled={!checkout || checkout.sale.state === 'COMPLETED'}
                    onPress={() =>
                      void controller
                        .current!.cancel()
                        .then((c) => setCheckout(c))
                        .catch(() =>
                          setError(
                            'Cancellation is uncertain. Recover the original payment',
                          ),
                        )
                    }
                  >
                    Request cancellation
                  </Action>
                  <Action
                    disabled={busy}
                    onPress={() =>
                      void run(() =>
                        Linking.openURL(
                          new URL(
                            `/vendor/orders/${encodeURIComponent(checkout.sale.orderId)}`,
                            dashboard,
                          ).href,
                        ),
                      )
                    }
                  >
                    Open platform order and receipt
                  </Action>
                </Panel>
              )}
              <Action disabled={busy} onPress={() => void run(logout)}>
                Sign out or switch workspace
              </Action>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
