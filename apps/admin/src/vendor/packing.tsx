import {
  useCallback,
  useEffect,
  useRef,
  useId,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import {
  Badge,
  Button,
  Card,
  UtilityIcon,
  Dialog,
  RecordCard,
  SearchSelect,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Spinner,
  Tabs,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
} from '@market/ui/farmstand';
import {
  safeError,
  type PackingApi,
  type PackingCommand,
  type PackingCustomer,
  type PackingProduct,
  type PackingView,
} from '@market/api';
import { disclosureClassName } from '@market/ui/presentation';
import { mayCommand } from '@market/admin-core';
import type { VendorService } from './service';
import { RouteLink, useRead } from './common';
import { date } from '../market/presentation';
import '../market/phase14/attendance.css';
import '@market/ui/farmstand.css';
import './order-detail.css';
import './orders.css';
import '../workspace-menu.css';
import './packing.css';
import { QuantityStepper } from './QuantityStepper';

export function PackingBadge({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === 'Packed'
          ? 'success'
          : ['Partially Packed', 'Overpacked'].includes(status)
            ? 'warning'
            : 'neutral'
      }
    >
      {status}
    </Badge>
  );
}
export function PackingCardStatus({
  api,
  occurrenceId,
}: {
  api: PackingApi;
  occurrenceId: number;
}) {
  const load = useCallback(() => api.read(occurrenceId), [api, occurrenceId]);
  const read = useRead(`packing-card:${occurrenceId}`, load);
  return (
    <div className="packing-card-status">
      {read.loading && <Spinner label="Loading packing status" />}
      {read.error && <p role="status">Packing status unavailable</p>}
      {read.data && (
        <>
          <PackingBadge status={read.data.summary.status} />
          <span>
            {read.data.summary.packed} / {read.data.summary.required} units
            gathered
          </span>
          {read.data.summary.customersRemaining > 0 && (
            <span>
              {read.data.summary.customersRemaining} customer lists incomplete
            </span>
          )}
        </>
      )}
      <RouteLink to={`/vendor/orders/packing?occurrence=${occurrenceId}`}>
        Packing &amp; Fulfillment
      </RouteLink>
    </div>
  );
}
export function VendorPacking({ service }: { service: VendorService }) {
  const api = service.packing;
  const load = useCallback(() => api!.occurrences(), [api]);
  const read = useRead(`packing-occurrences:${service.vendorId}`, load, !!api);
  const [occurrenceId, select] = useState(
      () =>
        Number(new URLSearchParams(window.location.search).get('occurrence')) ||
        0,
    ),
    [now] = useState(Date.now);
  const selected =
    occurrenceId ||
    read.data?.find(
      (o) => new Date(o.endsAt).getTime() >= now && o.status !== 'cancelled',
    )?.id ||
    read.data?.[0]?.id ||
    0;
  const occurrences = read.data ?? [],
    markets = [...new Set(occurrences.map((o) => o.marketName))],
    market =
      occurrences.find((o) => o.id === selected)?.marketName ??
      markets[0] ??
      '',
    marketDates = occurrences.filter((o) => o.marketName === market);
  const choose = (id: number) => {
    select(id);
    const url = new URL(window.location.href);
    url.searchParams.set('occurrence', String(id));
    window.history.replaceState(null, '', url);
  };
  const filters = (
    <FarmstandPanel className="orders-toolbar packing-toolbar">
      <div className="packing-occurrence-filters">
        <Field id="packing-market" label="Market">
          <FarmstandSelect
            id="packing-market"
            icon="store"
            value={market}
            onChange={(e) => {
              const dates = occurrences.filter(
                (o) => o.marketName === e.target.value,
              );
              const next =
                dates.find(
                  (o) =>
                    new Date(o.endsAt).getTime() >= now &&
                    o.status !== 'cancelled',
                ) ?? dates[0];
              if (next) choose(next.id);
            }}
          >
            {!markets.length && <option value="">No markets available</option>}
            {markets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </FarmstandSelect>
        </Field>
        <Field id="packing-occurrence" label="Market date">
          <FarmstandSelect
            id="packing-occurrence"
            icon="calendar-days"
            value={String(selected)}
            onChange={(e) => choose(Number(e.target.value))}
          >
            {!marketDates.length && (
              <option value="0">No market dates available</option>
            )}
            {marketDates.map((o) => (
              <option key={o.id} value={o.id}>
                {date(o.startsAt, o.timezone)}
                {o.status === 'cancelled' ? ' (cancelled)' : ''}
              </option>
            ))}
          </FarmstandSelect>
        </Field>
      </div>
    </FarmstandPanel>
  );
  if (!api)
    return <EmptyState title="Packing is unavailable in this environment" />;
  return (
    <div className="order-detail orders-page packing-page">
      <header className="order-page-heading">
        <div className="order-heading-title">
          <span className="order-heading-icon">
            <FarmstandIcon name="package" />
          </span>
          <div>
            <h1>Packing &amp; Fulfillment</h1>
            <p>
              Gather products and complete customer packing lists for each
              market date.
            </p>
          </div>
        </div>
      </header>
      <section className="packing-workspace">
        {read.loading && <Spinner label="Loading market dates" />}
        {read.error && <ErrorState error={read.error} />}
        {read.data && (
          <>
            {filters}
            {selected ? (
              <PackingOccurrence
                key={`${service.vendorId}:${selected}`}
                api={api}
                service={service}
                occurrenceId={selected}
              />
            ) : (
              <EmptyState title="No planned market appearances" />
            )}
          </>
        )}
      </section>
    </div>
  );
}
function PackingOccurrence({
  api,
  service,
  occurrenceId,
}: {
  api: PackingApi;
  service: VendorService;
  occurrenceId: number;
}) {
  const [data, setData] = useState<PackingView | null>(null),
    [error, setError] = useState<ReturnType<typeof safeError> | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [productId, selectProduct] = useState<string | null>(null),
    // Counts user-initiated opens; the automatic top-product panel does not take focus.
    [productFocus, setProductFocus] = useState(0),
    [customerFocus, setCustomerFocus] = useState(0),
    [customerKey, selectCustomer] = useState<string | null>(null),
    [search, setSearch] = useState(''),
    [planSelection, setPlanSelection] = useState<string | null | undefined>(
      undefined,
    );
  const mounted = useRef(true),
    pending = useRef(false),
    refreshGeneration = useRef(0),
    dataRef = useRef<PackingView | null>(null),
    saveQueue = useRef<Promise<unknown>>(Promise.resolve()),
    queued = useRef(0),
    saveEpoch = useRef(0);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    api
      .read(occurrenceId)
      .then((result) => {
        if (!cancelled) {
          dataRef.current = result;
          setData(result);
          selectProduct(result.products[0]?.variantId ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(safeError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [api, occurrenceId]);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    const generation = ++refreshGeneration.current;
    try {
      const next = await api.read(occurrenceId);
      if (mounted.current && generation === refreshGeneration.current) {
        dataRef.current = next;
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (mounted.current && generation === refreshGeneration.current)
        setError(safeError(e));
    }
  }, [api, occurrenceId]);
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  const run = (command: PackingCommand): Promise<boolean> => {
    if (!dataRef.current) return Promise.resolve(false);
    const epoch = saveEpoch.current;
    refreshGeneration.current++;
    pending.current = true;
    queued.current++;
    if (mounted.current) {
      setBusy(true);
      setError(null);
      setSaved(false);
    }
    const task = async () => {
      try {
        if (epoch !== saveEpoch.current || !dataRef.current) return false;
        const result = await api.command(dataRef.current, command);
        dataRef.current = result;
        if (mounted.current) {
          setData(result);
          setSaved(queued.current === 1);
        }
        return true;
      } catch (e) {
        saveEpoch.current++;
        if (mounted.current) {
          setError(safeError(e));
          setSaved(false);
        }
        try {
          const result = await api.read(occurrenceId);
          dataRef.current = result;
          if (mounted.current) setData(result);
        } catch {
          dataRef.current = null;
          if (mounted.current) setData(null);
        }
        return false;
      } finally {
        queued.current--;
        if (!queued.current) {
          pending.current = false;
          if (mounted.current) setBusy(false);
        }
      }
    };
    const result = saveQueue.current.then(task);
    saveQueue.current = result;
    return result;
  };
  // Saves run through an ordered queue, so controls stay enabled (and do not
  // flicker) while one is in flight; only the modal form waits on `busy`.
  const disabled =
    loading ||
    !mayCommand(service.context, 'FulfillOwnOrders') ||
    data?.occurrence.status === 'cancelled';
  const product = data?.products.find((p) => p.variantId === productId),
    customer = data?.customers.find((c) => c.key === customerKey);
  const master = (
    <div className={`attendance-columns ${product ? 'has-selection' : ''}`}>
      <div className="packing-list-content">
        {!data?.products.length && (
          <EmptyState title="Nothing planned yet">
            <p>
              Add walk-up inventory. Eligible preorders appear automatically.
            </p>
          </EmptyState>
        )}
        <ul className="packing-list">
          {data?.products.map((p) => (
            <li key={p.variantId}>
              <RecordCard
                title={p.name}
                label={p.name}
                className="packing-item-card"
                onOpen={() => {
                  selectProduct(p.variantId);
                  setProductFocus((count) => count + 1);
                }}
                renderTrigger={(props) => (
                  <Button
                    {...props}
                    className={`${props.className} sr-only`}
                    aria-expanded={p.variantId === productId}
                  />
                )}
                summary={
                  <div className="packing-row">
                    <PackingImage key={p.image} image={p.image} />
                    <div className="packing-item-name">
                      {p.name}
                      <small>
                        {p.planned} planned + {p.preorders} preorder
                      </small>
                    </div>
                    <div className="packing-item-progress">
                      <div>
                        {p.packed} / {p.required} packed{' '}
                        <PackingBadge status={p.status} />
                      </div>
                      <PackingProgress
                        required={p.required}
                        packed={p.packed}
                        label={`${p.name} packing progress`}
                      />
                    </div>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      </div>
      {product && (
        <PackingInspector
          key={product.variantId}
          title={product.name}
          close={() => selectProduct(null)}
          busy={busy}
          focusRequest={productFocus}
        >
          <div className="packing-inspector-status">
            <p>
              {product.planned} walk-up + {product.preorders} preorder ={' '}
              {product.required} required
            </p>
            <PackingBadge status={product.status} />
          </div>
          <PackingProgress
            required={product.required}
            packed={product.packed}
            label="Product packing progress"
          />
          <FarmstandButton
            variant="secondary"
            disabled={disabled}
            onClick={() => setPlanSelection(product.variantId)}
          >
            Edit walk-up inventory
          </FarmstandButton>
          <ProductQuantity
            key={product.variantId}
            product={product}
            disabled={disabled}
            run={run}
          />
        </PackingInspector>
      )}
    </div>
  );
  const individual = (
    <div className={`attendance-columns ${customer ? 'has-selection' : ''}`}>
      <div className="packing-list-content">
        <FarmstandPanel className="orders-toolbar packing-toolbar">
          <Field id="packing-search" label="Search customers or order numbers">
            <FarmstandSearch
              id="packing-search"
              placeholder="Customer name or order number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </FarmstandPanel>
        <ul className="packing-list">
          {data?.customers
            .filter((c) =>
              `${c.name} ${c.orderCodes.join(' ')}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((c) => (
              <li key={c.key}>
                <RecordCard
                  title={`${c.name} ${c.orderCodes.join(', ')}`}
                  label={c.name}
                  className="packing-item-card"
                  onOpen={() => {
                    selectCustomer(c.key);
                    setCustomerFocus((count) => count + 1);
                  }}
                  renderTrigger={(props) => (
                    <Button
                      {...props}
                      className={`${props.className} sr-only`}
                      aria-expanded={c.key === customerKey}
                    />
                  )}
                  summary={
                    <div className="packing-row packing-customer-row">
                      <div className="packing-customer-identity">
                        <span className="packing-customer-name">{c.name}</span>
                        <small className="packing-order-codes">
                          {c.orderCodes.join(', ')}
                        </small>
                        {!!c.availablePacked && (
                          <small className="packing-available-summary">
                            {c.availablePacked} already packed units available
                          </small>
                        )}
                      </div>
                      <div className="packing-item-progress">
                        <div>
                          {c.packed} / {c.required} packed{' '}
                          <PackingBadge status={c.status} />
                        </div>
                        <PackingProgress
                          required={c.required}
                          packed={c.packed}
                          label={`${c.name} packing progress`}
                        />
                      </div>
                    </div>
                  }
                />
              </li>
            ))}
        </ul>
        {!data?.customers.length && (
          <EmptyState title="No eligible preorders for this date" />
        )}
        {!!data?.customers.length &&
          !data.customers.some((c) =>
            `${c.name} ${c.orderCodes.join(' ')}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) && <EmptyState title="No matching customers or orders" />}
      </div>
      {customer && (
        <PackingInspector
          key={customer.key}
          title={customer.name}
          compact
          close={() => selectCustomer(null)}
          busy={busy}
          focusRequest={customerFocus}
        >
          <CustomerChecklist
            customer={customer}
            data={data!}
            disabled={disabled}
            run={run}
          />
        </PackingInspector>
      )}
    </div>
  );
  return (
    <div className="packing-occurrence">
      {planSelection !== undefined && (
        <PlanProduct
          key={`${planSelection ?? 'add'}:${data?.products.find((p) => p.variantId === planSelection)?.planned ?? 0}`}
          service={service}
          disabled={disabled || busy}
          busy={busy}
          run={run}
          editProduct={data?.products.find(
            (p) => p.variantId === planSelection,
          )}
          onClose={() => setPlanSelection(undefined)}
        />
      )}
      {data && (
        <FarmstandPanel className="packing-summary">
          <div className="packing-summary-header">
            <h2>Packing summary</h2>
            <p className="packing-save-status" role="status">
              {saved ? 'Packing saved' : '\u00a0'}
            </p>
          </div>
          <ul aria-label="Packing summary" className="packing-summary-list">
            <li className="packing-summary-primary">
              <FarmstandIcon name="package" />
              <span>{data.summary.distinct} products</span>
            </li>
            <li className="packing-summary-success">
              <FarmstandIcon name="circle-check" />
              <span>{data.summary.fullyPacked} fully packed</span>
            </li>
            <li className="packing-summary-warning">
              <UtilityIcon name="clock" />
              <span>{data.summary.partiallyPacked} partially packed</span>
            </li>
            <li className="packing-summary-progress">
              <span>{data.summary.progress}% gathered</span>
              <PackingProgress
                required={data.summary.required}
                packed={
                  data.summary.gathered ??
                  data.products.reduce(
                    (total, item) =>
                      total + Math.min(item.packed, item.required),
                    0,
                  )
                }
                label="Overall packing progress"
              />
            </li>
          </ul>
          <FarmstandButton
            className="packing-summary-action"
            disabled={disabled}
            onClick={() => setPlanSelection(null)}
          >
            <FarmstandIcon name="plus" />
            Add walk-up inventory
          </FarmstandButton>
        </FarmstandPanel>
      )}
      {loading && <Spinner label="Loading packing lists" />}
      {error && <ErrorState error={error} />}
      {data && (
        <>
          {data.occurrence.status === 'cancelled' && (
            <p role="status">
              This occurrence is cancelled. Packing is read-only.
            </p>
          )}
          <Tabs
            className="workspace-menu packing-tabs"
            items={[
              {
                label: 'Master List',
                content: master,
                icon: <FarmstandIcon name="layers" />,
              },
              {
                label: 'Individual Lists',
                content: individual,
                icon: <FarmstandIcon name="user-round" />,
              },
            ]}
            onChange={(label) => {
              selectProduct(
                label === 'Master List'
                  ? (dataRef.current?.products[0]?.variantId ?? null)
                  : null,
              );
              selectCustomer(
                label === 'Individual Lists'
                  ? (dataRef.current?.customers.find((c) =>
                      `${c.name} ${c.orderCodes.join(' ')}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )?.key ?? null)
                  : null,
              );
            }}
          />
        </>
      )}
    </div>
  );
}
/** Feature composition over the Market Day panel's existing layout and animation classes. */
function PackingInspector({
  title,
  close,
  busy,
  children,
  compact = false,
  focusRequest = 1,
}: {
  title: string;
  close: () => void;
  busy: boolean;
  children: ReactNode;
  compact?: boolean;
  /** Each change moves focus into the panel; 0 opens it without taking focus. */
  focusRequest?: number;
}) {
  const [closing, setClosing] = useState(false),
    heading = useRef<HTMLHeadingElement>(null),
    returnFocus = useRef<HTMLElement | null>(null),
    closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  const dismiss = () => {
    if (busy) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      close();
    else setClosing(true);
  };
  useEffect(() => {
    if (!focusRequest) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    heading.current?.focus();
  }, [focusRequest]);
  useEffect(
    () => () => {
      const trigger = returnFocus.current;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    },
    [],
  );
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => closeRef.current(), 220);
    return () => clearTimeout(timer);
  }, [closing]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (
        e.key !== 'Escape' ||
        busy ||
        !(e.target instanceof Element) ||
        !heading.current
          ?.closest('.attendance-detail-shell')
          ?.contains(e.target)
      )
        return;
      e.stopPropagation();
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
        close();
      else setClosing(true);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [busy, close]);
  return (
    <div className={`attendance-detail-shell ${closing ? 'is-closing' : ''}`}>
      <Card
        as="section"
        className={`attendance-inspector packing-inspector${compact ? ' packing-inspector-customer' : ''}`}
        aria-label={title}
      >
        <div className="ui-actions">
          <h2 ref={heading} tabIndex={-1}>
            {title}
          </h2>
          <IconButton
            icon="close"
            label="Close packing details"
            onClick={dismiss}
          />
        </div>
        {children}
      </Card>
    </div>
  );
}
function ProductQuantity({
  product,
  disabled,
  run,
}: {
  product: PackingProduct;
  disabled: boolean;
  run: (c: PackingCommand) => Promise<boolean>;
}) {
  return (
    <PackingQuantity
      value={product.packed}
      max={1000000}
      disabled={disabled}
      label="Quantity packed"
      save={(quantity) =>
        run({ action: 'PACK', variantId: product.variantId, quantity })
      }
    />
  );
}
/** Feature adapter over shared fields/buttons; no existing shared quantity stepper is available. */
function PackingQuantity({
  value,
  max,
  disabled,
  label,
  save,
}: {
  value: number;
  max: number;
  disabled: boolean;
  label: string;
  save: (quantity: number) => Promise<boolean>;
}) {
  const id = useId(),
    [draft, setDraft] = useState({ source: value, text: String(value) });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    draftValue = useRef(String(value)),
    latest = useRef({ value, max, save });
  if (draft.source !== value) setDraft({ source: value, text: String(value) });
  useEffect(() => {
    latest.current = { value, max, save };
  }, [value, max, save]);
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const commit = () => {
    stop();
    const text = draftValue.current,
      quantity = Number(text);
    if (
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      quantity > latest.current.max
    ) {
      setDraft({
        source: latest.current.value,
        text: String(latest.current.value),
      });
      return;
    }
    if (quantity !== latest.current.value)
      void latest.current.save(quantity).then((ok) => {
        if (!ok)
          setDraft({
            source: latest.current.value,
            text: String(latest.current.value),
          });
      });
  };
  useEffect(
    () => () => {
      if (timer.current === null) return;
      clearTimeout(timer.current);
      timer.current = null;
      const text = draftValue.current,
        quantity = Number(text);
      if (
        /^\d+$/.test(text) &&
        Number.isSafeInteger(quantity) &&
        quantity >= 0 &&
        quantity <= latest.current.max &&
        quantity !== latest.current.value
      )
        void latest.current.save(quantity);
    },
    [],
  );
  const step = (delta: number) => {
    const quantity = Math.max(
      0,
      Math.min(
        max,
        (/^\d+$/.test(draft.text) ? Number(draft.text) : value) + delta,
      ),
    );
    draftValue.current = String(quantity);
    setDraft({ source: value, text: String(quantity) });
    commit();
  };
  return (
    <Field id={id} label="Quantity packed">
      <QuantityStepper
        id={id}
        label={label}
        value={draft.text}
        max={max}
        disabled={disabled}
        onStep={step}
        onChange={(e) => {
          stop();
          const text = e.target.value;
          draftValue.current = text;
          setDraft({ source: value, text });
          if (/^\d+$/.test(text) && Number(text) <= max)
            timer.current = setTimeout(commit, 300);
        }}
        onBlur={() => {
          if (
            timer.current !== null ||
            !/^\d+$/.test(draft.text) ||
            Number(draft.text) > max
          )
            commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </Field>
  );
}
function PlanProduct({
  service,
  disabled,
  busy,
  run,
  editProduct,
  onClose,
}: {
  service: VendorService;
  disabled: boolean;
  busy: boolean;
  editProduct?: PackingProduct;
  onClose: () => void;
  run: (c: PackingCommand) => Promise<boolean>;
}) {
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [variantId, select] = useState(editProduct?.variantId ?? ''),
    [chosenLabel, setChosenLabel] = useState('');
  // Typing searches the catalog; a short pause avoids a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(() => service.catalog(search, 0), [service, search]);
  const read = useRead(`packing-catalog:${search}:0`, load, !editProduct);
  const options =
    read.data?.items.flatMap((p) =>
      p.variants.map((v) => ({ value: v.id, label: `${p.name} · ${v.name}` })),
    ) ?? [];
  return (
    <Dialog
      open
      title={editProduct ? 'Edit walk-up inventory' : 'Add walk-up inventory'}
      onClose={onClose}
      busy={busy}
      size="standard"
      className="packing-walkup-dialog"
    >
      <form
        className="packing-forms"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run({
              action: 'PLAN',
              variantId,
              quantity: Number(new FormData(e.currentTarget).get('quantity')),
            })
          )
            onClose();
        }}
      >
        {editProduct ? (
          <p>{editProduct.name}</p>
        ) : (
          <>
            <SearchSelect
              id="packing-variant"
              label="Product"
              placeholder="Search products"
              value={variantId}
              selectedLabel={chosenLabel || undefined}
              options={options}
              onSearch={setQuery}
              loading={read.loading}
              required
              disabled={disabled}
              onChange={(value) => {
                select(value);
                setChosenLabel(
                  options.find((option) => option.value === value)?.label ?? '',
                );
              }}
            />
            {read.error && <ErrorState error={read.error} />}
          </>
        )}
        <Field id="packing-planned" label="Walk-up units">
          <Input
            id="packing-planned"
            name="quantity"
            type="number"
            min={editProduct ? 0 : 1}
            max={1000000}
            step={1}
            required
            defaultValue={editProduct?.planned ?? 1}
            disabled={disabled}
          />
        </Field>
        <FarmstandButton type="submit" disabled={disabled || !variantId}>
          Save walk-up plan
        </FarmstandButton>
      </form>
    </Dialog>
  );
}
function CustomerChecklist({
  customer,
  data,
  disabled,
  run,
}: {
  customer: PackingCustomer;
  data: PackingView;
  disabled: boolean;
  run: (c: PackingCommand) => Promise<boolean>;
}) {
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const complete = customer.items.every(
    (item) =>
      (item.packed ?? (item.checked ? item.quantity : 0)) >= item.quantity,
  );
  return (
    <>
      <p>Orders {customer.orderCodes.join(', ')}</p>
      <p>
        {date(data.occurrence.startsAt, data.occurrence.timezone)}
        {data.occurrence.venue && ` \u00b7 ${data.occurrence.venue}`}
      </p>
      <div>
        {customer.packed} / {customer.required} packed{' '}
        <PackingBadge status={customer.status} />
      </div>
      <PackingProgress
        required={customer.required}
        packed={customer.packed}
        label="Customer packing progress"
      />
      {customer.items.map((item) => (
        <CustomerPackingItem
          key={item.lineId}
          item={item}
          open={expandedLine === item.lineId}
          onToggle={() =>
            setExpandedLine((current) =>
              current === item.lineId ? null : item.lineId,
            )
          }
          disabled={disabled || customer.completed}
          run={run}
        />
      ))}
      <FarmstandButton
        disabled={disabled || (!customer.completed && !complete)}
        onClick={() =>
          void run({
            action: customer.completed ? 'REOPEN' : 'COMPLETE',
            customerKey: customer.key,
          })
        }
      >
        {customer.completed ? 'Reopen packing' : 'Mark Customer Packed'}
      </FarmstandButton>
      {!customer.completed && complete && (
        <p>All quantities packed. Confirm customer packing explicitly.</p>
      )}
    </>
  );
}
function CustomerPackingItem({
  item,
  open,
  onToggle,
  disabled,
  run,
}: {
  item: PackingCustomer['items'][number];
  open: boolean;
  onToggle: () => void;
  disabled: boolean;
  run: (c: PackingCommand) => Promise<boolean>;
}) {
  const packed = item.packed ?? (item.checked ? item.quantity : 0),
    available = Math.min(
      item.availablePacked ?? 0,
      Math.max(0, item.quantity - packed),
    );
  return (
    <details
      className={disclosureClassName('packing-customer-item')}
      open={open}
    >
      <summary
        aria-label={`Packing details for ${item.name}, order ${item.orderCode}`}
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        <div className="packing-row">
          <PackingImage key={item.image} image={item.image} />
          <div className="packing-item-name">
            {item.quantity}
            {' \u00d7 '}
            {item.name}
          </div>
          <div className="packing-item-progress">
            <div>
              {packed} / {item.quantity} packed{' '}
              <PackingBadge
                status={
                  packed > item.quantity
                    ? 'Overpacked'
                    : packed === item.quantity
                      ? 'Packed'
                      : packed
                        ? 'Partially Packed'
                        : 'Not Started'
                }
              />
            </div>
            <PackingProgress
              required={item.quantity}
              packed={packed}
              label={`${item.name} order packing progress`}
            />
          </div>
        </div>
      </summary>
      <div className="ui-disclosure-content packing-item-controls">
        <PackingQuantity
          value={packed}
          max={1000000}
          disabled={disabled}
          label={`Packed quantity for ${item.name}, order ${item.orderCode}`}
          save={(quantity) =>
            run({ action: 'PACK_LINE', lineId: item.lineId, quantity })
          }
        />
        {available > 0 && (
          <div className="packing-existing-units">
            <p>
              {available} already packed{' '}
              {available === 1 ? 'unit available' : 'units available'} from the
              master list.
            </p>
            <FarmstandButton
              variant="secondary"
              size="compact"
              disabled={disabled}
              onClick={() =>
                void run({
                  action: 'USE_PACKED',
                  lineId: item.lineId,
                  quantity: packed + available,
                })
              }
            >
              Use {available} already packed
            </FarmstandButton>
          </div>
        )}
      </div>
    </details>
  );
}
function PackingImage({ image }: { image?: string | null }) {
  const [failed, setFailed] = useState(false);
  let src: string | null = null;
  try {
    const url = image ? new URL(image, window.location.origin) : null;
    if (url && ['http:', 'https:'].includes(url.protocol)) src = url.href;
  } catch {
    /* Show the shared fallback for unavailable images. */
  }
  return (
    <span className="packing-product-image">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width="64"
          height="64"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <UtilityIcon name="store" />
      )}
    </span>
  );
}

/** The existing progress ring is circular; packing needs a linear, animated unit meter. */
export function PackingProgress({
  required,
  packed,
  label,
}: {
  required: number;
  packed: number;
  label: string;
}) {
  const percent =
    required > 0 ? Math.min(100, Math.max(0, (packed / required) * 100)) : 0;
  const tone =
    percent < 25
      ? 'red'
      : percent < 50
        ? 'orange'
        : percent < 100
          ? 'yellow'
          : 'green';
  return (
    <div
      className="packing-progress"
      data-tone={tone}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(required, packed, 1)}
      aria-valuenow={packed}
      aria-valuetext={`${packed} of ${required} units packed`}
    >
      <span style={{ '--packing-progress': `${percent}%` } as CSSProperties} />
    </div>
  );
}
