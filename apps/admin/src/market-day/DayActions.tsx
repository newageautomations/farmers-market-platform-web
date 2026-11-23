import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DayRecap, DayView, PreparationView } from '@market/api';
import { Alert, Badge, Dialog, EmptyState, Field, Textarea } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandSearch,
  FarmstandSelect,
  type FarmstandIconName,
} from '@market/ui/farmstand';
import { SettingsPanel } from '../settings/SettingsPanel';
import { MarketsSummary } from '../vendor/MarketsSummary';
import { MarketsPagination } from '../vendor/MarketsPagination';
import { ReadState, useRead } from '../vendor/common';
import type { VendorService } from '../vendor/service';
import type { MarketService } from '../market/service';
import { pickupState, readPickupOrders } from '../vendor/pickup-data';

const PAGE_SIZE = 6;
function metric(value: number | null, currency?: string) {
  return value == null
    ? 'Unavailable'
    : currency
      ? new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
        }).format(value / 100)
      : value.toLocaleString();
}
function metricIcon(key: string): FarmstandIconName {
  if (key.startsWith('best:')) return 'tag';
  if (/sale|revenue|refund/.test(key)) return 'receipt-text';
  if (/order|pickup|preorder/.test(key)) return 'shopping-bag';
  if (/attendance|check/.test(key)) return 'circle-check';
  if (/vendor/.test(key)) return 'user-round';
  if (/assist/.test(key)) return 'clipboard-list';
  return 'chart-column';
}
function age(from: string, now: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.parse(now) - Date.parse(from)) / 60000),
  );
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `${hours} h ${minutes % 60} min ago`
    : `${Math.floor(hours / 24)} d ago`;
}
/** Placeable Market Day sections; each is null when it does not apply. */
export interface DayActionParts {
  alerts: ReactNode;
  assistance: ReactNode;
  finish: ReactNode;
}
/**
 * Market and Closing actions: assistance requests and finishing the day.
 * Owns their reads, commands, polling and dialogs; the caller places the
 * returned sections through `children` (defaults to a simple stack).
 */
export function DayActions({
  vendor,
  market,
  data,
  phase,
  children,
}: {
  vendor?: VendorService;
  market?: MarketService;
  data: PreparationView;
  phase: string;
  children?: (parts: DayActionParts) => ReactNode;
}) {
  const service = (market ?? vendor)!;
  const api = service.marketDay!;
  const scope = market ? 'MANAGER' : 'VENDOR';
  const occurrenceId = data.occurrence.id;
  const active = phase !== 'Setup';
  const lock = useRef(false);
  const [observed, setObserved] = useState<DayView>();
  const load = useCallback(async () => {
    const next = await api.read(scope, occurrenceId);
    setObserved(next);
    return next;
  }, [api, scope, occurrenceId]);
  const query = useRead(`day-actions:${scope}:${occurrenceId}`, load, active);
  const [committed, setCommitted] = useState<DayView>();
  const view = committed ?? query.data ?? observed;
  const refreshQuery = query.refresh;
  const refresh = useCallback(() => {
    setCommitted(undefined);
    refreshQuery();
  }, [refreshQuery]);
  // One bounded request per interval, only while the active view is visible. No background catch-up loop.
  useEffect(() => {
    if (!active) return;
    const visible = () => {
      if (
        document.visibilityState === 'visible' &&
        !query.loading &&
        !lock.current
      )
        refresh();
    };
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(visible, 30000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [active, refresh, query.loading]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [requestOpen, setRequestOpen] = useState(false);
  const [category, setCategory] = useState('Booth');
  const [description, setDescription] = useState('');
  const [confirm, setConfirm] = useState<'FINISH' | 'REOPEN'>();
  const confirmationRevision = useRef(0);
  const [busy, setBusy] = useState(false);
  const intent = useRef<{ signature: string; key: string } | undefined>(
    undefined,
  );
  const [error, setError] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (!animate) return;
    const timer = window.setTimeout(() => setAnimate(false), 400);
    return () => window.clearTimeout(timer);
  }, [animate]);
  const [recapRevision, setRecapRevision] = useState(0);
  const recapLoad = useCallback(
    () => api.recap(scope, occurrenceId),
    [api, scope, occurrenceId],
  );
  const recap = useRead(
    `day-recap:${recapRevision}`,
    recapLoad,
    active && recapOpen && !!view?.completion.finished,
  );
  const warningLoad = useCallback(async () => {
    const result: string[] = [];
    try {
      const preparation = await service.preparation!.read(scope, occurrenceId);
      const tasks = preparation.tasks.filter(
        (t) => t.title.startsWith('[Closing] ') && !t.completedAt,
      ).length;
      if (tasks > 0) result.push(`${tasks} open closing tasks.`);
      if (market) {
        const invoices = preparation.operationsSummary?.outstandingInvoices;
        if (invoices == null)
          result.push('Outstanding fee information unavailable.');
        else if (invoices > 0)
          result.push(`${invoices} invoices need follow-up.`);
      }
    } catch {
      result.push('Closing tasks and fee information unavailable.');
    }
    if (vendor) {
      if (!vendor.context.permissions.includes('ReadOwnOrders'))
        result.push(
          'Uncollected preorder information unavailable without order permission.',
        );
      else
        try {
          const orders = await readPickupOrders(vendor, String(occurrenceId));
          const uncollected = orders.filter(
            (o) =>
              o.portion.occurrenceId === String(occurrenceId) &&
              o.portion.vendorId === vendor.vendorId &&
              !['Picked up', 'Cancelled'].includes(pickupState(o)),
          ).length;
          if (uncollected > 0)
            result.push(`${uncollected} uncollected preorder purchases.`);
        } catch {
          result.push('Uncollected preorder information unavailable.');
        }
    } else {
      try {
        const current = await api.read(scope, occurrenceId);
        const unresolved = current.assistance.filter(
          (r) => r.status === 'OPEN',
        ).length;
        if (unresolved > 0)
          result.push(`${unresolved} unresolved assistance requests.`);
      } catch {
        result.push('Unresolved assistance information unavailable.');
      }
      try {
        const current = await api.recap(scope, occurrenceId);
        const followups = current.metrics.find(
          (m) => m.key === 'attendance',
        )?.value;
        if (followups == null)
          result.push('Attendance follow-up information unavailable.');
        else if (followups > 0)
          result.push(
            `${followups} recorded attendance follow-ups. This does not establish physical presence.`,
          );
      } catch {
        result.push('Attendance follow-up information unavailable.');
      }
    }
    return result;
  }, [service, scope, occurrenceId, market, vendor, api]);
  const warnings = useRead(
    `day-warnings:${confirm}`,
    warningLoad,
    confirm === 'FINISH',
  );
  async function command(payload: { action: string; [key: string]: unknown }) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    const signature = JSON.stringify(payload);
    if (intent.current?.signature !== signature)
      intent.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await api.command(scope, occurrenceId, {
        ...payload,
        commandKey: intent.current.key,
      });
      setCommitted(result);
      setObserved(result);
      if (payload.action === 'FINISH') {
        setRecapOpen(true);
        setAnimate(true);
        setRecapRevision((n) => n + 1);
      }
      if (payload.action === 'REOPEN') {
        setRecapOpen(false);
        setAnimate(false);
      }
      intent.current = undefined;
      setConfirm(undefined);
      setRequestOpen(false);
      setDescription('');
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const formId = useId();
  const [statusFilter, setStatusFilter] = useState('');
  const all = view?.assistance ?? [];
  const requests = all.filter(
    (r) =>
      (!statusFilter || r.status === statusFilter) &&
      `${r.vendor} ${r.booth ?? ''} ${r.category} ${r.description} ${r.status}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const open = all.filter((r) => r.status === 'OPEN').length;
  const detail = view?.assistance.find((r) => r.id === selected);
  const finished = view?.completion.finished;
  const last = view?.completion.history.at(-1);
  const alerts = active && (
    <>
      <ReadState
        skeleton="detail"
        rows={2}
        loading={!view && query.loading}
        error={query.error}
        retry={refresh}
      />
      {query.error && (
        <Alert severity="warning">
          Market Day information could not be refreshed. Request and completion
          status may have changed.
        </Alert>
      )}
      {error && (
        <Alert severity="error">
          The action was not confirmed. Retry with the same details, or refresh
          information to review a conflicting change.
        </Alert>
      )}
    </>
  );
  const assistance = phase === 'Market' && !data.privateMarket && (
    <SettingsPanel
      icon="clipboard-list"
      title={market ? 'Vendor assistance' : 'Your assistance requests'}
      className="day-assistance"
      description={
        view
          ? open
            ? `${open} open ${open === 1 ? 'request' : 'requests'}`
            : 'No open requests'
          : 'Requests are shared only with this market’s authorized staff.'
      }
      actions={
        vendor &&
        view?.canWrite && (
          <FarmstandButton
            size="compact"
            onClick={() => {
              setError(false);
              setRequestOpen(true);
            }}
          >
            <FarmstandIcon name="plus" />
            Request assistance
          </FarmstandButton>
        )
      }
    >
      {all.length > 0 && (
        <div className="day-assistance-filters">
          <Field
            id={`${formId}-search`}
            label={<span className="sr-only">Search assistance requests</span>}
          >
            <FarmstandSearch
              id={`${formId}-search`}
              aria-label="Search assistance requests"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Field>
          <Field
            id={`${formId}-status`}
            label={<span className="sr-only">Request status</span>}
          >
            <FarmstandSelect
              id={`${formId}-status`}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All requests</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </FarmstandSelect>
          </Field>
        </div>
      )}
      {view &&
        (requests.length ? (
          <>
            <ul className="day-requests" aria-label="Assistance requests">
              {requests
                .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="day-request"
                      onClick={() => setSelected(r.id)}
                    >
                      <span
                        className={`day-request-icon${r.status === 'OPEN' ? ' is-open' : ''}`}
                        aria-hidden="true"
                      >
                        <FarmstandIcon
                          name={
                            r.status === 'OPEN'
                              ? 'triangle-alert'
                              : 'circle-check'
                          }
                        />
                      </span>
                      <span className="day-request-text">
                        <strong>
                          {market ? r.vendor : r.category}
                          {market && r.booth ? ` · Booth ${r.booth}` : ''}
                        </strong>
                        <small>
                          {market ? `${r.category} · ` : ''}
                          <span title={new Date(r.createdAt).toLocaleString()}>
                            {age(r.createdAt, view.serverNow)}
                          </span>
                        </small>
                      </span>
                      <Badge tone={r.status === 'OPEN' ? 'warning' : 'success'}>
                        {r.status === 'OPEN' ? 'Open' : 'Resolved'}
                      </Badge>
                    </button>
                  </li>
                ))}
            </ul>
            {requests.length > PAGE_SIZE && (
              <MarketsPagination
                label="Assistance request pages"
                summary={`${requests.length} requests`}
                hasPrevious={page > 0}
                hasNext={(page + 1) * PAGE_SIZE < requests.length}
                onPrevious={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            )}
          </>
        ) : (
          <EmptyState
            title={
              all.length ? 'No matching requests' : 'No assistance requests'
            }
          >
            <p>
              {all.length
                ? 'Try another search or status.'
                : market
                  ? 'Vendor requests for help appear here.'
                  : 'Ask market staff for help with your booth, equipment or payment.'}
            </p>
          </EmptyState>
        ))}
    </SettingsPanel>
  );
  const finish = active && phase === 'Closing' && view && (
    <SettingsPanel
      icon="circle-check"
      title={finished ? 'Market day finished' : 'Finish when you are ready'}
      className="day-finish"
      description={
        last
          ? `${last.action === 'FINISH' ? 'Finished' : 'Reopened'} ${new Date(last.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} by staff ${last.actorId} · revision ${view.completion.revision}`
          : 'Finishing keeps operational tools and follow-up work available. It does not change attendance or finish another workspace.'
      }
      actions={
        finished ? (
          <>
            <FarmstandButton
              size="compact"
              variant={recapOpen ? 'secondary' : 'primary'}
              onClick={() => {
                setRecapOpen(true);
                setRecapRevision((n) => n + 1);
              }}
            >
              <FarmstandIcon name="chart-column" />
              View recap
            </FarmstandButton>
            {view.canWrite && (
              <FarmstandButton
                size="compact"
                variant="secondary"
                onClick={() => {
                  confirmationRevision.current = view.completion.revision;
                  setConfirm('REOPEN');
                }}
              >
                Reopen market day
              </FarmstandButton>
            )}
          </>
        ) : (
          view.canFinish && (
            <FarmstandButton
              size="compact"
              onClick={() => {
                setError(false);
                confirmationRevision.current = view.completion.revision;
                setConfirm('FINISH');
              }}
            >
              <FarmstandIcon name="circle-check" />
              {market ? 'Finish market' : 'Finish my market day'}
            </FarmstandButton>
          )
        )
      }
    >
      {!finished && !view.canFinish && (
        <p className="market-application-guidance">
          Finish is available to authorized staff once the scheduled start has
          passed, for an eligible, non-cancelled date.
        </p>
      )}
      {!finished && view.canFinish && (
        <p className="markets-muted">
          Outstanding work is shown as a warning before you confirm.
        </p>
      )}
      {finished && recapOpen && (
        <div
          className={
            animate
              ? 'market-day-recap market-day-recap-enter'
              : 'market-day-recap'
          }
          onAnimationEnd={() => setAnimate(false)}
          aria-label="Market day recap"
        >
          <ReadState
            skeleton="stats"
            loading={recap.loading}
            error={recap.error}
            retry={recap.refresh}
          />
          {recap.error && (
            <p>
              Your finished state is saved. Retry the recap without finishing
              again.
            </p>
          )}
          {recap.data && <Recap recap={recap.data} />}
        </div>
      )}
    </SettingsPanel>
  );
  const parts = {
    alerts: alerts || null,
    assistance: assistance || null,
    finish: finish || null,
  };
  return (
    <>
      {children ? (
        children(parts)
      ) : (
        <div className="market-day-actions farmstand-controls">
          {parts.alerts}
          {parts.finish}
          {parts.assistance}
        </div>
      )}
      <Dialog
        open={!!detail}
        busy={busy}
        title={
          detail
            ? market
              ? `${detail.vendor}: ${detail.category}`
              : `${detail.category} request`
            : 'Assistance request'
        }
        onClose={() => {
          if (!busy) setSelected(undefined);
        }}
      >
        {detail && (
          <div className="day-request-detail farmstand-controls">
            <dl className="market-application-facts">
              {market && (
                <div>
                  <dt>Booth</dt>
                  <dd>{detail.booth ?? 'Unknown'}</dd>
                </div>
              )}
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge
                    tone={detail.status === 'OPEN' ? 'warning' : 'success'}
                  >
                    {detail.status === 'OPEN' ? 'Open' : 'Resolved'}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            <p className="market-application-guidance">{detail.description}</p>
            {detail.resolvedAt && (
              <p className="markets-muted">
                Resolved {new Date(detail.resolvedAt).toLocaleString()} by staff{' '}
                {detail.resolvedBy}.
              </p>
            )}
            <div className="ui-actions ui-modal-actions">
              <FarmstandButton
                variant="secondary"
                disabled={busy}
                onClick={() => setSelected(undefined)}
              >
                Close
              </FarmstandButton>
              {market && view?.canWrite && detail.status === 'OPEN' && (
                <FarmstandButton
                  disabled={busy}
                  onClick={() =>
                    void command({
                      action: 'RESOLVE',
                      requestId: detail.id,
                      expectedRevision: detail.revision,
                    })
                  }
                >
                  <FarmstandIcon name="circle-check" />
                  Resolve request
                </FarmstandButton>
              )}
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={requestOpen}
        busy={busy}
        onClose={() => {
          if (!busy) setRequestOpen(false);
        }}
        title="Request assistance"
      >
        <form
          className="day-request-form farmstand-controls"
          onSubmit={(e) => {
            e.preventDefault();
            void command({ action: 'REQUEST', category, description });
          }}
        >
          <Field id="day-category" label="Category">
            <FarmstandSelect
              id="day-category"
              value={category}
              disabled={busy}
              onChange={(e) => setCategory(e.target.value)}
            >
              {['Booth', 'Equipment', 'Payment', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field id="day-description" label="Brief description">
            <Textarea
              id="day-description"
              required
              rows={4}
              maxLength={600}
              value={description}
              disabled={busy}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          {error && (
            <Alert severity="error">
              Request not confirmed. Retry keeps the same submission key.
            </Alert>
          )}
          <div className="ui-actions ui-modal-actions">
            <FarmstandButton
              variant="secondary"
              disabled={busy}
              onClick={() => setRequestOpen(false)}
            >
              Cancel
            </FarmstandButton>
            <FarmstandButton
              type="submit"
              disabled={busy || !description.trim()}
            >
              Send request
            </FarmstandButton>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!confirm}
        busy={busy}
        onClose={() => {
          if (!busy) setConfirm(undefined);
        }}
        title={
          confirm === 'REOPEN'
            ? 'Reopen market day?'
            : market
              ? 'Finish market?'
              : 'Finish my market day?'
        }
      >
        <div className="day-confirm farmstand-controls">
          {confirm === 'FINISH' ? (
            <>
              {!!warnings.data?.length && (
                <p>
                  Outstanding work is a warning. You can finish now and return
                  to authorized follow-up work.
                </p>
              )}
              <ReadState
                skeleton="spinner"
                loading={warnings.loading}
                error={warnings.error}
                retry={warnings.refresh}
              />
              {!!warnings.data?.length && (
                <ul className="day-confirm-warnings">
                  {warnings.data.map((w) => (
                    <li key={w}>
                      <FarmstandIcon name="triangle-alert" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
              {warnings.error && <p>Outstanding work could not be read.</p>}
            </>
          ) : (
            <p>
              Reopening preserves completion history and does not change
              attendance or scheduling.
            </p>
          )}
          {error && (
            <Alert severity="error">
              Action not confirmed. Retry, or cancel and refresh to review the
              latest revision.
            </Alert>
          )}
          <div className="ui-actions ui-modal-actions">
            <FarmstandButton
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm(undefined)}
            >
              Cancel
            </FarmstandButton>
            <FarmstandButton
              disabled={busy || (warnings.loading && confirm === 'FINISH')}
              onClick={() => {
                if (confirm && view)
                  void command({
                    action: confirm,
                    expectedRevision: confirmationRevision.current,
                  });
              }}
            >
              {confirm === 'REOPEN' ? 'Confirm reopen' : 'Confirm finish'}
            </FarmstandButton>
          </div>
        </div>
      </Dialog>
    </>
  );
}
/** Recap metrics as the shared summary cards. */
function Recap({ recap }: { recap: DayRecap }) {
  return (
    <>
      <MarketsSummary
        className="market-dates-summary day-recap-summary"
        items={recap.metrics.map((m) => ({
          label: m.label,
          value: metric(m.value, m.currency),
          icon: metricIcon(m.key),
          hint:
            [
              m.key === 'customers' ? '' : m.detail,
              m.previous != null &&
              m.value != null &&
              !m.key.startsWith('best:')
                ? `Previous comparable date: ${metric(m.previous, m.currency)}`
                : '',
            ]
              .filter(Boolean)
              .join(' · ') || ' ',
        }))}
      />
    </>
  );
}
