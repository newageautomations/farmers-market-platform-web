import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
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
  Checkbox,
  Dialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  SelectField,
  Spinner,
  Tooltip,
} from './index';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPagination,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
} from './farmstand';
import { buttonClassName, navigationIconPaths } from './presentation';

/** Replays the check animation on each user change, never on first render. */
export function replayCheck(event: ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  input.classList.remove('is-toggled');
  void input.offsetWidth;
  input.classList.add('is-toggled');
}
/** Same-tab navigation for in-app links; modified clicks keep native behavior. */
function follow(
  event: MouseEvent<HTMLAnchorElement>,
  navigate?: (href: string) => void,
) {
  if (
    !navigate ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  navigate(event.currentTarget.getAttribute('href')!);
}
const pageSize = 25;
/** The context badge already names the receiving business; skip a repeat. */
function distinctSender(n: InboxNotification) {
  return n.workspace_id && n.sender === n.business_name ? null : n.sender;
}
const panelMotion = 240;
/** Keeps a side panel mounted while its closing animation plays. */
function useClosingPanel() {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    closing,
    close(onClosed: () => void) {
      clearTimeout(timer.current);
      setClosing(true);
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      timer.current = setTimeout(
        () => {
          setClosing(false);
          onClosed();
        },
        reduced ? 0 : panelMotion,
      );
    },
    cancel() {
      clearTimeout(timer.current);
      setClosing(false);
    },
  };
}
const readStates = [
  ['all', 'All notifications'],
  ['unread', 'Unread'],
  ['read', 'Read'],
  ['starred', 'Starred'],
] as const;

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
  restore: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
};
/** Days until a Trash item is permanently deleted, rounded up. */
function daysLeft(n: InboxNotification, now: number) {
  return n.purge_at
    ? Math.max(0, Math.ceil((Date.parse(n.purge_at) - now) / 86400000))
    : null;
}
function purgeLabel(n: InboxNotification, now: number) {
  const days = daysLeft(n, now);
  return days === null
    ? 'In Trash'
    : days <= 1
      ? 'Permanently deleted within a day'
      : `Permanently deleted in ${days} days`;
}
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
  trash = false,
  purge,
}: {
  notification: InboxNotification;
  busy: boolean;
  act: (action: InboxAction) => void;
  unsubscribe: () => void;
  /** Trash rows offer Restore and Delete forever instead. */
  trash?: boolean;
  purge?: () => void;
}) {
  if (trash)
    return (
      <div
        className="notification-actions"
        aria-label={`Actions for ${n.title}`}
      >
        <IconAction
          label="Restore to inbox"
          icon="restore"
          disabled={busy}
          onClick={() => act('restore')}
        />
        <IconAction
          label="Delete forever"
          icon="delete"
          disabled={busy}
          onClick={() => (purge ? purge() : act('purge'))}
        />
      </div>
    );
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
        label="Move to Trash"
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
  tabs = true,
  basePath = '/notifications',
  navigate,
}: {
  view?: 'bell' | 'inbox' | 'trash' | 'settings' | 'unsubscribed';
  connection?: { endpoint: string; channelToken?: string };
  customer?: boolean;
  api?: InboxApi;
  accountId?: string;
  destination?: (n: InboxNotification) => string | null;
  personalOrigin?: string;
  /** False when the host renders its own Inbox/Settings/Unsubscribed menu. */
  tabs?: boolean;
  /** Inbox route for this role, e.g. `/vendor/notifications` or `/account/notifications`. */
  basePath?: string;
  /** In-app navigation for same-application links (Admin keeps its scope). */
  navigate?: (href: string) => void;
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
      tabs={tabs}
      basePath={basePath}
      navigate={navigate}
    />
  );
}
const emptyFilter: InboxFilter = { take: pageSize, skip: 0 };
/** Filters behind the Filters button; search and read status stay visible. */
const hiddenFilterKeys = [
  'context',
  'workspace',
  'category',
  'severity',
  'from',
  'through',
  'actionRequired',
] as const;
function NotificationWorkspace({
  api,
  view,
  destination,
  personalOrigin,
  tabs,
  basePath,
  navigate,
}: {
  api: InboxApi;
  view: string;
  destination?: (n: InboxNotification) => string | null;
  personalOrigin?: string;
  tabs: boolean;
  basePath: string;
  navigate?: (href: string) => void;
}) {
  const { store, snapshot } = useStore(api),
    [page, setPage] = useState<InboxPage | null>(null),
    [filter, setFilter] = useState<InboxFilter>(emptyFilter),
    [filtersOpen, setFiltersOpen] = useState(false),
    [settings, setSettings] = useState<InboxSettings | null>(null),
    [detail, setDetail] = useState<InboxNotification | null>(null),
    [unsubscribe, setUnsubscribe] = useState<InboxNotification | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState(''),
    [purging, setPurging] = useState<string[] | null>(null),
    [shownView, setShownView] = useState(view);
  // Countdown reference time, refreshed whenever the list loads.
  const [now, setNow] = useState(Date.now);
  const trash = view === 'trash';
  // Inbox and Trash share this list; switching between them starts fresh.
  if (shownView !== view) {
    setShownView(view);
    setDetail(null);
    setSelected([]);
    setPage(null);
    setFilter((f) => ({ ...f, skip: 0 }));
  }
  const id = useId();
  const panel = useClosingPanel();
  const lock = useRef(false),
    mounted = useRef(true),
    detailRequest = useRef(0),
    detailHeading = useRef<HTMLHeadingElement>(null),
    detailOrigin = useRef<HTMLElement | null>(null),
    filterKey = JSON.stringify(trash ? { ...filter, state: 'trash' } : filter);
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
          setNow(Date.now());
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
  const detailId = detail?.id;
  useEffect(() => {
    if (view !== 'bell' && detailId) detailHeading.current?.focus();
  }, [detailId, view]);
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
        if (['delete', 'restore', 'purge'].includes(action))
          panel.close(() => setDetail(null));
        else setDetail(await api.detail(detail.id));
      }
      const count =
        ids.length === 1 ? 'Notification' : `${ids.length} notifications`;
      if (action === 'delete')
        setMessage(
          `${count} moved to Trash. Trash is permanently deleted after 30 days.`,
        );
      if (action === 'restore') setMessage(`${count} restored to your inbox.`);
      if (action === 'purge') setMessage(`${count} permanently deleted.`);
    });
  }
  async function open(n: InboxNotification) {
    const request = ++detailRequest.current;
    if (view === 'bell') setDetail(null);
    else detailOrigin.current = document.activeElement as HTMLElement | null;
    try {
      const current = await api.detail(n.id);
      if (!mounted.current || request !== detailRequest.current) return;
      panel.cancel();
      setDetail(current);
      if (!settings) void api.settings().then(setSettings).catch(setError);
      if (!current.read_at && !trash) act([n.id], 'read');
    } catch (e) {
      if (mounted.current) setError(e);
    }
  }
  function closeDetail() {
    detailRequest.current++;
    if (view === 'bell') {
      setDetail(null);
      return;
    }
    panel.close(() => setDetail(null));
    requestAnimationFrame(() => {
      if (detailOrigin.current?.isConnected) detailOrigin.current.focus();
    });
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
      trash={trash}
      purge={() => setPurging([n.id])}
    />
  );
  const purgeDialog = (
    <Dialog
      open={!!purging}
      onClose={() => setPurging(null)}
      title="Delete forever?"
      size="standard"
      busy={busy}
      actions={
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (purging) act(purging, 'purge');
            setPurging(null);
          }}
        >
          Delete forever
        </Button>
      }
    >
      <p>
        {purging?.length === 1
          ? 'This notification will be permanently deleted.'
          : `${purging?.length ?? 0} notifications will be permanently deleted.`}{' '}
        This cannot be undone.
      </p>
    </Dialog>
  );
  const feedback = (
    <>
      {(error || snapshot.error) && (
        <>
          <ErrorState error={error || snapshot.error} />
          <FarmstandButton
            variant="secondary"
            className="notification-retry"
            onClick={() => void store.refresh()}
          >
            Retry notifications
          </FarmstandButton>
        </>
      )}
      {message && (
        <Alert role="status" severity="success">
          {message}
        </Alert>
      )}
    </>
  );
  const unsubscribeDialog = (
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
  );
  const destinationAction = (n: InboxNotification, side = false) =>
    related(n) && n.action_label ? (
      side ? (
        <FarmstandLink variant="primary" href={related(n) ?? undefined}>
          {n.action_label}
        </FarmstandLink>
      ) : (
        <a
          className={buttonClassName({ variant: 'primary' })}
          href={related(n) ?? undefined}
        >
          {n.action_label}
        </a>
      )
    ) : (
      <p className="notification-muted">
        The destination is currently unavailable.
      </p>
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
              href={basePath}
              className={buttonClassName({ variant: 'secondary' })}
              onClick={(event) => follow(event, navigate)}
            >
              Open notification inbox
            </a>
          </div>
        </Dropdown>
        <Dialog
          open={!!detail}
          onClose={closeDetail}
          title={detail?.title ?? 'Notification'}
          size="standard"
          busy={busy}
        >
          {detail && (
            <>
              <NotificationContext notification={detail} />
              <p>
                {distinctSender(detail) && `${distinctSender(detail)} · `}
                <time dateTime={detail.created_at}>
                  {stamp(detail.created_at)}
                </time>
              </p>
              <p className="notification-body">{detail.body}</p>
              {actions(detail)}
              {detail.mandatory && (
                <p>This required notification cannot be disabled.</p>
              )}
              {destinationAction(detail)}
            </>
          )}
        </Dialog>
        {unsubscribeDialog}
      </div>
    );
  const activeFilters = hiddenFilterKeys.filter((key) => !!filter[key]).length;
  const searching = Object.values(filter).some(
    (v) => (typeof v === 'string' && v && v !== 'all') || v === true,
  );
  const skip = filter.skip ?? 0;
  return (
    <div className="notification-center">
      {feedback}
      {tabs && (
        <nav aria-label="Notification views" className="ui-tabs">
          {[
            [basePath, 'Inbox'],
            [`${basePath}/trash`, 'Trash'],
            [`${basePath}/settings`, 'Settings'],
            [`${basePath}/unsubscribed`, 'Unsubscribed'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="ui-route-tab"
              onClick={(event) => follow(event, navigate)}
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
      )}
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
        <div
          className={`notification-columns${detail && !panel.closing ? ' notification-columns-open' : ''}`}
        >
          <FarmstandPanel
            as="section"
            className={`notification-inbox${trash ? ' notification-trash' : ''}`}
            aria-label={trash ? 'Trash' : 'Inbox'}
          >
            {trash && (
              <p className="notification-muted notification-trash-note">
                Deleted notifications stay in Trash for 30 days, then are
                permanently deleted.
              </p>
            )}
            <form
              className="notification-toolbar"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Notification filters"
            >
              <Field
                id={`${id}-search`}
                label={<span className="sr-only">Search notifications</span>}
              >
                <FarmstandSearch
                  id={`${id}-search`}
                  placeholder={
                    trash ? 'Search Trash...' : 'Search notifications...'
                  }
                  maxLength={120}
                  value={filter.search ?? ''}
                  onChange={(e) => update({ search: e.target.value })}
                />
              </Field>
              {!trash && (
                <Field
                  id={`${id}-state`}
                  label={<span className="sr-only">Read status</span>}
                >
                  <FarmstandSelect
                    id={`${id}-state`}
                    value={filter.state ?? 'all'}
                    onChange={(e) => update({ state: e.target.value })}
                  >
                    {readStates.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </FarmstandSelect>
                </Field>
              )}
              <FarmstandButton
                type="button"
                variant="secondary"
                className="notification-filters-toggle"
                aria-expanded={filtersOpen}
                aria-controls={`${id}-filters`}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <FarmstandIcon name="sliders-horizontal" />
                Filters
                {activeFilters > 0 && (
                  <span className="notification-filter-count">
                    {activeFilters}
                    <span className="sr-only"> active</span>
                  </span>
                )}
              </FarmstandButton>
            </form>
            <div
              id={`${id}-filters`}
              className="notification-more-filters farmstand-controls"
              hidden={!filtersOpen}
            >
              <div className="notification-filter-grid">
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
                  {[
                    ...new Set(settings?.types.map((t) => t.category) ?? []),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
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
                <Field id={`${id}-from`} label="From date">
                  <Input
                    id={`${id}-from`}
                    type="date"
                    value={filter.from ?? ''}
                    onChange={(e) => update({ from: e.target.value })}
                  />
                </Field>
                <Field id={`${id}-through`} label="Through date">
                  <Input
                    id={`${id}-through`}
                    type="date"
                    value={filter.through ?? ''}
                    onChange={(e) => update({ through: e.target.value })}
                  />
                </Field>
              </div>
              <div className="notification-filter-footer">
                <label
                  className="ops-check notification-option"
                  htmlFor={`${id}-action`}
                >
                  <Checkbox
                    id={`${id}-action`}
                    checked={filter.actionRequired ?? false}
                    onChange={(e) => {
                      replayCheck(e);
                      update({
                        actionRequired: e.target.checked ? true : undefined,
                      });
                    }}
                  />
                  <span>Action required only</span>
                </label>
                <FarmstandButton
                  type="button"
                  variant="secondary"
                  disabled={!activeFilters}
                  onClick={() =>
                    update(
                      Object.fromEntries(
                        hiddenFilterKeys.map((key) => [key, undefined]),
                      ),
                    )
                  }
                >
                  Clear filters
                </FarmstandButton>
              </div>
            </div>
            {!page && !error && <Spinner label="Loading notification inbox" />}
            {page && (
              <>
                <div className="notification-bulk">
                  <label
                    className="ops-check notification-option"
                    htmlFor={`${id}-page`}
                  >
                    <Checkbox
                      id={`${id}-page`}
                      aria-label="Select all notifications on this page"
                      checked={
                        page.items.length > 0 &&
                        selected.length === page.items.length
                      }
                      disabled={!page.items.length}
                      onChange={(e) => {
                        replayCheck(e);
                        setSelected(
                          e.target.checked ? page.items.map((n) => n.id) : [],
                        );
                      }}
                    />
                    <span>Select this page</span>
                  </label>
                  <span className="notification-muted" aria-live="polite">
                    {selected.length} selected
                  </span>
                  <div className="notification-bulk-actions">
                    {(trash
                      ? (['restore', 'purge'] as const)
                      : ([
                          'read',
                          'unread',
                          'star',
                          'unstar',
                          'delete',
                        ] as const)
                    ).map((action) => (
                      <FarmstandButton
                        key={action}
                        variant="secondary"
                        size="compact"
                        disabled={busy || !selected.length}
                        onClick={() =>
                          action === 'purge'
                            ? setPurging(selected)
                            : act(selected, action)
                        }
                      >
                        {
                          {
                            read: 'Mark read',
                            unread: 'Mark unread',
                            star: 'Star',
                            unstar: 'Unstar',
                            delete: 'Delete',
                            restore: 'Restore',
                            purge: 'Delete forever',
                          }[action]
                        }
                      </FarmstandButton>
                    ))}
                  </div>
                </div>
                {!page.items.length ? (
                  <EmptyState
                    title={
                      trash
                        ? searching
                          ? 'No deleted notifications match your filters'
                          : 'Trash is empty'
                        : filter.state === 'unread'
                          ? 'No unread notifications'
                          : searching
                            ? 'No notifications match your filters'
                            : 'No notifications yet'
                    }
                  >
                    <p>
                      {trash
                        ? 'Notifications you delete appear here for 30 days.'
                        : 'Updates from your authorized accounts appear here.'}
                    </p>
                  </EmptyState>
                ) : (
                  <ul
                    className="notification-list"
                    aria-label={
                      trash ? 'Notification trash' : 'Notification inbox'
                    }
                  >
                    {page.items.map((n) => (
                      <li
                        key={n.id}
                        className={`notification-row${n.read_at ? '' : ' notification-unread'}${n.id === detail?.id && !panel.closing ? ' notification-selected' : ''}`}
                      >
                        <label
                          className="notification-option notification-row-select"
                          htmlFor={`${id}-select-${n.id}`}
                        >
                          <Checkbox
                            id={`${id}-select-${n.id}`}
                            aria-label={`Select ${n.title}`}
                            checked={selected.includes(n.id)}
                            onChange={(e) => {
                              replayCheck(e);
                              setSelected((s) =>
                                e.target.checked
                                  ? [...s, n.id]
                                  : s.filter((id) => id !== n.id),
                              );
                            }}
                          />
                        </label>
                        <button
                          className="notification-open"
                          aria-current={
                            n.id === detail?.id && !panel.closing
                              ? 'true'
                              : undefined
                          }
                          onClick={() => void open(n)}
                        >
                          <NotificationContext notification={n} />
                          {distinctSender(n) && (
                            <span className="notification-sender">
                              {distinctSender(n)}
                            </span>
                          )}
                          <strong>
                            {!n.read_at && <span aria-label="Unread">● </span>}
                            {n.title}
                          </strong>
                          <span className="notification-text">{n.preview}</span>
                          <time dateTime={n.created_at}>
                            {stamp(n.created_at)}
                          </time>
                          {trash && (
                            <span className="notification-purge">
                              {purgeLabel(n, now)}
                            </span>
                          )}
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
                <FarmstandPagination
                  label="Notification pages"
                  hasPrevious={skip > 0}
                  hasNext={skip + page.items.length < page.totalItems}
                  onPrevious={() =>
                    setFilter((f) => ({
                      ...f,
                      skip: Math.max(0, (f.skip ?? 0) - pageSize),
                    }))
                  }
                  onNext={() =>
                    setFilter((f) => ({ ...f, skip: (f.skip ?? 0) + pageSize }))
                  }
                  summary={
                    page.totalItems
                      ? `Showing ${skip + 1} to ${skip + page.items.length} of ${page.totalItems} notifications`
                      : '0 notifications'
                  }
                />
              </>
            )}
          </FarmstandPanel>
          {detail && (
            <div
              className={`notification-detail-slot${panel.closing ? ' is-closing' : ''}`}
            >
              <FarmstandPanel
                as="section"
                className="notification-detail"
                aria-labelledby={`${id}-detail`}
                onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                  if (event.key === 'Escape' && !event.defaultPrevented) {
                    event.preventDefault();
                    closeDetail();
                  }
                }}
              >
                <div className="notification-detail-top">
                  <NotificationContext notification={detail} />
                  <IconButton
                    icon="close"
                    label="Close notification details"
                    variant="tertiary"
                    onClick={closeDetail}
                  />
                </div>
                <h2 id={`${id}-detail`} ref={detailHeading} tabIndex={-1}>
                  {detail.title}
                </h2>
                <p className="notification-muted">
                  {distinctSender(detail) && `${distinctSender(detail)} · `}
                  <time dateTime={detail.created_at}>
                    {stamp(detail.created_at)}
                  </time>
                </p>
                <p className="notification-body">{detail.body}</p>
                {actions(detail)}
                {trash && detail.purge_at && (
                  <p className="notification-purge">
                    In Trash. {purgeLabel(detail, now)} (
                    <time dateTime={detail.purge_at}>
                      {stamp(detail.purge_at)}
                    </time>
                    ).
                  </p>
                )}
                {detail.mandatory && !trash && (
                  <p className="notification-muted">
                    This required notification cannot be disabled.
                  </p>
                )}
                <div className="notification-detail-action">
                  {destinationAction(detail, true)}
                </div>
              </FarmstandPanel>
            </div>
          )}
        </div>
      )}
      {unsubscribeDialog}
      {purgeDialog}
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
  const id = useId();
  const panel = useClosingPanel();
  const active = settings.rules.filter(
    (p) => p.disabled || (p.muted_until && Date.parse(p.muted_until) > now),
  );
  const label = (p: InboxRule) =>
    settings.types.find((t) => t.id === p.type)?.name ??
    p.type_name ??
    p.category ??
    'Optional updates';
  const shown = rule && active.some((p) => p.id === rule.id) ? rule : null;
  return (
    <div className="notification-settings farmstand-controls">
      <p className="notification-muted">
        In-platform preferences belong to you across all account modes. Required
        notices always arrive. These settings do not grant email or SMS consent.
      </p>
      {view === 'settings' && (
        <FarmstandPanel
          as="section"
          className="notification-settings-panel"
          aria-labelledby={`${id}-add`}
        >
          <h2 id={`${id}-add`}>Turn off optional updates</h2>
          <form
            className="notification-settings-form"
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
            <div className="notification-filter-grid">
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
                id={`${id}-mute`}
                label="Mute until (your local time, optional)"
              >
                <Input
                  id={`${id}-mute`}
                  type="datetime-local"
                  value={mute}
                  onChange={(e) => setMute(e.target.value)}
                />
              </Field>
            </div>
            <Button
              type="submit"
              disabled={busy || (!type && !category && !context)}
            >
              {mute ? 'Mute optional updates' : 'Disable optional updates'}
            </Button>
          </form>
        </FarmstandPanel>
      )}
      <div
        className={`notification-columns${shown && !panel.closing ? ' notification-columns-open' : ''}`}
      >
        <FarmstandPanel
          as="section"
          className="notification-settings-panel"
          aria-labelledby={`${id}-rules`}
        >
          <h2 id={`${id}-rules`}>
            {view === 'settings'
              ? 'Disabled and muted subscriptions'
              : 'Unsubscribed notifications'}
          </h2>
          {!active.length ? (
            <EmptyState title="No disabled subscriptions">
              <p>
                Eligible notifications use their default in-platform settings.
              </p>
            </EmptyState>
          ) : (
            <ul className="notification-rules">
              {active.map((p) => (
                <li
                  key={p.id}
                  className={
                    p.id === shown?.id ? 'notification-selected' : undefined
                  }
                >
                  <button
                    type="button"
                    className="notification-rule-name"
                    aria-current={p.id === shown?.id ? 'true' : undefined}
                    onClick={() => {
                      panel.cancel();
                      setRule(p);
                    }}
                  >
                    <span className="farmstand-text-link">{label(p)}</span>
                  </button>
                  <span className="notification-rule-scope">
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
                  <span className="notification-muted">
                    {p.delivery_active === false
                      ? 'Inactive notification type'
                      : p.disabled
                        ? 'Unsubscribed'
                        : `Muted until ${stamp(p.muted_until!)}`}
                  </span>
                  <Button
                    variant="secondary"
                    size="compact"
                    disabled={busy || p.delivery_active === false}
                    onClick={() =>
                      save({
                        id: p.id,
                        expectedRevision: p.revision,
                        remove: true,
                      })
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
          <p className="notification-muted">
            Restoring one subscription leaves broader category, type and
            workspace rules in effect. Past suppressed notifications are not
            recreated.
          </p>
          {settings.truncated && (
            <Alert severity="warning">
              The preference limit has been reached. Restore an existing
              subscription before adding another.
            </Alert>
          )}
        </FarmstandPanel>
        {shown && (
          <div
            className={`notification-detail-slot${panel.closing ? ' is-closing' : ''}`}
          >
            <FarmstandPanel
              as="section"
              className="notification-detail"
              aria-labelledby={`${id}-rule`}
            >
              <div className="notification-detail-top">
                {shown.context ? (
                  <NotificationRole
                    context={shown.context as keyof typeof roleName}
                  />
                ) : (
                  <span className="notification-muted">All roles</span>
                )}
                <IconButton
                  icon="close"
                  label="Close subscription details"
                  variant="tertiary"
                  onClick={() => panel.close(() => setRule(null))}
                />
              </div>
              <h2 id={`${id}-rule`}>{label(shown)}</h2>
              <p>
                Source:{' '}
                {shown.source_name ?? shown.source_kind ?? 'All sources'}
                {!shown.source_name && shown.source_id
                  ? ` ${shown.source_id}`
                  : ''}
                . This rule suppresses only optional matching notifications.
              </p>
              <p className="notification-muted">
                Required transactional, security, participation and compliance
                notices continue.
              </p>
            </FarmstandPanel>
          </div>
        )}
      </div>
    </div>
  );
}
