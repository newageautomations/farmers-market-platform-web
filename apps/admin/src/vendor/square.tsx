import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PosInputError,
  safeError,
  type InPersonApi,
  type SquareIntegration,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  SelectField,
  Spinner,
} from '@market/ui';
import type { VendorService } from './service';
import { RouteLink } from './common';
import './pos.css';
import { PosSaleDetails } from './pos-payments';
import type { PosSale } from '@market/api';
import { CloverPaymentIntegration } from './clover';

export function squareMobileReturn(search: string) {
  if (search.length > 10000) throw new Error('Invalid Square return');
  const params = new URLSearchParams(search);
  if (params.has('data')) {
    const data = JSON.parse(params.get('data')!);
    if (typeof data.state !== 'string')
      throw new Error('Square did not return the original payment state');
    return {
      state: data.state,
      transactionId:
        typeof data.transaction_id === 'string'
          ? data.transaction_id
          : undefined,
    };
  }
  const state = params.get('com.squareup.pos.REQUEST_METADATA');
  if (!state)
    throw new Error(
      'Square POS app did not return a verifiable payment. Check the original sale.',
    );
  return {
    state,
    transactionId:
      params.get('com.squareup.pos.SERVER_TRANSACTION_ID') ?? undefined,
  };
}
export function SquareMobileReturn({ service }: { service: VendorService }) {
  const [sale, setSale] = useState<PosSale | null>(null),
    [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const search = window.location.search;
    window.history.replaceState(null, '', window.location.pathname);
    void Promise.resolve()
      .then(() => {
        const result = squareMobileReturn(search);
        if (!service.pos) throw new Error('Checkout is unavailable');
        return service.pos.squareMobileCallback(
          result.state,
          result.transactionId,
        );
      })
      .then(setSale)
      .catch((e) =>
        setError(
          e instanceof PosInputError
            ? e.message
            : e instanceof Error
              ? e.message
              : safeError(e).message,
        ),
      );
  }, [service]);
  return (
    <div className="pos-payment-sections">
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : sale ? (
        <>
          <Alert severity={sale.state === 'COMPLETED' ? 'success' : 'warning'}>
            {sale.state === 'COMPLETED'
              ? 'Payment verified and sale completed.'
              : 'Square has not supplied sufficient payment evidence. Check the original sale before collecting money again.'}
          </Alert>
          <PosSaleDetails sale={sale} />
        </>
      ) : (
        <Spinner label="Verifying the original Square payment" />
      )}
      <div className="ui-actions">
        <RouteLink to="/vendor/pos">Return to In-Person Checkout</RouteLink>
      </div>
    </div>
  );
}

export function VendorPaymentIntegrations({
  service,
}: {
  service: VendorService;
}) {
  if (
    !service.pos ||
    !service.context.permissions.includes('ManageOwnPosIntegrations')
  )
    return (
      <Alert severity="warning">
        Payment integrations require vendor owner access.
      </Alert>
    );
  return (
    <div className="pos-payment-sections" key={service.vendorId}>
      <SquarePaymentIntegration api={service.pos} />
      <CloverPaymentIntegration api={service.pos} />
    </div>
  );
}
/** Domain composition. Existing primitives do not manage processor authorization or pairing. */
export function SquarePaymentIntegration({ api }: { api: InPersonApi }) {
  const [data, setData] = useState<SquareIntegration | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(''),
    [label, setLabel] = useState(''),
    [virtual, setVirtual] = useState(''),
    [adding, setAdding] = useState(false),
    [disconnecting, setDisconnecting] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true),
    initialized = useRef(false),
    addKey = useRef(crypto.randomUUID());
  const accept = useCallback((next: SquareIntegration) => {
    setData(next);
    setLocation(next.connection?.locationId ?? '');
    setVirtual(next.virtualDevices[0]?.id ?? '');
  }, []);
  async function run(work: () => Promise<SquareIntegration>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await work();
      if (mounted.current) accept(next);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof PosInputError ? e.message : safeError(e).message);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    if (initialized.current)
      return () => {
        mounted.current = false;
      };
    initialized.current = true;
    const params = new URLSearchParams(window.location.search),
      code = params.get('code'),
      state = params.get('state'),
      oauthError = params.get('error');
    // Authorization codes are transient. Remove from address/history before any async work.
    if (code || state || oauthError) {
      for (const key of ['code', 'state', 'error', 'error_description'])
        params.delete(key);
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${params.size ? '?' + params : ''}`,
      );
    }
    void Promise.resolve().then(async () => {
      try {
        const next = await (code && state
          ? api.square.complete(state, code)
          : api.square.settings());
        if (mounted.current) {
          accept(next);
          if (oauthError)
            setError(
              'Square authorization was cancelled or denied. Connect again when ready.',
            );
        }
      } catch (e) {
        if (mounted.current)
          setError(
            e instanceof PosInputError ? e.message : safeError(e).message,
          );
      }
    });
    return () => {
      mounted.current = false;
    };
  }, [api, accept]);
  async function connect() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const { url } = await api.square.begin(),
        parsed = new URL(url);
      if (
        ![
          'https://connect.squareupsandbox.com',
          'https://connect.squareup.com',
        ].includes(parsed.origin) ||
        parsed.pathname !== '/oauth2/authorize'
      )
        throw new Error('Unexpected authorization destination');
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof PosInputError ? e.message : safeError(e).message);
      lock.current = false;
      setBusy(false);
    }
  }
  if (!data && !error) return <Spinner label="Loading payment integrations" />;
  const connected = data?.connection?.status === 'CONNECTED';
  return (
    <div className="pos-payment-sections square-integration">
      {error && <Alert severity="error">{error}</Alert>}
      {data?.connectionError && (
        <Alert severity="warning">{data.connectionError}</Alert>
      )}
      {busy && <Spinner label="Checking Square" />}
      <Card spacing="contained">
        <div className="pos-payment-sections">
          <p>
            Connect Square to receive card payments in your own merchant
            account.
          </p>
          {!data?.configured ? (
            <Alert severity="info">
              Square needs backend configuration. Cash and the local test
              terminal remain available.
            </Alert>
          ) : (
            <>
              <div className="ui-actions">
                {data.nativeReaderReason && (
                  <Alert severity="info">{data.nativeReaderReason}</Alert>
                )}
                <Badge tone={connected ? 'success' : 'warning'}>
                  {data.connection?.status.toLowerCase().replaceAll('_', ' ') ??
                    'Not connected'}
                </Badge>
                <Badge tone="info">{data.environment}</Badge>
              </div>
              {data.qualification === 'FIXTURE' && (
                <Alert severity="warning">
                  Controlled SDK fixture only. This account has not been
                  authorized by Square and no Square API is contacted.
                </Alert>
              )}
              {data.connection && (
                <dl className="pos-totals">
                  <div>
                    <dt>Merchant</dt>
                    <dd>{data.connection.merchant}</dd>
                  </div>
                  <div>
                    <dt>Square merchant reference</dt>
                    <dd>{data.connection.merchantId}</dd>
                  </div>
                  <div>
                    <dt>Payment location</dt>
                    <dd>{data.connection.location ?? 'Choose a location'}</dd>
                  </div>
                </dl>
              )}
              <div className="ui-actions">
                {data.oauthAvailable && (
                  <Button disabled={busy} onClick={() => void connect()}>
                    {connected ? 'Reconnect Square' : 'Connect Square'}
                  </Button>
                )}
                {!connected && data.sandboxImportAvailable && (
                  <Button
                    disabled={busy}
                    onClick={() => void run(() => api.square.importSandbox())}
                  >
                    Connect configured Sandbox test account
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void run(() => api.square.settings())}
                >
                  Check connection
                </Button>
                {data.connection &&
                  !['DISCONNECTED', 'REVOKED'].includes(
                    data.connection.status,
                  ) && (
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => setDisconnecting(true)}
                    >
                      Disconnect Square
                    </Button>
                  )}
              </div>
              {data.environment === 'Sandbox' && (
                <Alert severity="info">
                  Square Sandbox virtual devices simulate provider payments.
                  They are not physically paired terminals. Successful test
                  totals must be $25 or less.
                </Alert>
              )}
            </>
          )}
        </div>
      </Card>
      {connected && (
        <>
          <Card spacing="contained">
            <div className="pos-payment-sections">
              <SelectField
                id="square-location"
                label="Default payment location"
                value={location}
                disabled={busy}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Choose an authorized location</option>
                {data.locations.map((l) => (
                  <option key={l.id} value={l.id} disabled={!l.eligible}>
                    {l.name} ({l.currency}, {l.status.toLowerCase()})
                  </option>
                ))}
              </SelectField>
              <div className="ui-actions">
                <Button
                  disabled={
                    busy ||
                    !location ||
                    location === data.connection?.locationId
                  }
                  onClick={() => void run(() => api.square.location(location))}
                >
                  Save payment location
                </Button>
              </div>
            </div>
          </Card>
          <Card spacing="contained">
            <div className="pos-payment-sections">
              <div className="ui-actions">
                <Button
                  disabled={busy || !data.connection?.locationId}
                  onClick={() => {
                    addKey.current = crypto.randomUUID();
                    setAdding(true);
                  }}
                >
                  Add{' '}
                  {data.environment === 'Sandbox'
                    ? 'Sandbox virtual terminal'
                    : 'Terminal'}
                </Button>
              </div>
              {!data.devices.length && (
                <p>No terminals are configured for this connection.</p>
              )}
              {data.devices.map((d) => (
                <div className="pos-payment-sections" key={d.id}>
                  <dl className="pos-totals">
                    <div>
                      <dt>Terminal</dt>
                      <dd>
                        {d.label}
                        {d.isDefault ? ' (default)' : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {data.locations.find((l) => l.id === d.locationId)
                          ?.name ?? d.locationId}
                      </dd>
                    </div>
                    <div>
                      <dt>Device reference</dt>
                      <dd>
                        {d.providerId ? `…${d.providerId}` : 'Awaiting pairing'}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        {d.kind === 'VIRTUAL'
                          ? 'Sandbox virtual device'
                          : d.status.toLowerCase()}
                      </dd>
                    </div>
                    <div>
                      <dt>Availability</dt>
                      <dd>{d.availability}</dd>
                    </div>
                  </dl>
                  {d.code && (
                    <p role="status">
                      Enter pairing code <strong>{d.code}</strong> on your
                      Square Terminal before{' '}
                      {d.pairBy
                        ? new Date(d.pairBy).toLocaleString()
                        : 'it expires'}
                      .
                    </p>
                  )}
                  <div className="ui-actions">
                    {d.kind === 'PHYSICAL' && (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(() => api.square.terminal(d.id, 'poll'))
                        }
                      >
                        Check pairing
                      </Button>
                    )}
                    {!d.isDefault &&
                      ['PAIRED', 'VIRTUAL'].includes(d.status) && (
                        <Button
                          variant="secondary"
                          disabled={
                            busy || d.locationId !== data.connection?.locationId
                          }
                          onClick={() =>
                            void run(() => api.square.terminal(d.id, 'default'))
                          }
                        >
                          Use by default
                        </Button>
                      )}
                    <Button
                      variant="tertiary"
                      disabled={busy}
                      onClick={() =>
                        void run(() => api.square.terminal(d.id, 'remove'))
                      }
                    >
                      Remove from checkout
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      {data?.mobileReason && <Alert severity="info">{data.mobileReason}</Alert>}
      <div className="ui-actions">
        <RouteLink to="/vendor/pos">Open In-Person Checkout</RouteLink>
      </div>
      {adding && (
        <Dialog
          open
          title={
            data?.environment === 'Sandbox'
              ? 'Add Sandbox virtual terminal'
              : 'Pair Square Terminal'
          }
          onClose={() => setAdding(false)}
          busy={busy}
          className="pos-payment-dialog"
          actions={
            <Button
              disabled={busy || !label.trim()}
              onClick={() =>
                void run(async () => {
                  const next = await api.square.addTerminal({
                    key: addKey.current,
                    label,
                    ...(data?.environment === 'Sandbox'
                      ? { virtualId: virtual }
                      : {}),
                  });
                  setAdding(false);
                  setLabel('');
                  return next;
                })
              }
            >
              Add terminal
            </Button>
          }
        >
          <div className="pos-payment-sections">
            {error && <Alert severity="error">{error}</Alert>}
            <Field id="square-terminal-label" label="Terminal label">
              <Input
                id="square-terminal-label"
                value={label}
                maxLength={100}
                disabled={busy}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
            {data?.environment === 'Sandbox' && (
              <SelectField
                id="square-virtual"
                label="Square Sandbox device"
                value={virtual}
                disabled={busy}
                onChange={(e) => setVirtual(e.target.value)}
              >
                {data.virtualDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </SelectField>
            )}
            <p>
              {data?.environment === 'Sandbox'
                ? 'This virtual device uses Square Sandbox APIs and does not pair physical hardware.'
                : 'Enter the returned code on a compatible Square Terminal. If it expires, add a new pairing request.'}
            </p>
          </div>
        </Dialog>
      )}
      {disconnecting && (
        <Dialog
          open
          title="Disconnect Square"
          busy={busy}
          onClose={() => setDisconnecting(false)}
          actions={
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const next = await api.square.disconnect();
                  setDisconnecting(false);
                  return next;
                })
              }
            >
              Disconnect Square
            </Button>
          }
        >
          <p>
            Revoke this connection after resolving pending payments and refunds.
            Existing purchase records are retained.
          </p>
          {error && <Alert severity="error">{error}</Alert>}
        </Dialog>
      )}
    </div>
  );
}
