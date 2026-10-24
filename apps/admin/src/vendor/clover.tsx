import { useEffect, useRef, useState } from 'react';
import {
  PosInputError,
  safeError,
  type CloverIntegration,
  type InPersonApi,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Spinner,
} from '@market/ui';
import type { VendorService } from './service';
import { RouteLink } from './common';
import './pos.css';

const message = (e: unknown) =>
  e instanceof PosInputError ? e.message : safeError(e).message;
export function CloverOAuthReturn({ service }: { service: VendorService }) {
  const [state, setState] = useState<'working' | 'complete' | 'error'>(
      'working',
    ),
    [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    window.history.replaceState(null, '', window.location.pathname);
    const oauthState = params.get('state'),
      code = params.get('code'),
      merchant = params.get('merchant_id'),
      client = params.get('client_id');
    void Promise.resolve()
      .then(() => {
        if (!service.pos || !oauthState)
          throw new PosInputError(
            'Clover did not return a complete authorization. Start Connect Clover again.',
          );
        return code && merchant && client
          ? service.pos.clover.complete(oauthState, code, merchant, client)
          : service.pos.clover.finish(oauthState);
      })
      .then(() => setState('complete'))
      .catch((e) => {
        setError(message(e));
        setState('error');
      });
  }, [service]);
  return (
    <div className="pos-payment-sections">
      {state === 'working' ? (
        <Spinner label="Verifying Clover authorization" />
      ) : (
        <Alert severity={state === 'complete' ? 'success' : 'error'}>
          {state === 'complete'
            ? 'Clover merchant authorization verified. Select your device in Payment Integrations.'
            : error}
        </Alert>
      )}
      <div className="ui-actions">
        <RouteLink to="/vendor/settings/payments">
          Return to Payment Integrations
        </RouteLink>
      </div>
    </div>
  );
}

/** Processor-specific controller using the same shared settings, form and dialog primitives as Square. */
export function CloverPaymentIntegration({ api }: { api: InPersonApi }) {
  const [data, setData] = useState<CloverIntegration | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [adding, setAdding] = useState(false),
    [disconnecting, setDisconnecting] = useState(false),
    [serial, setSerial] = useState(''),
    [label, setLabel] = useState('');
  const lock = useRef(false),
    alive = useRef(true),
    addKey = useRef(crypto.randomUUID());
  useEffect(() => {
    alive.current = true;
    void api.clover
      .settings()
      .then((d) => {
        if (alive.current) setData(d);
      })
      .catch((e) => {
        if (alive.current) setError(message(e));
      });
    return () => {
      alive.current = false;
    };
  }, [api]);
  async function run(work: () => Promise<CloverIntegration>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await work();
      if (alive.current) setData(next);
      return true;
    } catch (e) {
      if (alive.current) setError(message(e));
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function connect() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.clover.begin();
      if (data?.qualification === 'CONTROLLED_TEST' && result.controlledState) {
        setData(
          await api.clover.complete(
            result.controlledState,
            crypto.randomUUID(),
            'controlled-honey-merchant',
            data.applicationId!,
          ),
        );
        return;
      }
      const url = new URL(result.url);
      if (
        url.origin !== 'https://sandbox.dev.clover.com' ||
        url.pathname !== '/oauth/v2/authorize'
      )
        throw new Error('Unexpected Clover authorization destination');
      window.location.assign(url.href);
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const connected = data?.connection?.status === 'CONNECTED';
  return (
    <div className="pos-payment-sections clover-integration">
      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error ? (
        <Spinner label="Loading Clover integration" />
      ) : (
        <Card spacing="contained">
          <div className="pos-payment-sections">
            <p>
              Connect Clover to receive card payments through Cloud Pay Display
              in your own merchant account.
            </p>
            {!data?.configured ? (
              <Alert severity="info">
                Clover needs backend configuration, including its separate App
                ID, Remote App ID and registered HTTPS callback.
              </Alert>
            ) : (
              <>
                <div className="ui-actions">
                  <Badge tone={connected ? 'success' : 'warning'}>
                    {data.connection?.status
                      .toLowerCase()
                      .replaceAll('_', ' ') ?? 'disconnected'}
                  </Badge>
                  <Badge>{data.environment}</Badge>
                  <Badge>
                    {data.remoteAppConfigured
                      ? 'Remote App ID configured'
                      : 'Remote App ID missing'}
                  </Badge>
                </div>
                {data.qualification === 'CONTROLLED_TEST' && (
                  <Alert severity="warning">
                    Clover controlled test only. No Clover account is authorized
                    and no Clover API is contacted.
                  </Alert>
                )}
                {data.connection && (
                  <p>
                    {data.connection.merchant} · {data.connection.merchantId}
                  </p>
                )}
                <div className="ui-actions">
                  <Button disabled={busy} onClick={() => void connect()}>
                    {connected
                      ? 'Reconnect Clover'
                      : data.qualification === 'CONTROLLED_TEST'
                        ? 'Connect Clover controlled test'
                        : 'Connect Clover'}
                  </Button>
                  {data.connection && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setDisconnecting(true)}
                    >
                      Disconnect Clover
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void run(() => api.clover.settings())}
                  >
                    Refresh Clover settings
                  </Button>
                </div>
                {connected && (
                  <>
                    <p>
                      Install and launch Cloud Pay Display on a supported Flex,
                      Mini or Compact. Registration verifies merchant ownership.
                      Availability is verified separately and can change.
                    </p>
                    <div className="ui-actions">
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          addKey.current = crypto.randomUUID();
                          setSerial(
                            data.qualification === 'CONTROLLED_TEST'
                              ? 'CONTROLLED_FLEX_2'
                              : '',
                          );
                          setLabel('');
                          setAdding(true);
                        }}
                      >
                        Add Clover device
                      </Button>
                    </div>
                    {data.devices.map((d) => (
                      <Card key={d.id} spacing="contained">
                        <div className="pos-payment-sections">
                          <p>
                            {d.label} · {d.model}
                          </p>
                          <p>Serial: {d.serial}</p>
                          <div className="ui-actions">
                            <Badge
                              tone={d.status === 'BUSY' ? 'warning' : 'neutral'}
                            >
                              {d.status === 'UNVERIFIED'
                                ? 'Availability unverified'
                                : d.status === 'AVAILABLE'
                                  ? 'Reached at last check'
                                  : d.status.toLowerCase()}
                            </Badge>
                            {d.isDefault && <Badge>Default device</Badge>}
                          </div>
                          {d.checkedAt && (
                            <p>
                              Last checked:{' '}
                              {new Date(d.checkedAt).toLocaleString()}
                            </p>
                          )}
                          <div className="ui-actions">
                            <Button
                              variant="secondary"
                              disabled={busy || d.status === 'BUSY'}
                              onClick={() =>
                                void run(() => api.clover.device(d.id, 'check'))
                              }
                            >
                              Check Clover connectivity
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={
                                busy || d.isDefault || d.status === 'BUSY'
                              }
                              onClick={() =>
                                void run(() =>
                                  api.clover.device(d.id, 'default'),
                                )
                              }
                            >
                              Use as default
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={busy || d.status === 'BUSY'}
                              onClick={() =>
                                void run(() =>
                                  api.clover.device(d.id, 'remove'),
                                )
                              }
                            >
                              Remove Clover device
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </Card>
      )}
      {adding && (
        <Dialog
          open
          className="pos-payment-dialog"
          title="Add Clover device"
          onClose={() => setAdding(false)}
          busy={busy}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={busy || !serial.trim() || !label.trim()}
                onClick={() =>
                  void run(() =>
                    api.clover.addDevice({
                      key: addKey.current,
                      serial: serial.trim(),
                      label: label.trim(),
                    }),
                  ).then((ok) => {
                    if (ok) setAdding(false);
                  })
                }
              >
                Register Clover device
              </Button>
            </>
          }
        >
          <div className="pos-payment-sections">
            <p>
              Use the serial shown in Clover Setup. The server verifies this
              device belongs to your connected merchant.
            </p>
            <Field id="clover-serial" label="Device serial">
              <Input
                id="clover-serial"
                maxLength={120}
                value={serial}
                disabled={busy}
                onChange={(e) => setSerial(e.target.value)}
              />
            </Field>
            <Field id="clover-label" label="Friendly device label">
              <Input
                id="clover-label"
                maxLength={100}
                value={label}
                disabled={busy}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
            {error && <Alert severity="error">{error}</Alert>}
          </div>
        </Dialog>
      )}
      {disconnecting && (
        <Dialog
          open
          className="pos-payment-dialog"
          title="Disconnect Clover"
          onClose={() => setDisconnecting(false)}
          busy={busy}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setDisconnecting(false)}
              >
                Keep connection
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  void run(() => api.clover.disconnect()).then((ok) => {
                    if (ok) setDisconnecting(false);
                  })
                }
              >
                Disconnect Clover
              </Button>
            </>
          }
        >
          <div className="pos-payment-sections">
            <p>
              Reconcile all original payments and refunds first. This removes
              locally stored credentials and keeps transaction history.
              Uninstall the app in your Clover Merchant Dashboard to revoke its
              provider authorization.
            </p>
            {error && <Alert severity="error">{error}</Alert>}
          </div>
        </Dialog>
      )}
    </div>
  );
}
