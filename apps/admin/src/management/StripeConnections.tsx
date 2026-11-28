import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import {
  safeError,
  type AppError,
  type StripeConnectionBusiness,
  type StripeConnectionOptions,
  type StripeConnectionPage,
  type StripeConnectionTarget,
} from '@market/api';
import {
  Alert,
  Badge,
  Dialog,
  Drawer,
  Dropdown,
  EmptyState,
  ErrorState,
  Field,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandSearch,
  FarmstandTable,
} from '@market/ui/farmstand';
import { cardClassName } from '@market/ui/presentation';
import { IdentityIcon } from '@market/ui/workspace';
import type { ManagementService } from './service';
import { Choice, Pager } from './common';
import { codeLabel } from '../settings/providers';
import { ReadState, text, useRead } from '../vendor/common';
import {
  StripeConnectionBadge,
  StripeStatusDetails,
  stripeDestination,
  stripeReadiness,
} from './stripe-presentation';

type StripeConnectionsService = Pick<
  ManagementService,
  | 'stripeConnections'
  | 'beginPlatformStripeConnect'
  | 'completePlatformStripeConnect'
  | 'refreshPlatformStripeConnection'
>;
type Detail = Pick<
  StripeConnectionBusiness,
  'id' | 'kind' | 'name' | 'status' | 'account' | 'canRefresh'
> & {
  mode: StripeConnectionPage['mode'];
};
const pageSize = 20;
const returnKeys = [
  'stripe_oauth_state',
  'stripe_oauth_code',
  'stripe_oauth_error',
];

function readStripeReturn() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const state = params.get('stripe_oauth_state');
  const code = params.get('stripe_oauth_code');
  const cancelled = params.get('stripe_oauth_error') === '1';
  return state && (code || cancelled) ? { state, code, cancelled } : null;
}

export function StripeConnections({
  service,
}: {
  service: StripeConnectionsService;
}) {
  const [options, setOptions] = useState<StripeConnectionOptions>({
    skip: 0,
    take: pageSize,
  });
  const read = useCallback(
    () => service.stripeConnections(options),
    [service, options],
  );
  const result = useRead('platform-stripe:' + JSON.stringify(options), read);
  const refresh = result.refresh;
  const [oauthReturn] = useState(readStripeReturn);
  const [returnPending, setReturnPending] = useState(!!oauthReturn);
  const [returnFeedback, setReturnFeedback] = useState<{
    message?: string;
    error?: AppError;
  }>({});
  const submitted = useRef(false);
  const currentService = useRef<StripeConnectionsService | undefined>(service);
  const [target, setTarget] = useState<StripeConnectionBusiness>();
  const [detail, setDetail] = useState<Detail>();
  const actionPending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<AppError>();
  const [actionFeedback, setActionFeedback] = useState('');

  useEffect(() => {
    currentService.current = service;
    return () => {
      if (currentService.current === service)
        currentService.current = undefined;
    };
  }, [service]);

  useEffect(() => {
    const clean = new URL(window.location.href);
    const fragment = new URLSearchParams(clean.hash.slice(1));
    if (returnKeys.some((key) => fragment.has(key))) {
      returnKeys.forEach((key) => fragment.delete(key));
      clean.hash = fragment.toString();
      window.history.replaceState(window.history.state, '', clean.href);
    }
    if (!oauthReturn || submitted.current) return;
    submitted.current = true;

    void service
      .completePlatformStripeConnect(
        oauthReturn.state,
        oauthReturn.code,
        oauthReturn.cancelled,
      )
      .then((returned) => {
        if (currentService.current !== service) return;
        if (returned.cancelled) {
          setReturnFeedback({ message: 'Stripe authorization was cancelled.' });
          return;
        }
        const { targetId, targetKind, businessName, account } = returned;
        if (targetId && targetKind && businessName && account) {
          setReturnFeedback({
            message: businessName + ' connected to Stripe Sandbox.',
          });
          setDetail({
            id: targetId,
            kind: targetKind,
            name: businessName,
            mode: 'TEST',
            account,
            status: 'active',
            canRefresh: true,
          });
        }
      })
      .catch((error) => {
        if (currentService.current === service)
          setReturnFeedback({ error: safeError(error) });
      })
      .finally(() => {
        if (currentService.current === service) {
          setReturnPending(false);
          refresh();
        }
      });
  }, [oauthReturn, refresh, service]);

  async function run(action: () => Promise<void>) {
    if (actionPending.current || returnPending) return;
    actionPending.current = true;
    setBusy(true);
    setActionError(undefined);
    setActionFeedback('');
    try {
      await action();
    } catch (error) {
      if (currentService.current === service) setActionError(safeError(error));
    } finally {
      actionPending.current = false;
      if (currentService.current === service) setBusy(false);
    }
  }

  function refreshAccount({ id, kind }: StripeConnectionTarget) {
    return run(async () => {
      const account = await service.refreshPlatformStripeConnection({
        id,
        kind,
      });
      if (currentService.current !== service) return;
      setDetail((open) =>
        open?.id === id && open.kind === kind ? { ...open, account } : open,
      );
      setActionFeedback('Stripe status refreshed.');
      refresh();
    });
  }

  function openDetails(
    business: StripeConnectionBusiness,
    mode: Detail['mode'],
  ) {
    setActionError(undefined);
    setActionFeedback('');
    setDetail({ ...business, mode });
  }

  const data = result.data;
  return (
    <>
      {returnPending && (
        <Alert role="status">Checking Stripe authorization…</Alert>
      )}
      {returnFeedback.message && (
        <Alert role="status">{returnFeedback.message}</Alert>
      )}
      {returnFeedback.error && <ErrorState error={returnFeedback.error} />}
      {!detail && !target && actionError && <ErrorState error={actionError} />}
      {!detail && actionFeedback && (
        <Alert role="status">{actionFeedback}</Alert>
      )}

      {data && (
        <>
          <Alert severity={data.mode === 'LIVE' ? 'warning' : 'info'}>
            <strong>
              {data.mode === 'LIVE'
                ? 'Stripe Live'
                : 'Stripe Sandbox (test mode)'}
            </strong>
            {!data.delegatedOAuthAllowed &&
              (data.mode === 'LIVE'
                ? ' · Businesses connect from their own Settings.'
                : ' · Sandbox connections are unavailable on this server.')}
            {data.collectionSuspended && ' · Payment collection is suspended.'}
          </Alert>
          <dl className="ui-kpi-grid">
            <div>
              <dt>Total businesses</dt>
              <dd>{data.overview.total}</dd>
            </div>
            <div>
              <dt>Connected</dt>
              <dd>{data.overview.connected}</dd>
            </div>
            <div>
              <dt>Ready to accept payments</dt>
              <dd>{data.overview.ready}</dd>
            </div>
            <div>
              <dt>Require attention</dt>
              <dd>{data.overview.attention}</dd>
            </div>
            <div>
              <dt>Without a connection</dt>
              <dd>{data.overview.unconnected}</dd>
            </div>
          </dl>
        </>
      )}

      <StripeConnectionFilters onApply={setOptions} />

      <ReadState {...result} retry={refresh} />
      {data && (
        <>
          {data.items.length ? (
            <StripeConnectionTable
              businesses={data.items}
              descending={options.sort === 'NAME_DESC'}
              busy={busy || returnPending}
              onDetails={(business) => openDetails(business, data.mode)}
              onConnect={(business) => {
                setActionError(undefined);
                setTarget(business);
              }}
              onRefresh={(business) => void refreshAccount(business)}
            />
          ) : (
            <EmptyState title="No matching businesses" />
          )}
          <Pager
            skip={options.skip ?? 0}
            total={data.totalItems}
            count={data.items.length}
            setSkip={(skip) => setOptions({ ...options, skip })}
          />
        </>
      )}

      {target && (
        <Dialog
          open
          title="Connect Stripe Sandbox"
          busy={busy}
          onClose={() => setTarget(undefined)}
          actions={
            <>
              <FarmstandButton
                variant="secondary"
                disabled={busy}
                onClick={() => setTarget(undefined)}
              >
                Cancel
              </FarmstandButton>
              <FarmstandButton
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const { authorizationUrl } =
                      await service.beginPlatformStripeConnect({
                        kind: target.kind,
                        id: target.id,
                      });
                    if (currentService.current === service)
                      window.location.assign(
                        stripeDestination(authorizationUrl),
                      );
                  })
                }
              >
                Continue to Stripe
              </FarmstandButton>
            </>
          }
        >
          <p>
            You are connecting <strong>{target.name}</strong> (
            {target.kind === 'VENDOR' ? 'vendor' : 'market'}) in Stripe Sandbox.
            Select or create the Sandbox account for this business on Stripe.
          </p>
          {actionError && <ErrorState error={actionError} />}
        </Dialog>
      )}

      {detail && (
        <Drawer
          open
          title={detail.name}
          description="Stripe connection details"
          busy={busy}
          onClose={() => setDetail(undefined)}
          actions={
            detail.canRefresh && (
              <FarmstandButton
                variant="secondary"
                disabled={busy}
                onClick={() => void refreshAccount(detail)}
              >
                Refresh status
              </FarmstandButton>
            )
          }
        >
          {detail.status === 'suspended' && (
            <Alert severity="warning">This workspace is suspended.</Alert>
          )}
          <StripeStatusDetails account={detail.account} mode={detail.mode} />
          {actionError && <ErrorState error={actionError} />}
          {actionFeedback && <Alert role="status">{actionFeedback}</Alert>}
        </Drawer>
      )}
    </>
  );
}

function StripeConnectionFilters({
  onApply,
}: {
  onApply: (options: StripeConnectionOptions) => void;
}) {
  return (
    <form
      className={cardClassName({ className: 'filter-bar ui-control-row' })}
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        onApply({
          skip: 0,
          take: pageSize,
          search: text(fields, 'search'),
          kind: (text(fields, 'kind') ||
            null) as StripeConnectionOptions['kind'],
          connection: (text(fields, 'connection') ||
            null) as StripeConnectionOptions['connection'],
          readiness: (text(fields, 'readiness') ||
            null) as StripeConnectionOptions['readiness'],
          attention: text(fields, 'attention') === 'yes' ? true : null,
          sort: text(fields, 'sort') as StripeConnectionOptions['sort'],
        });
      }}
    >
      <Field label="Business name" id="stripe-business-search">
        <FarmstandSearch
          id="stripe-business-search"
          name="search"
          maxLength={80}
        />
      </Field>
      <Choice name="kind" label="Business type" required={false}>
        <option value="">All businesses</option>
        <option value="VENDOR">Vendors</option>
        <option value="MARKET">Markets</option>
      </Choice>
      <Choice name="connection" label="Connection" required={false}>
        <option value="">Any connection status</option>
        <option value="CONNECTED">With a connection</option>
        <option value="NOT_CONNECTED">Not connected</option>
      </Choice>
      <Choice name="readiness" label="Payment readiness" required={false}>
        <option value="">Any readiness</option>
        <option value="READY">Ready</option>
        <option value="NOT_READY">Not ready</option>
      </Choice>
      <Choice name="attention" label="Attention" required={false}>
        <option value="">All businesses</option>
        <option value="yes">Requires attention</option>
      </Choice>
      <Choice name="sort" label="Sort by">
        <option value="NAME_ASC">Name A to Z</option>
        <option value="NAME_DESC">Name Z to A</option>
      </Choice>
      <div className="ui-field-action">
        <FarmstandButton type="submit">Apply filters</FarmstandButton>
      </div>
    </form>
  );
}

function StripeConnectionTable({
  businesses,
  descending,
  busy,
  onDetails,
  onConnect,
  onRefresh,
}: {
  businesses: readonly StripeConnectionBusiness[];
  descending: boolean;
  busy: boolean;
  onDetails: (business: StripeConnectionBusiness) => void;
  onConnect: (business: StripeConnectionBusiness) => void;
  onRefresh: (business: StripeConnectionBusiness) => void;
}) {
  return (
    <FarmstandTable
      label="Stripe connections"
      wide
      headings={[
        'Business',
        'Business type',
        'Stripe connection',
        'Payment status',
        'Payout status',
        'Actions',
      ]}
      sort={{
        heading: 'Business',
        direction: descending ? 'descending' : 'ascending',
      }}
    >
      {businesses.map((business) => {
        const charge = stripeReadiness(
          business.account,
          'ACCEPT_DIRECT_CHARGE',
        );
        const payout = stripeReadiness(business.account, 'RECEIVE_PAYOUT');
        return (
          <tr key={business.kind + ':' + business.id}>
            <th scope="row">
              <div className="markets-identity">
                <IdentityIcon
                  icon={business.kind === 'VENDOR' ? 'user-round' : 'store'}
                  image={business.imageUrl}
                />
                <span>{business.name}</span>
              </div>
            </th>
            <td>{business.kind === 'VENDOR' ? 'Vendor' : 'Market'}</td>
            <td>
              <StripeConnectionBadge account={business.account} />
            </td>
            <td>
              <Badge
                tone={
                  business.ready ? 'success' : charge ? 'warning' : 'neutral'
                }
              >
                {business.ready
                  ? 'Ready'
                  : charge?.ready
                    ? 'Unavailable'
                    : codeLabel(charge?.state ?? 'NOT_READY')}
              </Badge>
            </td>
            <td>
              <Badge
                tone={
                  payout?.ready ? 'success' : payout ? 'warning' : 'neutral'
                }
              >
                {payout?.ready ? 'Ready' : 'Not ready'}
              </Badge>
            </td>
            <td>
              <StripeRowActions
                business={business}
                busy={busy}
                onDetails={() => onDetails(business)}
                onConnect={() => onConnect(business)}
                onRefresh={() => onRefresh(business)}
              />
            </td>
          </tr>
        );
      })}
    </FarmstandTable>
  );
}

function StripeRowActions({
  business,
  busy,
  onDetails,
  onConnect,
  onRefresh,
}: {
  business: StripeConnectionBusiness;
  busy: boolean;
  onDetails: () => void;
  onConnect: () => void;
  onRefresh: () => void;
}) {
  if (business.canConnect) {
    return (
      <FarmstandButton
        size="compact"
        disabled={busy}
        aria-label={'Connect Stripe for ' + business.name}
        onClick={onConnect}
      >
        Connect Stripe
      </FarmstandButton>
    );
  }
  if (!business.account)
    return <span aria-label="No actions available">-</span>;
  if (!business.canRefresh) {
    return (
      <FarmstandButton
        variant="secondary"
        size="compact"
        disabled={busy}
        onClick={onDetails}
      >
        View connection details
      </FarmstandButton>
    );
  }
  const menuAction =
    (action: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      const menu = event.currentTarget.closest('details');
      menu?.removeAttribute('open');
      menu?.querySelector('summary')?.focus();
      action();
    };
  return (
    <Dropdown
      label={
        <>
          Actions<span className="sr-only"> for {business.name}</span>
        </>
      }
    >
      <div className="ui-actions">
        <FarmstandButton
          variant="secondary"
          size="compact"
          disabled={busy}
          onClick={menuAction(onDetails)}
        >
          View connection details
        </FarmstandButton>
        <FarmstandButton
          variant="secondary"
          size="compact"
          disabled={busy}
          onClick={menuAction(onRefresh)}
        >
          Refresh status
        </FarmstandButton>
      </div>
    </Dropdown>
  );
}
