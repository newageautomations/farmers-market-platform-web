import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  createCustomerInboxApi,
  createInboxApi,
  type InboxApi,
  type InboxAction,
  type InboxNotification,
  type InboxPage,
  type InboxFilter,
  type InboxSettings,
  type InboxRule,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Pagination,
  SelectField,
  Spinner,
  Tooltip,
} from './index';
import { buttonClassName, navigationIconPaths } from './presentation';

const roleName = {
  customer: 'Customer',
  vendor: 'Vendor',
  market: 'Market Manager',
  account: 'Account',
};
const icons = {
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
  delete: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  read: 'm3 7 9 6 9-6M3 5h18v14H3Z',
  unsubscribe: 'M4 4l16 16M18 8a6 6 0 0 0-9-5M6 6c0 9-3 9-3 11h14M10 21h4',
};
function Glyph({ icon }: { icon: keyof typeof icons }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[icon]} />
    </svg>
  );
}
const apis = new Map<string, InboxApi>();
const emptySnapshot = {
  page: null as InboxPage | null,
  error: null as unknown,
  version: 0,
};
function createStore(api: InboxApi) {
  let snapshot = emptySnapshot,
    timer: ReturnType<typeof setInterval> | undefined,
    sequence = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((f) => f());
  async function refresh() {
    const current = ++sequence;
    try {
      const page = await api.list({ take: 5 });
      if (current === sequence) {
        snapshot = { page, error: null, version: snapshot.version + 1 };
        emit();
      }
    } catch (error) {
      if (current === sequence) {
        snapshot = { page: null, error, version: snapshot.version + 1 };
        emit();
      }
    }
  }
  return {
    api,
    refresh,
    get: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        void refresh();
        timer = setInterval(() => {
          if (document.visibilityState === 'visible') void refresh();
        }, 60000);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearInterval(timer);
          sequence++;
          snapshot = emptySnapshot;
        }
      };
    },
  };
}
const stores = new WeakMap<InboxApi, ReturnType<typeof createStore>>();
function useStore(api: InboxApi) {
  let store = stores.get(api);
  if (!store) {
    store = createStore(api);
    stores.set(api, store);
  }
  return {
    store,
    snapshot: useSyncExternalStore(
      store.subscribe,
      store.get,
      () => emptySnapshot,
    ),
  };
}
function stamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
export function NotificationContext({
  notification: n,
}: {
  notification: InboxNotification;
}) {
  return (
    <span className="notification-context">
      <NotificationRole context={n.context} />
      {n.workspace_id && <span>{n.business_name}</span>}
    </span>
  );
}
export function NotificationRole({
  context,
}: {
  context: InboxNotification['context'];
}) {
  return (
    <Badge
      tone="neutral"
      className={`notification-role notification-role-${context}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path
          d={
            navigationIconPaths[
              context === 'market'
                ? 'markets'
                : context === 'vendor'
                  ? 'vendors'
                  : context === 'customer'
                    ? 'overview'
                    : 'settings'
            ]
          }
        />
      </svg>
      {roleName[context]}
    </Badge>
  );
}
function IconAction({
  label,
  icon,
  onClick,
  pressed,
  disabled,
}: {
  label: string;
  icon: keyof typeof icons;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={label}>
      <Button
        variant="tertiary"
        iconOnly
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
      >
        <Glyph icon={icon} />
      </Button>
    </Tooltip>
  );
}
export function NotificationActions({
  notification: n,
  busy,
  act,
  unsubscribe,
}: {
  notification: InboxNotification;
  busy: boolean;
  act: (action: InboxAction) => void;
  unsubscribe: () => void;
}) {
  return (
    <div className="notification-actions" aria-label={`Actions for ${n.title}`}>
      <IconAction
        label={n.starred ? 'Unstar notification' : 'Star notification'}
        icon="star"
        pressed={n.starred}
        disabled={busy}
        onClick={() => act(n.starred ? 'unstar' : 'star')}
      />
      <IconAction
        label={n.read_at ? 'Mark unread' : 'Mark read'}
        icon="read"
        disabled={busy}
        onClick={() => act(n.read_at ? 'unread' : 'read')}
      />
      <IconAction
        label="Delete notification"
        icon="delete"
        disabled={busy}
        onClick={() => act('delete')}
      />
      {!n.mandatory && n.delivery_active !== false && (
        <IconAction
          label="Unsubscribe from this source"
          icon="unsubscribe"
          disabled={busy}
          onClick={unsubscribe}
        />
      )}
    </div>
  );
}
function subscriptionInput(n: InboxNotification) {
  return {
    type: n.type,
    context: n.context,
    ...(n.workspace_id ? { workspaceId: n.workspace_id } : {}),
    ...(n.source_id
      ? { sourceKind: n.source_kind, sourceId: n.source_id }
      : {}),
    disabled: true,
  };
}
function sameRule(p: InboxRule, n: InboxNotification) {
  return (
    p.type === n.type &&
    p.context === n.context &&
    p.workspace_id === n.workspace_id &&
    p.source_kind === (n.source_id ? n.source_kind : null) &&
    p.source_id === n.source_id
  );
}
export function NotificationUnsubscribe({
  notification: n,
  settings,
  busy,
  onClose,
  onSave,
}: {
  notification: InboxNotification | null;
  settings: InboxSettings | null;
  busy: boolean;
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => void;
}) {
  return (
    <Dialog
      open={!!n}
      onClose={onClose}
      title="Unsubscribe from this source"
      size="standard"
      busy={busy}
      actions={
        <Button
          disabled={busy || !settings}
          onClick={() => {
            if (n)
              onSave({
                ...subscriptionInput(n),
                expectedRevision:
                  settings?.rules.find((p) => sameRule(p, n))?.revision ?? 0,
              });
          }}
        >
          Unsubscribe
        </Button>
      }
    >
      {n && (
        <>
          <p>
            Stop optional “{n.title}” notifications from {n.sender} for{' '}
            <NotificationRole context={n.context} />
            {n.workspace_id ? `: ${n.business_name}` : ''}.
          </p>
          <p>
            This applies only to this notification type, source and receiving
            account. You will continue receiving required order, participation,
            cancellation, security and compliance notices.
          </p>
          <p>
            Your follow relationships and email or SMS consent stay as they are.
          </p>
          {!settings && <Spinner label="Loading subscription scope" />}
        </>
      )}
    </Dialog>
  );
}

export function NotificationCenter({
  view = 'inbox',
  connection,
  customer = false,
  api: supplied,
  accountId = 'current',
  destination,
  personalOrigin,
}: {
  view?: 'bell' | 'inbox' | 'settings' | 'unsubscribed';
  connection?: { endpoint: string; channelToken?: string };
  customer?: boolean;
  api?: InboxApi;
  accountId?: string;
  destination?: (n: InboxNotification) => string | null;
  personalOrigin?: string;
}) {
  const endpoint = connection?.endpoint,
    channelToken = connection?.channelToken;
  const api = useMemo(() => {
    if (supplied) return supplied;
    const key = customer
      ? 'customer'
      : `${accountId}:${endpoint}:${channelToken}`;
    let existing = apis.get(key);
    if (!existing) {
      existing = customer
        ? createCustomerInboxApi()
        : createInboxApi({
            endpoint: endpoint!,
            channelToken,
          });
      apis.set(key, existing);
    }
    return existing;
  }, [supplied, customer, accountId, endpoint, channelToken]);
  return (
    <NotificationWorkspace
      key={`${accountId}:${customer}:${connection?.channelToken}`}
      api={api}
      view={view}
      destination={destination}
      personalOrigin={personalOrigin}
    />
  );
}
function NotificationWorkspace({
  api,
  view,
  destination,
  personalOrigin,
}: {
  api: InboxApi;
  view: string;
  destination?: (n: InboxNotification) => string | null;
  personalOrigin?: string;
}) {
  const { store, snapshot } = useStore(api),
    [page, setPage] = useState<InboxPage | null>(null),
    [filter, setFilter] = useState<InboxFilter>({ take: 25, skip: 0 }),
    [settings, setSettings] = useState<InboxSettings | null>(null),
    [detail, setDetail] = useState<InboxNotification | null>(null),
    [unsubscribe, setUnsubscribe] = useState<InboxNotification | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState('');
  const lock = useRef(false),
    mounted = useRef(true),
    detailRequest = useRef(0),
    filterKey = JSON.stringify(filter);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (view === 'bell') return;
    let current = true;
    void api
      .list(JSON.parse(filterKey) as InboxFilter)
      .then((p) => {
        if (current) {
          setPage(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (current) setError(e);
      });
    return () => {
      current = false;
    };
  }, [api, filterKey, snapshot.version, view]);
  useEffect(() => {
    if (view === 'bell') return;
    let current = true;
    void api
      .settings()
      .then((s) => {
        if (current) setSettings(s);
      })
      .catch((e) => {
        if (current) setError(e);
      });
    return () => {
      current = false;
    };
  }, [api, view]);
  async function run(work: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await work();
      if (mounted.current) {
        await store.refresh();
        setSelected([]);
      }
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function act(ids: string[], action: InboxAction) {
    void run(async () => {
      await api.mutate({ ids, action });
      if (detail && ids.includes(detail.id)) {
        if (action === 'delete') setDetail(null);
        else setDetail(await api.detail(detail.id));
      }
    });
  }
  async function open(n: InboxNotification) {
    const request = ++detailRequest.current;
    setDetail(null);
    try {
      const current = await api.detail(n.id);
      if (!mounted.current || request !== detailRequest.current) return;
      setDetail(current);
      if (!settings) void api.settings().then(setSettings).catch(setError);
      if (!current.read_at) act([n.id], 'read');
    } catch (e) {
      if (mounted.current) setError(e);
    }
  }
  async function askUnsubscribe(n: InboxNotification) {
    setUnsubscribe(n);
    try {
      setSettings(await api.settings());
    } catch (e) {
      setError(e);
    }
  }
  function update(patch: InboxFilter) {
    setSelected([]);
    setPage(null);
    setFilter((f) => ({ ...f, ...patch, skip: 0 }));
  }
  function related(n: InboxNotification) {
    if (destination) return destination(n);
    if (
      !n.destination ||
      !/^\/(account|vendor|market)(\/|$)/.test(n.destination) ||
      n.destination.includes('\\')
    )
      return null;
    const origin =
      n.context === 'customer' || n.context === 'account'
        ? personalOrigin
        : typeof location !== 'undefined' && location.origin;
    if (!origin) return null;
    const target = new URL(n.destination, origin);
    if (n.workspace_id) {
      const business = settings?.affiliations.find(
        (a) =>
          a.id === n.workspace_id &&
          a.mode === (n.context === 'vendor' ? 'VENDOR' : 'MARKET_MANAGER'),
      );
      if (!business) return null;
      target.searchParams.set('channel', business.channelId);
    }
    return target.toString();
  }
  const actions = (n: InboxNotification) => (
    <NotificationActions
      notification={n}
      busy={busy}
      act={(action) => act([n.id], action)}
      unsubscribe={() => void askUnsubscribe(n)}
    />
  );
  const feedback = (
    <>
      {(error || snapshot.error) && (
        <>
          <ErrorState error={error || snapshot.error} />
          <Button variant="secondary" onClick={() => void store.refresh()}>
            Retry notifications
          </Button>
        </>
      )}
      {message && (
        <Alert role="status" severity="success">
          {message}
        </Alert>
      )}
    </>
  );
  const details = (
    <>
      <Dialog
        open={!!detail}
        onClose={() => {
          detailRequest.current++;
          setDetail(null);
        }}
        title={detail?.title ?? 'Notification'}
        size="standard"
        busy={busy}
      >
        {detail && (
          <>
            <NotificationContext notification={detail} />
            <p>
              {detail.sender} ·{' '}
              <time dateTime={detail.created_at}>
                {stamp(detail.created_at)}
              </time>
            </p>
            <p className="notification-body">{detail.body}</p>
            {actions(detail)}
            {detail.mandatory && (
              <p>This required notification cannot be disabled.</p>
            )}
            {related(detail) && detail.action_label ? (
              <a
                className={buttonClassName({ variant: 'primary' })}
                href={related(detail) ?? undefined}
              >
                {detail.action_label}
              </a>
            ) : (
              <p>The destination is currently unavailable.</p>
            )}
          </>
        )}
      </Dialog>
      <NotificationUnsubscribe
        notification={unsubscribe}
        settings={settings}
        busy={busy}
        onClose={() => setUnsubscribe(null)}
        onSave={(input) =>
          void run(async () => {
            await api.preference(input);
            setSettings(await api.settings());
            setUnsubscribe(null);
            setMessage('Subscription updated. Required notices will continue.');
          })
        }
      />
    </>
  );
  if (view === 'bell')
    return (
      <div className="notification-bell">
        <Dropdown
          label={
            <span className="notification-bell-label">
              <Glyph icon="bell" />
              <span className="sr-only">Notifications</span>
              <span
                aria-label={
                  snapshot.page
                    ? `${snapshot.page.unread} unread notifications`
                    : 'Unread count unavailable'
                }
              >
                {snapshot.page?.unread ?? '…'}
              </span>
            </span>
          }
        >
          <div className="notification-preview">
            {feedback}
            {!snapshot.page && !snapshot.error && (
              <Spinner label="Loading notifications" />
            )}
            {snapshot.page?.items.length === 0 && <p>No notifications yet.</p>}
            {snapshot.page?.items.map((n) => (
              <div key={n.id} className="notification-preview-item">
                <button
                  className="notification-open"
                  onClick={() => void open(n)}
                >
                  <NotificationContext notification={n} />
                  <strong>
                    {!n.read_at && <span aria-label="Unread">● </span>}
                    {n.title}
                  </strong>
                  <span>{n.preview}</span>
                  <time dateTime={n.created_at}>{stamp(n.created_at)}</time>
                </button>
                <IconAction
                  label={n.read_at ? 'Mark unread' : 'Mark read'}
                  icon="read"
                  disabled={busy}
                  onClick={() => act([n.id], n.read_at ? 'unread' : 'read')}
                />
              </div>
            ))}
            <a
              href="/notifications"
              className={buttonClassName({ variant: 'secondary' })}
            >
              Open notification inbox
            </a>
          </div>
        </Dropdown>
        {details}
      </div>
    );
  return (
    <div className="notification-center">
      {feedback}
      <nav aria-label="Notification views" className="ui-tabs">
        {[
          ['/notifications', 'Inbox'],
          ['/notifications/settings', 'Settings'],
          ['/notifications/unsubscribed', 'Unsubscribed'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="ui-route-tab"
            aria-current={
              view === (label === 'Inbox' ? 'inbox' : label!.toLowerCase())
                ? 'page'
                : undefined
            }
          >
            {label}
          </a>
        ))}
      </nav>
      {view === 'settings' || view === 'unsubscribed' ? (
        settings ? (
          <NotificationSettings
            api={api}
            settings={settings}
            view={view}
            busy={busy}
            save={(input) =>
              void run(async () => {
                await api.preference(input);
                setSettings(await api.settings());
                setMessage('Subscription preferences saved.');
              })
            }
          />
        ) : (
          <Spinner label="Loading notification preferences" />
        )
      ) : (
        <>
          <form
            className="notification-filters"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Notification filters"
          >
            <Field id="notification-search" label="Search notifications">
              <Input
                id="notification-search"
                type="search"
                maxLength={120}
                value={filter.search ?? ''}
                onChange={(e) => update({ search: e.target.value })}
              />
            </Field>
            <SelectField
              label="Read status"
              value={filter.state ?? 'all'}
              onChange={(e) => update({ state: e.target.value })}
            >
              {[
                ['all', 'All notifications'],
                ['unread', 'Unread'],
                ['read', 'Read'],
                ['starred', 'Starred'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Receiving role"
              value={filter.context ?? ''}
              onChange={(e) => update({ context: e.target.value })}
            >
              <option value="">All roles</option>
              {Object.keys(roleName).map((v) => (
                <option key={v} value={v}>
                  <NotificationRole context={v as keyof typeof roleName} />
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Receiving business"
              value={filter.workspace ?? ''}
              onChange={(e) => update({ workspace: e.target.value })}
            >
              <option value="">All businesses</option>
              {settings?.affiliations.map((a) => (
                <option
                  key={`${a.mode}:${a.id}`}
                  value={`${a.mode === 'VENDOR' ? 'vendor' : 'market'}:${a.id}`}
                >
                  {a.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Category"
              value={filter.category ?? ''}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">All categories</option>
              {[...new Set(settings?.types.map((t) => t.category) ?? [])].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </SelectField>
            <SelectField
              label="Priority"
              value={filter.severity ?? ''}
              onChange={(e) => update({ severity: e.target.value })}
            >
              <option value="">All priorities</option>
              {['critical', 'operational', 'informational'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectField>
            <Field id="notification-from" label="From date">
              <Input
                id="notification-from"
                type="date"
                value={filter.from ?? ''}
                onChange={(e) => update({ from: e.target.value })}
              />
            </Field>
            <Field id="notification-through" label="Through date">
              <Input
                id="notification-through"
                type="date"
                value={filter.through ?? ''}
                onChange={(e) => update({ through: e.target.value })}
              />
            </Field>
            <label>
              <Checkbox
                checked={filter.actionRequired ?? false}
                onChange={(e) =>
                  update({
                    actionRequired: e.target.checked ? true : undefined,
                  })
                }
              />{' '}
              Action required
            </label>
          </form>
          {!page && !error && <Spinner label="Loading notification inbox" />}
          {page && (
            <>
              <div className="notification-bulk">
                <label>
                  <Checkbox
                    aria-label="Select all notifications on this page"
                    checked={
                      page.items.length > 0 &&
                      selected.length === page.items.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? page.items.map((n) => n.id) : [],
                      )
                    }
                  />{' '}
                  Select this page
                </label>
                <span>{selected.length} selected on this page</span>
                {(['read', 'unread', 'star', 'unstar', 'delete'] as const).map(
                  (action) => (
                    <Button
                      key={action}
                      variant="tertiary"
                      disabled={busy || !selected.length}
                      onClick={() => act(selected, action)}
                    >
                      {
                        {
                          read: 'Mark read',
                          unread: 'Mark unread',
                          star: 'Star',
                          unstar: 'Unstar',
                          delete: 'Delete',
                        }[action]
                      }
                    </Button>
                  ),
                )}
              </div>
              {!page.items.length ? (
                <EmptyState
                  title={
                    filter.state === 'unread'
                      ? 'No unread notifications'
                      : Object.values(filter).some(
                            (v) => typeof v === 'string' && v,
                          )
                        ? 'No notifications match your filters'
                        : 'No notifications yet'
                  }
                >
                  <p>Updates from your authorized accounts appear here.</p>
                </EmptyState>
              ) : (
                <ul
                  className="notification-list"
                  aria-label="Notification inbox"
                >
                  {page.items.map((n) => (
                    <li
                      key={n.id}
                      className={`notification-row ${n.read_at ? '' : 'notification-unread'}`}
                    >
                      <Checkbox
                        aria-label={`Select ${n.title}`}
                        checked={selected.includes(n.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked
                              ? [...s, n.id]
                              : s.filter((id) => id !== n.id),
                          )
                        }
                      />
                      <button
                        className="notification-open"
                        onClick={() => void open(n)}
                      >
                        <NotificationContext notification={n} />
                        <span className="notification-sender">{n.sender}</span>
                        <strong>
                          {!n.read_at && <span aria-label="Unread">● </span>}
                          {n.title}
                        </strong>
                        <span className="notification-text">{n.preview}</span>
                        <time dateTime={n.created_at}>
                          {stamp(n.created_at)}
                        </time>
                      </button>
                      <div className="notification-desktop-actions">
                        {actions(n)}
                      </div>
                      <div className="notification-mobile-actions">
                        <Dropdown label="Actions">{actions(n)}</Dropdown>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination
                hasPrevious={(filter.skip ?? 0) > 0}
                hasNext={
                  (filter.skip ?? 0) + page.items.length < page.totalItems
                }
                onPrevious={() =>
                  setFilter((f) => ({
                    ...f,
                    skip: Math.max(0, (f.skip ?? 0) - 25),
                  }))
                }
                onNext={() =>
                  setFilter((f) => ({ ...f, skip: (f.skip ?? 0) + 25 }))
                }
                summary={`${page.totalItems} notifications`}
              />
            </>
          )}
        </>
      )}
      {details}
    </div>
  );
}

export function NotificationSettings({
  settings,
  view,
  busy,
  save,
}: {
  api: InboxApi;
  settings: InboxSettings;
  view: string;
  busy: boolean;
  save: (input: Record<string, unknown>) => void;
}) {
  const [type, setType] = useState(''),
    [category, setCategory] = useState(''),
    [context, setContext] = useState(''),
    [workspace, setWorkspace] = useState(''),
    [mute, setMute] = useState(''),
    [rule, setRule] = useState<InboxRule | null>(null);
  const [now] = useState(Date.now);
  const active = settings.rules.filter(
    (p) => p.disabled || (p.muted_until && Date.parse(p.muted_until) > now),
  );
  const label = (p: InboxRule) =>
    settings.types.find((t) => t.id === p.type)?.name ??
    p.type_name ??
    p.category ??
    'Optional updates';
  return (
    <>
      <p>
        In-platform preferences belong to you across all account modes. Required
        notices always arrive. These settings do not grant email or SMS consent.
      </p>
      {view === 'settings' && (
        <Card>
          <form
            className="notification-filters"
            onSubmit={(e) => {
              e.preventDefault();
              const input = {
                ...(type ? { type } : {}),
                ...(category ? { category } : {}),
                ...(context ? { context } : {}),
                ...(workspace ? { workspaceId: Number(workspace) } : {}),
                disabled: !mute,
                ...(mute ? { mutedUntil: new Date(mute).toISOString() } : {}),
                expectedRevision: 0,
              };
              const existing = settings.rules.find(
                (p) =>
                  p.type === (type || null) &&
                  p.category === (category || null) &&
                  p.context === (context || null) &&
                  p.workspace_id === (workspace ? Number(workspace) : null) &&
                  !p.source_id,
              );
              save({ ...input, expectedRevision: existing?.revision ?? 0 });
            }}
          >
            <SelectField
              label="Optional notification type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All optional types</option>
              {settings.types
                .filter((t) => !t.mandatory && t.status === 'integrated')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.contexts.map((c) => roleName[c]).join(', ')})
                  </option>
                ))}
            </SelectField>
            <SelectField
              label="Optional category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {[
                ...new Set(
                  settings.types
                    .filter((t) => !t.mandatory && t.status === 'integrated')
                    .map((t) => t.category),
                ),
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectField>
            <SelectField
              label="Receiving account"
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                setWorkspace('');
              }}
            >
              <option value="">All accounts</option>
              {Object.keys(roleName).map((v) => (
                <option key={v} value={v}>
                  <NotificationRole context={v as keyof typeof roleName} />
                </option>
              ))}
            </SelectField>
            {['vendor', 'market'].includes(context) && (
              <SelectField
                label="Workspace"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
              >
                <option value="">All workspaces in this role</option>
                {settings.affiliations
                  .filter(
                    (a) =>
                      a.mode ===
                      (context === 'vendor' ? 'VENDOR' : 'MARKET_MANAGER'),
                  )
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </SelectField>
            )}
            <Field
              id="notification-mute"
              label="Mute until (your local time, optional)"
            >
              <Input
                id="notification-mute"
                type="datetime-local"
                value={mute}
                onChange={(e) => setMute(e.target.value)}
              />
            </Field>
            <Button
              type="submit"
              disabled={busy || (!type && !category && !context)}
            >
              {mute ? 'Mute optional updates' : 'Disable optional updates'}
            </Button>
          </form>
        </Card>
      )}
      {!active.length ? (
        <EmptyState title="No disabled subscriptions">
          <p>Eligible notifications use their default in-platform settings.</p>
        </EmptyState>
      ) : (
        <ul className="notification-rules">
          {active.map((p) => (
            <li key={p.id}>
              <Button variant="tertiary" onClick={() => setRule(p)}>
                {label(p)}
              </Button>
              <span>
                {p.source_name ??
                  (p.source_kind
                    ? `${p.source_kind} ${p.source_id}`
                    : 'All sources')}{' '}
                ·{' '}
                {p.context ? (
                  <NotificationRole
                    context={p.context as keyof typeof roleName}
                  />
                ) : (
                  'All roles'
                )}
                {p.workspace_id
                  ? `: ${settings.affiliations.find((a) => a.id === p.workspace_id && a.mode === (p.context === 'vendor' ? 'VENDOR' : 'MARKET_MANAGER'))?.name ?? p.workspace_id}`
                  : ''}
              </span>
              <span>
                {p.delivery_active === false
                  ? 'Inactive notification type'
                  : p.disabled
                    ? 'Unsubscribed'
                    : `Muted until ${stamp(p.muted_until!)}`}
              </span>
              <Button
                variant="secondary"
                disabled={busy || p.delivery_active === false}
                onClick={() =>
                  save({ id: p.id, expectedRevision: p.revision, remove: true })
                }
              >
                {p.delivery_active === false
                  ? 'History preserved'
                  : 'Resubscribe'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p>
        Restoring one subscription leaves broader category, type and workspace
        rules in effect. Past suppressed notifications are not recreated.
      </p>
      {settings.truncated && (
        <Alert severity="warning">
          The preference limit has been reached. Restore an existing
          subscription before adding another.
        </Alert>
      )}
      <Dialog
        open={!!rule}
        onClose={() => setRule(null)}
        title={rule ? label(rule) : 'Subscription details'}
        size="standard"
      >
        <p>
          Receiving role:{' '}
          {rule?.context ? (
            <NotificationRole context={rule.context as keyof typeof roleName} />
          ) : (
            'All roles'
          )}
          . Source: {rule?.source_kind ?? 'All sources'} {rule?.source_id ?? ''}
          . This rule suppresses only optional matching notifications.
        </p>
        <p>
          Required transactional, security, participation and compliance notices
          continue.
        </p>
      </Dialog>
    </>
  );
}
