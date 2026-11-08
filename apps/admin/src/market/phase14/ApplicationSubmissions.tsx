import './application-review.css';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
  SelectField,
  Spinner,
} from '@market/ui';
import { date } from '../common';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { MarketsPagination as Pagination } from '../../vendor/MarketsPagination';
import { useRead } from '../../vendor/common';
import { StatusBadge, friendlyLabel } from '../presentation';
import { navigateApplication } from './application-navigation';

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
export function ApplicationSubmissions({ api, data }: Props) {
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
  const viewId = useId();
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get('submission');
    return value && /^[1-9]\d*$/.test(value) ? Number(value) : null;
  });
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
  const pageQuery = useRead(
    `application-page:${data.marketId}:${JSON.stringify(filters)}:${revision}`,
    pageRead,
    true,
    { retainPreviousData: true },
  );
  const error = pageQuery.error;
  const loading = pageQuery.loading;
  const update = (next: Partial<ApplicationReviewInput>) =>
    setFilters((f) => ({ ...f, ...next, skip: 0 }));
  const page = pageQuery.data?.applicationPage;
  const current =
    page?.items.find((row) => row.id === selected) ?? page?.items[0];
  const previewId = current?.id;
  const detailRead = useCallback(
    () =>
      api.read('APPLICATIONS', undefined, {
        mode: 'DETAIL',
        submissionId: previewId!,
      }),
    [api, previewId],
  );
  const detailQuery = useRead(
    `application-detail:${data.marketId}:${previewId}:${revision}`,
    detailRead,
    previewId !== undefined,
    { retainPreviousData: true },
  );
  const detail = detailQuery.data;
  const s = detail?.submissionDetail;
  return (
    <div className="markets-columns market-applications-columns application-submissions">
      <div className="market-applications-main">
        <FarmstandPanel
          as="section"
          className="markets-list market-applications-list application-submissions-list"
          aria-label="Submitted applications"
        >
          <h2>Submitted applications</h2>
          <div className="markets-filters submission-filters">
            <Field
              id={searchId}
              label={<span className="sr-only">Search applications</span>}
            >
              <FarmstandSearch
                id={searchId}
                type="search"
                maxLength={200}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search applications..."
              />
            </Field>
            <Field
              id={viewId}
              label={<span className="sr-only">Show applications</span>}
            >
              <FarmstandSelect
                id={viewId}
                value={filters.quickView ?? 'ALL'}
                onChange={(e) =>
                  update({
                    quickView: e.target
                      .value as ApplicationReviewInput['quickView'],
                  })
                }
              >
                <option value="ALL">All</option>
                <option value="REVIEW">To review</option>
                <option value="VENDOR">Awaiting vendor</option>
              </FarmstandSelect>
            </Field>
            <FarmstandButton
              type="button"
              variant="secondary"
              className="submission-filter-trigger"
              ref={filterTrigger}
              aria-expanded={filterOpen && !filterClosing}
              aria-controls={filterCardId}
              onClick={() =>
                filterOpen && !filterClosing ? closeFilters() : openFilters()
              }
            >
              <FarmstandIcon name="sliders-horizontal" />
              <span>
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
            </FarmstandButton>
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
                      ].map((value) => ({
                        value,
                        label: friendlyLabel(value),
                      })),
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
                    update({
                      occurrenceId: Number(e.target.value) || undefined,
                    })
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
                <FarmstandTable
                  label="Application submissions"
                  wide
                  headings={['Business', 'Status', '']}
                >
                  {page.items.map((row) => {
                    const href = `/market/application-submissions/${row.id}`;
                    return (
                      <tr
                        key={row.id}
                        tabIndex={0}
                        className={
                          row.id === current?.id
                            ? 'market-application-selected'
                            : undefined
                        }
                        onClick={() => setSelected(row.id)}
                        onKeyDown={(event) => {
                          if (
                            event.target === event.currentTarget &&
                            ['Enter', ' '].includes(event.key)
                          ) {
                            event.preventDefault();
                            setSelected(row.id);
                          }
                        }}
                      >
                        <th scope="row">
                          <div className="markets-identity">
                            <span className="markets-identity-icon">
                              <FarmstandIcon name="store" />
                            </span>
                            <span className="market-application-name">
                              {row.businessName}
                            </span>
                          </div>
                        </th>
                        <td>
                          <StatusBadge>{row.status}</StatusBadge>
                        </td>
                        <td>
                          <FarmstandLink
                            href={href}
                            variant="secondary"
                            className="occurrence-manage"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigateApplication(event);
                            }}
                            aria-label={`Open ${row.businessName}`}
                          >
                            Open
                            <FarmstandIcon name="chevron-right" />
                          </FarmstandLink>
                        </td>
                      </tr>
                    );
                  })}
                  {!page.items.length && (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState title="No matching applications">
                          <p>
                            Change or reset the filters to see other
                            submissions.
                          </p>
                        </EmptyState>
                      </td>
                    </tr>
                  )}
                </FarmstandTable>
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
                    setFilters((f) => ({
                      ...f,
                      skip: (f.skip ?? 0) + page.take,
                    }))
                  }
                  summary={`${page.totalItems ? page.skip + 1 : 0} to ${Math.min(page.skip + page.items.length, page.totalItems)} of ${page.totalItems} applications`}
                />
              </>
            )
          )}
        </FarmstandPanel>
      </div>
      <FarmstandPanel
        as="section"
        className="markets-next market-application-details application-template-details"
        aria-label="Submission details"
      >
        <h2>
          <FarmstandIcon name="file-text" />
          Submission details
        </h2>
        <div className="markets-next-content">
          {current ? (
            <>
              <div className="occurrence-details-title">
                <h3>{current.businessName}</h3>
                <StatusBadge>{current.status}</StatusBadge>
              </div>
              {detailQuery.error ? (
                <>
                  <ErrorState error={detailQuery.error} />
                  <FarmstandButton
                    variant="secondary"
                    onClick={detailQuery.refresh}
                  >
                    Retry details
                  </FarmstandButton>
                </>
              ) : s?.id === current.id ? (
                <dl className="market-application-facts">
                  <div>
                    <dt>Application</dt>
                    <dd>{s.templateName || 'Original application'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{date(s.createdAt, detail?.timeZone)}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {[s.applicant.firstName, s.applicant.lastName]
                        .filter(Boolean)
                        .join(' ') || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{s.applicant.email || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{s.applicant.category || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Requested dates</dt>
                    <dd>{s.requestedOccurrenceIds.length}</dd>
                  </div>
                </dl>
              ) : (
                <Spinner label="Loading submission details" />
              )}
              <div className="application-details-actions">
                <FarmstandLink
                  href={`/market/application-submissions/${current.id}`}
                  variant="primary"
                  onClick={navigateApplication}
                >
                  Open application
                  <FarmstandIcon name="arrow-right" />
                </FarmstandLink>
              </div>
            </>
          ) : (
            <p>Select a submission to see its details.</p>
          )}
        </div>
      </FarmstandPanel>
    </div>
  );
}
