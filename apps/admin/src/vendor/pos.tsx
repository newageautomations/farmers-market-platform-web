import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@market/config';
import {
  safeError,
  PosInputError,
  type InPersonApi,
  type PosCatalog,
  type PosContext,
  type PosDraft,
  type PosProduct,
  type PosVariant,
  type PosSale,
  type PosPaymentMethods,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  SelectField,
  Spinner,
  UtilityIcon,
} from '@market/ui';
import type { VendorService } from './service';
import { PosCartQueue } from './pos-queue';
import { PosPaymentDialog, unresolvedPayment } from './pos-payments';
import './pos.css';

const message = (error: unknown) =>
  error instanceof PosInputError ? error.message : safeError(error).message;
const key = () => crypto.randomUUID();
function imageUrl(value: string | null) {
  if (!value) return null;
  try {
    const u = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

export function VendorPos({ service }: { service: VendorService }) {
  if (!service.pos || !service.context.permissions.includes('OperateOwnPos'))
    return (
      <Alert severity="warning">
        In-Person Checkout is unavailable for this vendor account.
      </Alert>
    );
  return (
    <PosRegister
      key={service.vendorId}
      api={service.pos}
      vendorName={service.context.name}
    />
  );
}
export function PosRegister({
  api,
  vendorName,
}: {
  api: InPersonApi;
  vendorName: string;
}) {
  const [catalog, setCatalog] = useState<PosCatalog | null>(null),
    [contexts, setContexts] = useState<PosContext[]>([]),
    [drafts, setDrafts] = useState<PosDraft[]>([]);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [methods, setMethods] = useState<PosPaymentMethods>({
      cash: false,
      simulated: false,
      scenarios: [],
    }),
    [recoverable, setRecoverable] = useState<PosSale[]>([]),
    [sale, setSale] = useState<PosSale | null>(null),
    [paymentOpen, setPaymentOpen] = useState(false);
  const [draft, setDraft] = useState<PosDraft | null>(null),
    [pending, setPending] = useState(0),
    [error, setError] = useState(''),
    [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [parentCategory, setParentCategory] = useState(''),
    [childCategory, setChildCategory] = useState(''),
    [favorites, setFavorites] = useState(false),
    [skip, setSkip] = useState(0),
    [refresh, setRefresh] = useState(0),
    [loadedKey, setLoadedKey] = useState('');
  const [blocked, setBlocked] = useState(false),
    [quantities, setQuantities] = useState(new Map<string, number>()),
    [variantInfo, setVariantInfo] = useState(new Map<string, PosVariant>());
  const [occurrence, setOccurrence] = useState(''),
    [checkoutStarted, setCheckoutStarted] = useState(false),
    [initialPending, setInitialPending] = useState(false),
    [busy, setBusy] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [variantProduct, setVariantProduct] = useState<PosProduct | null>(null),
    [customerOpen, setCustomerOpen] = useState(false),
    [identity, setIdentity] = useState(''),
    [coupon, setCoupon] = useState(''),
    [cancelOpen, setCancelOpen] = useState(false);
  const queue = useRef<PosCartQueue | null>(null),
    latestLoaded = useRef(false),
    mounted = useRef(true),
    searchRef = useRef<HTMLInputElement>(null);
  const initialAddition = useRef<{
      key: string;
      variant: PosVariant;
      occurrenceId: string | null;
    } | null>(null),
    initialInFlight = useRef(false),
    categoryList = useRef<HTMLDivElement>(null);
  const [categoryScroll, setCategoryScroll] = useState({
    overflow: false,
    back: false,
    forward: false,
  });
  const category = childCategory || parentCategory;
  const parent = catalog?.categories.find((c) => c.id === parentCategory);
  const catalogCache = useRef(
    new Map<string, { value: PosCatalog; at: number }>(),
  );
  const selectedOccurrence =
    (draft ? draft.context.occurrenceId : occurrence) || null;
  const requestKey = JSON.stringify([
    debounced,
    skip,
    category,
    favorites,
    refresh,
    selectedOccurrence,
  ]);
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queue.current?.dispose();
    };
  }, []);
  useEffect(() => {
    if (draft?.state !== 'READY_FOR_PAYMENT') return;
    const timer = setInterval(() => setClockNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, [draft?.state, draft?.quote?.id]);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search), 180);
    return () => clearTimeout(timeout);
  }, [search]);
  useEffect(() => {
    catalogCache.current.clear();
  }, [api, selectedOccurrence]);
  useEffect(() => {
    let active = true;
    const cached = catalogCache.current.get(requestKey);
    if (cached && Date.now() - cached.at < 15000) {
      setCatalog(cached.value);
      setLoadedKey(requestKey);
      return;
    }
    api
      .catalog({
        search: debounced,
        skip,
        categoryId: category || undefined,
        favorites,
        occurrenceId: selectedOccurrence || null,
      })
      .then((value) => {
        if (active) {
          // Small, short-lived page cache. Checkout always revalidates price and stock.
          catalogCache.current.delete(requestKey);
          catalogCache.current.set(requestKey, { value, at: Date.now() });
          if (catalogCache.current.size > 24)
            catalogCache.current.delete(
              catalogCache.current.keys().next().value!,
            );
          setCatalog(value);
        }
      })
      .catch((e) => {
        if (active) {
          setError(message(e));
          setCatalog((previous) =>
            previous ? { ...previous, items: [], totalItems: 0 } : null,
          );
        }
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [
    api,
    debounced,
    skip,
    category,
    favorites,
    refresh,
    selectedOccurrence,
    requestKey,
  ]);
  useEffect(() => {
    let active = true;
    Promise.all([
      api.contexts(),
      api.drafts(),
      api.paymentMethods(),
      api.recoverablePayments(),
      api.latestSale(),
    ])
      .then(([c, d, m, r, last]) => {
        if (active) {
          setContexts(c);
          setDrafts(d.filter((value) => value.items.length > 0));
          setMethods(m);
          setRecoverable(r);
          if (!latestLoaded.current) {
            if (last) setSale(last);
            latestLoaded.current = true;
          }
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [api, refresh]);
  useEffect(() => {
    const list = categoryList.current;
    if (!list) return;
    function update() {
      if (!list) return;
      const bar = list.parentElement!,
        divider = bar.querySelector<HTMLElement>('.pos-category-divider')!,
        dividerStyle = getComputedStyle(divider),
        available =
          bar.clientWidth -
          bar.firstElementChild!.getBoundingClientRect().width -
          divider.getBoundingClientRect().width -
          parseFloat(dividerStyle.marginInlineStart) -
          parseFloat(dividerStyle.marginInlineEnd) -
          2 * parseFloat(getComputedStyle(bar).columnGap);
      setCategoryScroll({
        overflow: (list.firstElementChild?.scrollWidth ?? 0) > available + 1,
        back: list.scrollLeft > 1,
        forward: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
      });
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    if (list.firstElementChild) observer.observe(list.firstElementChild);
    list.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', update);
    };
  }, [catalog?.categories]);
  function selectDraft(next: PosDraft) {
    latestLoaded.current = true;
    queue.current?.dispose();
    setDraft(next);
    setCheckoutStarted(true);
    setSale(null);
    setBlocked(false);
    setClockNow(Date.now());
    setQuantities(new Map(next.items.map((l) => [l.variantId, l.quantity])));
    setPending(0);
    setError('');
    setOccurrence(next.context.occurrenceId ?? '');
    queue.current = new PosCartQueue(next, api, (value, count, err) => {
      if (!mounted.current) return;
      setDraft(value);
      setPending(count);
      setClockNow(Date.now());
      setBlocked(queue.current?.blocked ?? false);
      setQuantities(queue.current?.quantities() ?? new Map());
      if (err) setError(message(err));
      else {
        setError('');
        if (!count)
          setFeedback(
            value.items.length ? 'Cart saved' : 'Empty cart is not saved',
          );
      }
      if (value.state === 'CANCELLED') {
        setDraft(null);
        setCheckoutStarted(false);
        queue.current?.dispose();
        setRefresh((n) => n + 1);
        setCartOpen(false);
      }
    });
  }
  function start() {
    if (
      busy ||
      initialAddition.current ||
      pending ||
      recoverable.length ||
      (sale && unresolvedPayment(sale))
    )
      return;
    latestLoaded.current = true;
    setSale(null);
    setCheckoutStarted(true);
    setError('');
    searchRef.current?.focus();
  }
  async function resume(id: string) {
    if (busy || pending || initialAddition.current) return;
    setBusy(true);
    try {
      let next = await api.draft(id);
      if (next.state === 'READY_FOR_PAYMENT') {
        const payment = await api.payment(id);
        if (payment) {
          setSale(payment);
          return;
        }
        next = await api.command(id, next.version, key(), { action: 'reopen' });
      }
      selectDraft(next);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function add(variant: PosVariant) {
    if (
      busy ||
      initialInFlight.current ||
      recoverable.length ||
      (sale && unresolvedPayment(sale)) ||
      (draft &&
        !['OPEN', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(draft.state)) ||
      variant.reason ||
      queue.current?.blocked
    )
      return;
    setVariantInfo((values) => new Map(values).set(variant.id, variant));
    setFeedback(`Adding ${variant.name}`);
    if (!draft || draft.state !== 'OPEN') {
      if (
        initialAddition.current &&
        initialAddition.current.variant.id !== variant.id
      )
        return;
      initialAddition.current ??= {
        key: key(),
        variant,
        occurrenceId: occurrence || null,
      };
      const request = initialAddition.current;
      setInitialPending(true);
      initialInFlight.current = true;
      setBusy(true);
      setError('');
      try {
        const next = await api.start(
          request.key,
          request.occurrenceId,
          request.variant.id,
        );
        if (mounted.current) {
          selectDraft(next);
          initialAddition.current = null;
          setInitialPending(false);
          setFeedback('Cart saved');
        }
      } catch (e) {
        if (e instanceof PosInputError) {
          initialAddition.current = null;
          if (mounted.current) setInitialPending(false);
        }
        if (mounted.current) setError(message(e));
      } finally {
        initialInFlight.current = false;
        if (mounted.current) setBusy(false);
      }
      return;
    }
    queue.current?.enqueue({
      action: 'add',
      variantId: variant.id,
      quantity: 1,
    });
  }
  function choose(product: PosProduct) {
    if (product.variants.length === 1) void add(product.variants[0]!);
    else setVariantProduct(product);
  }
  const quoteExpired =
    !!draft?.quote && Date.parse(draft.quote.expiresAt) <= clockNow;
  const closedDraft =
    draft?.state === 'EXPIRED' || draft?.state === 'CANCELLED';
  const editable = draft?.state === 'OPEN' && !blocked;
  const canAdd =
    !busy &&
    !blocked &&
    !initialPending &&
    !recoverable.length &&
    !(sale && unresolvedPayment(sale)) &&
    (!draft || editable || closedDraft || draft.state === 'COMPLETED');
  const money = (amount: number) =>
    formatMoney(
      amount,
      (draft?.currency ?? catalog?.currency ?? 'USD') as 'USD',
    );
  const displayLines = [...quantities]
    .filter(([, quantity]) => quantity > 0)
    .map(([variantId, quantity]) => {
      const line = draft?.items.find((l) => l.variantId === variantId),
        variant = variantInfo.get(variantId);
      return {
        ...(line ?? {
          id: variantId,
          variantId,
          name: variant?.name ?? 'Product',
          unitPrice: variant?.price ?? 0,
          lineTotal: 0,
          tax: [],
          discounts: [],
        }),
        quantity,
        saving: quantity !== line?.quantity,
      };
    });
  const itemCount = displayLines.reduce((n, l) => n + l.quantity, 0);
  const cart = draft ? (
    <div className="pos-cart-content">
      {cartOpen && error && <Alert severity="error">{error}</Alert>}
      {closedDraft && (
        <Alert severity="warning">
          This draft is {draft.state === 'EXPIRED' ? 'expired' : 'cancelled'}.
          Choose Saved drafts to start a new checkout.
        </Alert>
      )}
      <div className="pos-cart-top">
        <strong>
          {draft.state === 'READY_FOR_PAYMENT'
            ? 'Checkout review'
            : 'Current sale'}
        </strong>
        <Badge
          tone={
            closedDraft
              ? 'warning'
              : draft.state === 'READY_FOR_PAYMENT'
                ? 'success'
                : 'neutral'
          }
        >
          {closedDraft
            ? draft.state === 'EXPIRED'
              ? 'Expired'
              : 'Cancelled'
            : draft.state === 'READY_FOR_PAYMENT'
              ? 'Ready for payment'
              : draft.state === 'COMPLETED'
                ? 'Completed'
                : draft.state === 'PAYMENT_PENDING'
                  ? 'Payment in progress'
                  : draft.items.length
                    ? 'Saved draft'
                    : 'Empty cart'}
        </Badge>
      </div>
      <p>{draft.context.label}</p>
      {displayLines.length ? (
        <ul className="pos-cart-lines">
          {displayLines.map((line) => (
            <li key={line.id}>
              <div className="pos-line-heading">
                <strong>{line.name}</strong>
                <span>{line.saving ? 'Saving…' : money(line.lineTotal)}</span>
              </div>
              <span className="pos-unit-price">
                {money(line.unitPrice)} each, before tax
              </span>
              <div className="pos-quantity">
                <Button
                  variant="tertiary"
                  aria-label={`Decrease ${line.name}`}
                  disabled={!editable}
                  onClick={() =>
                    queue.current?.enqueue({
                      action: 'delta',
                      variantId: line.variantId,
                      quantity: -1,
                    })
                  }
                >
                  −
                </Button>
                <Input
                  key={`${line.id}:${line.quantity}`}
                  type="number"
                  min="1"
                  max="9999"
                  step="1"
                  inputMode="numeric"
                  aria-label={`Quantity for ${line.name}`}
                  defaultValue={line.quantity}
                  disabled={!editable || pending > 0}
                  onBlur={(event) => {
                    const n = event.currentTarget.valueAsNumber;
                    if (
                      Number.isInteger(n) &&
                      n > 0 &&
                      n <= 9999 &&
                      n !== line.quantity
                    )
                      queue.current?.enqueue({
                        action: 'quantity',
                        variantId: line.variantId,
                        quantity: n,
                      });
                    else event.currentTarget.value = String(line.quantity);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                />
                <Button
                  variant="tertiary"
                  aria-label={`Increase ${line.name}`}
                  disabled={!editable}
                  onClick={() =>
                    queue.current?.enqueue({
                      action: 'add',
                      variantId: line.variantId,
                      quantity: 1,
                    })
                  }
                >
                  +
                </Button>
                <Button
                  variant="tertiary"
                  aria-label={`Remove ${line.name}`}
                  disabled={!editable || pending > 0}
                  onClick={() =>
                    queue.current?.enqueue({
                      action: 'quantity',
                      variantId: line.variantId,
                      quantity: 0,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Your cart is ready">
          Tap a product to start this sale.
        </EmptyState>
      )}
      <div className="pos-customer">
        <span>{draft.customer}</span>
        <Button
          variant="tertiary"
          disabled={!editable || pending > 0}
          onClick={() => setCustomerOpen(true)}
        >
          {draft.customerMode === 'ANONYMOUS'
            ? 'Add Customer (Optional)'
            : 'Change customer'}
        </Button>
        {draft.customerMode !== 'ANONYMOUS' && (
          <Button
            variant="tertiary"
            disabled={!editable || pending > 0}
            onClick={() => queue.current?.enqueue({ action: 'anonymous' })}
          >
            Remove customer
          </Button>
        )}
      </div>
      {draft.loyalty && (
        <div className="pos-loyalty" aria-live="polite">
          <p>
            {draft.loyalty.balance.available.toLocaleString()} available points
          </p>
          {draft.loyalty.selection && (
            <div>
              <p>{draft.loyalty.selection.terms.name} applied</p>
              <Button
                variant="tertiary"
                disabled={!editable || pending > 0}
                onClick={() =>
                  queue.current?.enqueue({ action: 'removeReward' })
                }
              >
                Remove reward
              </Button>
            </div>
          )}
          {draft.loyalty.rewards.length === 0 && (
            <p>No rewards are available from this vendor.</p>
          )}
          {draft.loyalty.rewards.map((reward) => (
            <Card key={reward.versionId} spacing="contained">
              <p>{reward.terms.name}</p>
              <p>
                {reward.terms.points.toLocaleString()} points ·{' '}
                {reward.terms.kind === 'PERCENTAGE'
                  ? `${reward.terms.value}% off, up to ${money(reward.terms.maximum)}`
                  : reward.terms.kind === 'FREE_PRODUCT'
                    ? `${reward.terms.quantity} eligible product free`
                    : `${money(reward.terms.value)} off`}
              </p>
              {reward.terms.minimum > 0 && (
                <p>Minimum eligible spend: {money(reward.terms.minimum)}</p>
              )}
              {reward.terms.variantIds.length > 0 && (
                <p>Selected products only</p>
              )}
              {reward.terms.endsAt && (
                <p>Expires {new Date(reward.terms.endsAt).toLocaleString()}</p>
              )}
              {reward.reason && <p>{reward.reason}</p>}
              <Button
                disabled={
                  !editable ||
                  pending > 0 ||
                  !reward.available ||
                  !!draft.loyalty?.selection
                }
                onClick={() =>
                  queue.current?.enqueue({
                    action: 'reward',
                    versionId: reward.versionId,
                    verballyAgreed: true,
                  })
                }
              >
                Apply {money(reward.discount)} reward, customer agreed
              </Button>
            </Card>
          ))}
        </div>
      )}
      {draft.marketRewards?.map((reward) => (
        <Card key={reward.id} spacing="contained">
          <p>
            {reward.title}: {reward.description}
          </p>
          <p>{reward.instructions}</p>
          <p>{reward.reason}</p>
        </Card>
      ))}
      {editable && (
        <form
          className="pos-coupon ui-control-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (coupon.trim()) {
              queue.current?.enqueue({ action: 'coupon', code: coupon });
              setCoupon('');
            }
          }}
        >
          <Field label="Coupon code" id="pos-coupon">
            <Input
              id="pos-coupon"
              value={coupon}
              maxLength={80}
              onChange={(e) => setCoupon(e.target.value)}
            />
          </Field>
          <div className="ui-field-action">
            <Button
              type="submit"
              variant="tertiary"
              disabled={pending > 0 || !coupon.trim()}
            >
              Apply
            </Button>
          </div>
        </form>
      )}
      {draft.coupons
        .filter((code) => !code.startsWith('LR_'))
        .map((code) => (
          <div key={code}>
            {code}{' '}
            <Button
              variant="tertiary"
              disabled={!editable || pending > 0}
              onClick={() =>
                queue.current?.enqueue({ action: 'removeCoupon', code })
              }
            >
              Remove coupon
            </Button>
          </div>
        ))}
      <dl className="pos-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(draft.subtotal)}</dd>
        </div>
        {draft.discount > 0 && (
          <div>
            <dt>Discounts</dt>
            <dd>−{money(draft.discount)}</dd>
          </div>
        )}
        <div>
          <dt>Tax</dt>
          <dd>{money(draft.tax)}</dd>
        </div>
        <div className="pos-total">
          <dt>Total</dt>
          <dd>{money(draft.total)}</dd>
        </div>
      </dl>
      <p className="pos-save-state" role="status">
        {pending
          ? `${pending} change${pending === 1 ? '' : 's'} saving. Total updates after validation.`
          : draft.state === 'COMPLETED'
            ? 'Sale completed. View the receipt for payment and delivery details.'
            : draft.state === 'PAYMENT_PENDING'
              ? 'Inventory is held while this payment is resolved.'
              : 'Amounts calculated by the server. Drafts do not reserve stock.'}
      </p>
      {draft.state === 'READY_FOR_PAYMENT' ? (
        <>
          {quoteExpired && (
            <Alert severity="warning">
              This quote has expired. Review the checkout again to refresh
              prices and stock.
            </Alert>
          )}
          {quoteExpired && (
            <Button
              disabled={pending > 0}
              onClick={() => queue.current?.enqueue({ action: 'review' })}
            >
              Refresh quote
            </Button>
          )}
          <div className="ui-actions pos-payment-actions">
            <Button
              disabled={pending > 0 || quoteExpired || !methods.cash}
              onClick={() => {
                setCartOpen(false);
                setPaymentOpen(true);
              }}
            >
              Continue to Payment
            </Button>
            <Button
              variant="secondary"
              disabled={pending > 0}
              onClick={() => queue.current?.enqueue({ action: 'reopen' })}
            >
              Return to cart
            </Button>
          </div>
        </>
      ) : (
        <Button
          disabled={!draft.items.length || pending > 0 || !editable}
          onClick={() => queue.current?.enqueue({ action: 'review' })}
        >
          Review checkout · {money(draft.total)}
        </Button>
      )}
      <Button
        variant="tertiary"
        disabled={
          pending > 0 ||
          blocked ||
          draft.state === 'PAYMENT_PENDING' ||
          draft.state === 'COMPLETED'
        }
        onClick={() => setCancelOpen(true)}
      >
        Cancel draft
      </Button>
    </div>
  ) : (
    <EmptyState
      title={checkoutStarted ? 'Your cart is ready' : 'Start a checkout'}
    >
      Tap a product to start this sale, or resume a saved draft. Empty carts are
      not saved.
    </EmptyState>
  );
  return (
    <section className="pos-register" aria-label="In-Person Checkout">
      {recoverable.length > 0 && (
        <Alert severity="warning">
          <p>A payment needs attention before another sale.</p>
          <div className="ui-actions">
            {recoverable.map((value) => (
              <Button
                key={value.id}
                variant="secondary"
                onClick={() => {
                  setSale(value);
                  setPaymentOpen(true);
                }}
              >
                Check payment for order {value.orderCode}
              </Button>
            ))}
          </div>
        </Alert>
      )}
      {sale && (
        <div className="pos-payment-actions">
          <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
            {sale.state === 'COMPLETED'
              ? 'View Completed Sale'
              : 'View Payment Status'}
          </Button>
        </div>
      )}
      <div className="pos-toolbar">
        <div>
          <p>{vendorName}</p>
        </div>
        <Button
          variant="secondary"
          disabled={busy || pending > 0 || blocked || initialPending}
          onClick={() => {
            setDraft(null);
            setCheckoutStarted(false);
            queue.current?.dispose();
            queue.current = null;
            setRefresh((n) => n + 1);
          }}
        >
          Saved drafts
        </Button>
      </div>
      {error && (
        <Alert severity="error">
          {error}
          {initialPending ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void add(initialAddition.current!.variant)}
            >
              Retry first product
            </Button>
          ) : blocked ? (
            <Button variant="secondary" onClick={() => queue.current?.retry()}>
              Retry saved change
            </Button>
          ) : (
            <Button
              variant="tertiary"
              onClick={() => {
                if (draft) void resume(draft.id);
                else setRefresh((n) => n + 1);
              }}
            >
              Reload
            </Button>
          )}
        </Alert>
      )}
      {!draft && !checkoutStarted && (
        <Card>
          <div className="pos-setup ui-control-row">
            <SelectField
              label="Selling context"
              value={occurrence}
              disabled={busy || initialPending}
              onChange={(e) => {
                setOccurrence(e.target.value);
              }}
            >
              <option value="">Independent Sale</option>
              {contexts.map((c) => (
                <option key={c.occurrenceId} value={c.occurrenceId!}>
                  {c.label}
                </option>
              ))}
            </SelectField>
            <div className="ui-field-action">
              <Button
                loading={busy}
                disabled={
                  initialPending ||
                  recoverable.length > 0 ||
                  (!!sale && unresolvedPayment(sale))
                }
                onClick={start}
              >
                Start checkout
              </Button>
            </div>
          </div>
          {drafts.length > 0 && (
            <div className="pos-saved">
              {drafts.map((d) => (
                <Button
                  key={d.id}
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void resume(d.id)}
                >
                  Resume {d.items.length} item{d.items.length === 1 ? '' : 's'}{' '}
                  · {formatMoney(d.total, d.currency as 'USD')} ·{' '}
                  {d.context.label}
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}
      <div className="pos-workspace">
        <div className="pos-catalog">
          {(draft || checkoutStarted) && (
            <SelectField
              label="Selling context"
              value={draft?.context.occurrenceId ?? occurrence}
              disabled={
                busy || initialPending || (!!draft && !editable) || pending > 0
              }
              onChange={(e) => {
                if (!draft) setOccurrence(e.target.value);
                else
                  queue.current?.enqueue({
                    action: 'context',
                    occurrenceId: e.target.value || null,
                  });
              }}
            >
              <option value="">Independent Sale</option>
              {contexts.map((c) => (
                <option key={c.occurrenceId} value={c.occurrenceId!}>
                  {c.label}
                </option>
              ))}
            </SelectField>
          )}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (loading || search !== debounced || !search.trim() || !catalog)
                return;
              const variants = catalog.items
                .flatMap((p) => p.variants)
                .filter(
                  (v) => v.sku.toLowerCase() === search.trim().toLowerCase(),
                );
              if (variants.length === 1) void add(variants[0]!);
              else if (
                !variants.length &&
                catalog.totalItems === 1 &&
                catalog.items[0]
              )
                choose(catalog.items[0]);
            }}
          >
            <Field label="Search products" id="pos-search">
              <Input
                ref={searchRef}
                id="pos-search"
                type="search"
                placeholder="Name, variant or SKU"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSkip(0);
                }}
                autoComplete="off"
              />
            </Field>
          </form>
          <div
            className="pos-category-bar"
            role="group"
            aria-label="Product categories"
          >
            <Button
              iconOnly
              className="pos-heart-button"
              aria-label="Favorites"
              title="Favorites"
              aria-pressed={favorites}
              onClick={() => {
                setFavorites((v) => !v);
                setSkip(0);
              }}
            >
              <UtilityIcon name="heart" filled={favorites} />
            </Button>
            <span
              className="pos-category-divider"
              role="separator"
              aria-orientation="vertical"
            />
            <div
              className="pos-categories"
              ref={categoryList}
              role="group"
              aria-label="Scrollable product categories"
            >
              <div className="pos-category-list">
                <Button
                  variant={!parentCategory ? 'secondary' : 'tertiary'}
                  aria-pressed={!parentCategory}
                  onClick={() => {
                    setParentCategory('');
                    setChildCategory('');
                    setSkip(0);
                  }}
                >
                  All Products
                </Button>
                {catalog?.categories
                  .filter((c) => !c.parentId)
                  .map((c) => (
                    <Button
                      key={c.id}
                      variant={
                        parentCategory === c.id ? 'secondary' : 'tertiary'
                      }
                      aria-pressed={parentCategory === c.id}
                      onClick={() => {
                        setParentCategory(c.id);
                        setChildCategory('');
                        setSkip(0);
                      }}
                    >
                      {c.name}
                    </Button>
                  ))}
              </div>
            </div>
            {categoryScroll.overflow && (
              <div className="pos-category-arrows">
                <Button
                  iconOnly
                  aria-label="Scroll categories left"
                  disabled={!categoryScroll.back}
                  onClick={() =>
                    categoryList.current?.scrollBy({
                      left: -categoryList.current.clientWidth * 0.8,
                      behavior: window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                      ).matches
                        ? 'instant'
                        : 'smooth',
                    })
                  }
                >
                  <UtilityIcon name="chevron-left" />
                </Button>
                <Button
                  iconOnly
                  aria-label="Scroll categories right"
                  disabled={!categoryScroll.forward}
                  onClick={() =>
                    categoryList.current?.scrollBy({
                      left: categoryList.current.clientWidth * 0.8,
                      behavior: window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                      ).matches
                        ? 'instant'
                        : 'smooth',
                    })
                  }
                >
                  <UtilityIcon name="chevron-right" />
                </Button>
              </div>
            )}
          </div>
          {parent && (
            <div
              className="pos-categories pos-child-categories"
              role="group"
              aria-label={`${parent.name} subcategories`}
            >
              <div className="pos-category-list">
                <Button
                  variant="tertiary"
                  size="compact"
                  aria-pressed={!childCategory}
                  onClick={() => {
                    setChildCategory('');
                    setSkip(0);
                  }}
                >
                  All {parent.name}
                </Button>
                {catalog?.categories
                  .filter((c) => c.parentId === parent.id)
                  .map((c) => (
                    <Button
                      key={c.id}
                      variant="tertiary"
                      size="compact"
                      aria-pressed={childCategory === c.id}
                      onClick={() => {
                        setChildCategory(c.id);
                        setSkip(0);
                      }}
                    >
                      {c.name}
                    </Button>
                  ))}
              </div>
            </div>
          )}
          <div className="pos-feedback" role="status" aria-live="polite">
            {loading && catalog ? 'Updating products' : feedback}
            {pending > 0 ? ` · ${pending} pending` : ''}
          </div>
          {loading && !catalog ? (
            <Spinner label="Loading products" />
          ) : catalog?.items.length ? (
            <>
              <div className="pos-product-grid" aria-busy={loading}>
                {catalog.items.map((product) => (
                  <PosProductTile
                    key={product.id}
                    product={product}
                    currency={catalog.currency}
                    disabled={!canAdd || loading}
                    onAdd={() => choose(product)}
                    onFavorite={() => {
                      void api
                        .favorite(product.id, !product.favorite)
                        .then(() => setRefresh((n) => n + 1))
                        .catch((e) => setError(message(e)));
                    }}
                  />
                ))}
              </div>
              <div className="pos-pages">
                <Button
                  variant="tertiary"
                  disabled={skip === 0 || loading}
                  onClick={() => setSkip((n) => Math.max(0, n - 30))}
                >
                  Previous
                </Button>
                <span>
                  {skip + 1} to {Math.min(skip + 30, catalog.totalItems)} of{' '}
                  {catalog.totalItems}
                </span>
                <Button
                  variant="tertiary"
                  disabled={skip + 30 >= catalog.totalItems || loading}
                  onClick={() => setSkip((n) => n + 30)}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              title={
                search
                  ? 'No products found'
                  : favorites
                    ? 'No favorites yet'
                    : 'No products available'
              }
            >
              {search
                ? 'Try another name or SKU.'
                : favorites
                  ? 'Use the favorite control beside a product.'
                  : 'Your catalog will appear here when products are available.'}
            </EmptyState>
          )}
        </div>
        <Card className="pos-desktop-cart">
          <aside aria-label="Current cart">{!cartOpen && cart}</aside>
        </Card>
      </div>
      {draft && (
        <div className="pos-mobile-summary">
          <span>
            {itemCount} item{itemCount === 1 ? '' : 's'} · {money(draft.total)}
            {pending > 0 ? ' · Saving' : ''}
          </span>
          <Button onClick={() => setCartOpen(true)}>
            View Cart / Checkout
          </Button>
        </div>
      )}
      <Dialog
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Current cart"
        drawer
      >
        {cartOpen && cart}
      </Dialog>
      {paymentOpen && (
        <PosPaymentDialog
          api={api}
          draft={draft}
          methods={methods}
          sale={sale}
          onClose={() => setPaymentOpen(false)}
          onSale={(value) => {
            setSale(value);
            if (unresolvedPayment(value)) {
              setRecoverable((v) => [
                ...v.filter((s) => s.id !== value.id),
                value,
              ]);
            } else {
              setRecoverable((v) => v.filter((s) => s.id !== value.id));
            }
            if (draft?.id === value.draftId) {
              queue.current?.dispose();
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      state:
                        value.state === 'COMPLETED'
                          ? 'COMPLETED'
                          : unresolvedPayment(value)
                            ? 'PAYMENT_PENDING'
                            : 'CANCELLED',
                    }
                  : d,
              );
            }
          }}
          onNewSale={() => {
            setPaymentOpen(false);
            setSale(null);
            setDraft(null);
            setPending(0);
            queue.current?.dispose();
            void start();
          }}
        />
      )}
      <Dialog
        open={!!variantProduct}
        onClose={() => setVariantProduct(null)}
        title={
          variantProduct ? `Choose ${variantProduct.name}` : 'Choose variant'
        }
      >
        <div className="pos-variants">
          {variantProduct?.variants.map((v) => (
            <Button
              key={v.id}
              variant="secondary"
              disabled={!!v.reason || !canAdd}
              onClick={() => {
                void add(v);
                setVariantProduct(null);
              }}
            >
              {v.name} · {money(v.price)}
              {v.reason ? ` · ${v.reason}` : ''}
            </Button>
          ))}
        </div>
      </Dialog>
      <Dialog
        open={customerOpen}
        onClose={() => {
          setCustomerOpen(false);
          setIdentity('');
        }}
        title="Add Customer (Optional)"
      >
        <p>
          Enter the customer’s US phone number, international number with
          country code, or exact account email. Confirm their name verbally.
        </p>
        <Field label="Customer email or phone" id="pos-identity">
          <Input
            id="pos-identity"
            value={identity}
            maxLength={254}
            onChange={(e) => setIdentity(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <div className="pos-dialog-actions">
          <Button
            disabled={!identity.trim() || pending > 0}
            onClick={() => {
              queue.current?.enqueue({
                action: 'customer',
                identifier: identity.trim(),
              });
              setCustomerOpen(false);
              setIdentity('');
            }}
          >
            Find customer and rewards
          </Button>
          <Button
            variant="secondary"
            disabled={!identity.includes('@') || pending > 0}
            onClick={() => {
              queue.current?.enqueue({
                action: 'customer',
                identifier: identity.trim(),
                invite: true,
              });
              setCustomerOpen(false);
              setIdentity('');
            }}
          >
            Save signup invitation
          </Button>
          <Button
            variant="tertiary"
            disabled={pending > 0}
            onClick={() => {
              queue.current?.enqueue({ action: 'anonymous' });
              setCustomerOpen(false);
              setIdentity('');
            }}
          >
            Continue anonymously
          </Button>
        </div>
        <p>
          Save an invitation only with the customer’s permission. No email is
          sent until a future verified payment. Providing an email does not
          subscribe the customer to marketing.
        </p>
      </Dialog>
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this draft?"
      >
        <p>The saved cart will close. No payment has been collected.</p>
        <Button
          variant="destructive"
          disabled={pending > 0}
          onClick={() => {
            queue.current?.enqueue({ action: 'cancel' });
            setCancelOpen(false);
          }}
        >
          Cancel draft
        </Button>
      </Dialog>
    </section>
  );
}
export function PosProductTile({
  product,
  currency,
  disabled,
  onAdd,
  onFavorite,
}: {
  product: PosProduct;
  currency: string;
  disabled: boolean;
  onAdd: () => void;
  onFavorite: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = imageFailed ? null : imageUrl(product.image),
    available = product.variants.some((v) => !v.reason),
    prices = product.variants.filter((v) => !v.reason).map((v) => v.price),
    price = Math.min(...prices);
  return (
    <Card className="pos-product">
      <Button
        variant="disclosure"
        className="pos-product-trigger"
        disabled={disabled || !available}
        onClick={onAdd}
        aria-label={`Add ${product.name}${product.variants.length > 1 ? ', choose variant' : ''}`}
      >
        <span className="pos-product-image">
          {image ? (
            <img
              src={image}
              alt=""
              width="180"
              height="130"
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <UtilityIcon name="store" />
          )}
        </span>
        <span className="pos-product-name">{product.name}</span>
        <span>
          {available
            ? `${prices.some((p) => p !== price) ? 'From ' : ''}${formatMoney(price, currency as 'USD')}`
            : (product.variants[0]?.reason ?? 'Unavailable')}
        </span>
        {product.variants.length > 1 && (
          <span className="pos-variant-hint">
            {product.variants.length} variants
          </span>
        )}
      </Button>
      <Button
        iconOnly
        className="pos-favorite pos-heart-button"
        aria-label={`${product.favorite ? 'Unfavorite' : 'Favorite'} ${product.name}`}
        aria-pressed={product.favorite}
        onClick={onFavorite}
      >
        <UtilityIcon name="heart" filled={product.favorite} />
      </Button>
    </Card>
  );
}
