import './application-review.css';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  ApplicationReviewInput,
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import {
  Button,
  Dropdown,
  SearchSelect,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Pagination,
  SelectField,
  Spinner,
} from '@market/ui';
import { DataTable, date } from '../common';
import { useRead } from '../../vendor/common';
import { MarketDialog, StatusBadge, friendlyLabel } from '../presentation';
import { ApplicationReview } from './ApplicationReview';

type Props = {
  api: MarketOperationsApi;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates: boolean;
  canBilling: boolean;
  canRequestDocuments: boolean;
};
const defaults: ApplicationReviewInput = {
  mode: 'PAGE',
  search: '',
  status: '',
  category: '',
  sort: 'NEWEST',
  skip: 0,
  take: 20,
};
export function ApplicationSubmissions({
  api,
  data,
  run,
  ...permissions
}: Props) {
  const searchId = useId();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterClosing, setFilterClosing] = useState(false);
  const filterContainer = useRef<HTMLDivElement>(null);
  const filterCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (filterCloseTimer.current) clearTimeout(filterCloseTimer.current);
    },
    [],
  );
  function openFilters() {
    if (filterCloseTimer.current) clearTimeout(filterCloseTimer.current);
    setFilterClosing(false);
    setFilterOpen(true);
  }
  function closeFilters() {
    if (filterCloseTimer.current) clearTimeout(filterCloseTimer.current);
    filterContainer.current?.style.setProperty(
      '--filter-card-height',
      `${filterContainer.current.scrollHeight}px`,
    );
    setFilterClosing(true);
    filterTrigger.current?.focus();
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    filterCloseTimer.current = setTimeout(
      () => {
        setFilterOpen(false);
        setFilterClosing(false);
        filterCloseTimer.current = null;
      },
      reduced ? 0 : 240,
    );
  }
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const filterCardId = useId();
  const quickViews = useRef<HTMLDivElement>(null);
  const quickBackdrop = useRef<HTMLSpanElement>(null);
  const [filters, setFilters] = useState(defaults);
  useLayoutEffect(() => {
    const group = quickViews.current;
    const backdrop = quickBackdrop.current;
    if (!group || !backdrop) return;
    const measure = () => {
      const selected = group.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"]',
      );
      if (!selected) return;
      backdrop.style.transform = `translateX(${selected.offsetLeft}px)`;
      backdrop.style.width = `${selected.offsetWidth}px`;
      backdrop.style.height = `${selected.offsetHeight}px`;
      backdrop.style.visibility = 'visible';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    for (const button of group.querySelectorAll('button'))
      observer.observe(button);
    return () => observer.disconnect();
  }, [filters.quickView]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get('submission');
    return value && /^[1-9]\d*$/.test(value) ? Number(value) : null;
  });
  const [busy, setBusy] = useState(false);
  const origin = useRef<HTMLElement | null>(null);
  const workspace = useRef<HTMLElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  function closeReview() {
    setConfirmClose(false);
    setDirty(false);
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('submission');
    window.history.replaceState(null, '', url);
    requestAnimationFrame(() => {
      if (origin.current?.isConnected) origin.current.focus();
      else
        document
          .querySelector<HTMLInputElement>('input[type="search"]')
          ?.focus();
    });
  }
  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmClose(true);
    else closeReview();
  }
  useEffect(() => {
    const node = workspace.current;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !confirmClose &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        requestClose();
      }
    };
    node?.addEventListener('keydown', escape);
    return () => node?.removeEventListener('keydown', escape);
  });
  useEffect(() => {
    if (selected !== null) title.current?.focus();
  }, [selected]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const navigation = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.('a[href]');
      if (
        !link ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        (link as HTMLAnchorElement).target === '_blank'
      )
        return;
      if (
        !window.confirm('Leave this application and discard unsaved changes?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', guard);
    document.addEventListener('click', navigation, true);
    return () => {
      window.removeEventListener('beforeunload', guard);
      document.removeEventListener('click', navigation, true);
    };
  }, [dirty]);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((f) =>
          f.search === search.trim()
            ? f
            : { ...f, search: search.trim(), skip: 0 },
        ),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);
  const pageRead = useCallback(
    () => api.read('APPLICATIONS', undefined, filters),
    [api, filters],
  );
  const detailRead = useCallback(
    () =>
      api.read('APPLICATIONS', undefined, {
        mode: 'DETAIL',
        submissionId: selected!,
      }),
    [api, selected],
  );
  const pageQuery = useRead(
    `application-page:${data.marketId}:${JSON.stringify(filters)}:${revision}`,
    pageRead,
    true,
    { retainPreviousData: true },
  );
  const detailQuery = useRead(
    `application-detail:${data.marketId}:${selected}:${revision}`,
    detailRead,
    selected !== null,
    { retainPreviousData: true },
  );
  const page = pageQuery.data?.applicationPage;
  const detail = detailQuery.data;
  const error = pageQuery.error;
  const detailError = detailQuery.error;
  const loading = pageQuery.loading;
  const update = (next: Partial<ApplicationReviewInput>) =>
    setFilters((f) => ({ ...f, ...next, skip: 0 }));
  const s = detail?.submissionDetail;
  const command = async (c: OperationsCommand) => {
    const result = await run(c);
    if (result !== null && result !== undefined) {
      if (c.action === 'REVIEW_APPLICATION') {
        setDirty(false);
        if (c.data.status !== 'ACCEPTED' && c.data.status !== s?.status)
          closeReview();
      }
      refresh();
    }
    return result;
  };
  return (
    <div className="application-submissions">
      <div hidden={selected !== null}>
        <div
          ref={quickViews}
          className="application-quick-views"
          role="group"
          aria-label="Application quick views"
        >
          <span
            ref={quickBackdrop}
            className="application-quick-backdrop"
            aria-hidden="true"
          />
          {(['ALL', 'REVIEW', 'VENDOR'] as const).map((value, index) => (
            <Button
              type="button"
              variant="tertiary"
              size="compact"
              key={value}
              aria-pressed={(filters.quickView ?? 'ALL') === value}
              onClick={() => update({ quickView: value })}
            >
              {['All', 'To review', 'Awaiting vendor'][index]}
            </Button>
          ))}
        </div>
        <div className="ops-toolbar application-filter-toolbar">
          <Field id={searchId} label="Search applications">
            <Input
              id={searchId}
              type="search"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications..."
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            ref={filterTrigger}
            aria-expanded={filterOpen && !filterClosing}
            aria-controls={filterCardId}
            onClick={() =>
              filterOpen && !filterClosing ? closeFilters() : openFilters()
            }
          >
            <span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 17h16M9 4v6M15 14v6" />
              </svg>{' '}
              Filters
              {[
                filters.status,
                filters.templateId,
                filters.category,
                filters.occurrenceId,
              ].filter(Boolean).length
                ? ` (${[filters.status, filters.templateId, filters.category, filters.occurrenceId].filter(Boolean).length})`
                : ''}
            </span>
          </Button>
        </div>
        <div
          id={filterCardId}
          ref={filterContainer}
          className={filterClosing ? 'application-filter-closing' : undefined}
          inert={filterClosing || undefined}
        >
          <Dropdown
            label="Filter applications"
            open={filterOpen}
            className="application-filter-card"
          >
            <div className="application-filter-grid">
              <div>
                <SearchSelect
                  label="Application status"
                  value={filters.status ?? ''}
                  onChange={(status) => update({ status })}
                  placeholder="All statuses"
                  options={[
                    { value: '', label: 'All statuses', pinned: true },
                    ...[
                      'SUBMITTED',
                      'UNDER_REVIEW',
                      'NEEDS_INFO',
                      'WAITLISTED',
                      'ACCEPTED',
                      'DECLINED',
                      'WITHDRAWN',
                    ].map((value) => ({ value, label: friendlyLabel(value) })),
                  ]}
                  renderOption={(option) =>
                    option.value ? (
                      <StatusBadge>{option.value}</StatusBadge>
                    ) : (
                      <span>{option.label}</span>
                    )
                  }
                />
                {filters.status && (
                  <StatusBadge>{filters.status ?? ''}</StatusBadge>
                )}
              </div>
              <SelectField
                label="Application template"
                value={filters.templateId ?? ''}
                onChange={(e) =>
                  update({ templateId: Number(e.target.value) || undefined })
                }
              >
                <option value="">All templates</option>
                {page?.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Vendor category"
                value={filters.category}
                onChange={(e) => update({ category: e.target.value })}
              >
                <option value="">All categories</option>
                {page?.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Requested market date"
                value={filters.occurrenceId ?? ''}
                onChange={(e) =>
                  update({ occurrenceId: Number(e.target.value) || undefined })
                }
              >
                <option value="">All dates</option>
                {page?.dates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {date(d.startsAt)} · {d.venue}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Sort applications"
                value={filters.sort}
                onChange={(e) =>
                  update({
                    sort: e.target.value as ApplicationReviewInput['sort'],
                  })
                }
              >
                <option value="NEWEST">Most recently submitted</option>
                <option value="OLDEST">Oldest submitted</option>
                <option value="BUSINESS">Business name</option>
              </SelectField>
            </div>
            <div className="ui-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  update({
                    status: '',
                    templateId: undefined,
                    category: '',
                    occurrenceId: undefined,
                    sort: 'NEWEST',
                  });
                }}
              >
                Clear filters
              </Button>
              <Button
                type="button"
                onClick={() => {
                  closeFilters();
                }}
              >
                Done
              </Button>
            </div>
          </Dropdown>
        </div>
        {[
          filters.status,
          filters.templateId,
          filters.category,
          filters.occurrenceId,
        ].some(Boolean) && (
          <div className="ops-toolbar" aria-label="Active filters">
            {[
              {
                key: 'status',
                value: filters.status,
                label: filters.status ? friendlyLabel(filters.status) : '',
              },
              {
                key: 'templateId',
                value: filters.templateId,
                label:
                  page?.templates.find((t) => t.id === filters.templateId)
                    ?.name ?? 'Application template',
              },
              {
                key: 'category',
                value: filters.category,
                label: filters.category,
              },
              {
                key: 'occurrenceId',
                value: filters.occurrenceId,
                label: date(
                  page?.dates.find((d) => d.id === filters.occurrenceId)
                    ?.startsAt,
                ),
              },
            ]
              .filter((chip) => chip.value)
              .map((chip) => (
                <Button
                  key={chip.key}
                  variant="secondary"
                  size="compact"
                  aria-label={`Remove ${chip.label}`}
                  onClick={() =>
                    update({
                      [chip.key]:
                        chip.key === 'status' || chip.key === 'category'
                          ? ''
                          : undefined,
                    })
                  }
                >
                  {chip.key === 'status' ? (
                    <StatusBadge>{filters.status ?? ''}</StatusBadge>
                  ) : (
                    chip.label
                  )}{' '}
                  �
                </Button>
              ))}
            <Button
              variant="tertiary"
              onClick={() =>
                update({
                  status: '',
                  templateId: undefined,
                  category: '',
                  occurrenceId: undefined,
                })
              }
            >
              Clear all
            </Button>
          </div>
        )}
        {error ? (
          <>
            <ErrorState error={error} />
            <Button onClick={refresh}>Retry applications</Button>
          </>
        ) : loading ? (
          <Spinner label="Loading applications" />
        ) : (
          page && (
            <>
              <DataTable
                label="Application submissions"
                headings={['Business', 'Status']}
                recordDetails={{
                  status: 1,
                  onOpen: (index) => {
                    origin.current = document.activeElement as HTMLElement;
                    setSelected(page.items[index]!.id);
                  },
                }}
              >
                {page.items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.businessName}</td>
                    <td>
                      <StatusBadge>{row.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
                {!page.items.length && (
                  <tr>
                    <td colSpan={2}>
                      <EmptyState title="No matching applications">
                        <p>
                          Change or reset the filters to see other submissions.
                        </p>
                      </EmptyState>
                    </td>
                  </tr>
                )}
              </DataTable>
              <Pagination
                hasPrevious={page.skip > 0}
                hasNext={page.skip + page.take < page.totalItems}
                onPrevious={() =>
                  setFilters((f) => ({
                    ...f,
                    skip: Math.max(0, (f.skip ?? 0) - page.take),
                  }))
                }
                onNext={() =>
                  setFilters((f) => ({ ...f, skip: (f.skip ?? 0) + page.take }))
                }
                summary={`${page.totalItems ? page.skip + 1 : 0} to ${Math.min(page.skip + page.items.length, page.totalItems)} of ${page.totalItems} applications`}
              />
            </>
          )
        )}
      </div>
      {selected !== null && (
        <section
          ref={workspace}
          tabIndex={-1}
          className="application-review-workspace"
          aria-labelledby="application-review-heading"
        >
          <header className="application-review-header">
            <div>
              <h2 id="application-review-heading" ref={title} tabIndex={-1}>
                {s?.id === selected
                  ? s.applicant.businessName
                  : 'Application review'}
              </h2>
              {s?.id === selected && (
                <p className="application-review-metadata">
                  <span>{s.templateName ?? 'Original application'}</span>
                  <span aria-hidden="true">&middot;</span>
                  <StatusBadge>{s.status}</StatusBadge>
                  <span aria-hidden="true">&middot;</span>
                  <span>Submitted {date(s.createdAt, detail?.timeZone)}</span>
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={requestClose}
            >
              Back to applications
            </Button>
          </header>
          {detailError ? (
            <ErrorState error={detailError} />
          ) : s?.id === selected && detail ? (
            <ApplicationReview
              key={`${s.id}:${s.revision}`}
              submission={s}
              data={detail}
              run={command}
              {...permissions}
              onRefresh={refresh}
              onSaved={refresh}
              onBusy={setBusy}
              onDirty={setDirty}
            />
          ) : (
            <Spinner label="Loading application details" />
          )}
        </section>
      )}
      <MarketDialog
        open={confirmClose}
        busy={busy}
        title="Discard unsaved changes?"
        onClose={() => setConfirmClose(false)}
      >
        {() => (
          <>
            <p>
              Your unsaved notes, decision changes and information request draft
              will be discarded.
            </p>
            <div className="ui-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmClose(false)}
              >
                Keep reviewing
              </Button>
              <Button
                type="button"
                variant="destructive-outline"
                onClick={closeReview}
              >
                Discard changes and close
              </Button>
            </div>
          </>
        )}
      </MarketDialog>
    </div>
  );
}
