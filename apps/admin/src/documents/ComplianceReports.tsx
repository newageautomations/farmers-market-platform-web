import {
  useCallback,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type {
  ComplianceData,
  ComplianceExceptions,
  ComplianceReport,
  ComplianceRequest,
  DocumentsApi,
  UpcomingCompliance,
} from '@market/api';
import {
  Alert,
  Card,
  DataTable as OverviewTable,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  SelectField,
  Tooltip,
} from '@market/ui';
import {
  FarmstandButton as Button,
  FarmstandIcon,
  FarmstandPagination as Pagination,
  FarmstandPanel,
  FarmstandLink,
  FarmstandTable as DataTable,
} from '@market/ui/farmstand';
import { DocumentFeedback, DocumentStatus } from '@market/ui/documents';
import { ReadState, RouteLink, useRead } from '../vendor/common';
import { SettingsPanel } from '../settings/SettingsPanel';
import { DetailSheet } from '../market/mobile';
import { DocumentFacts, documentDate } from './DocumentCard';
import { MarketsSummary } from '../vendor/MarketsSummary';

const labels: Record<string, string> = {
  vendor: 'Vendor',
  status: 'Documentation',
  participation: 'Participation',
  required: 'Required',
  approved: 'Approved documents',
  missing: 'Missing',
  pending: 'Pending review',
  rejected: 'Rejected',
  expired: 'Expired',
  expiring_soon: 'Expiring soon',
  outstanding_acknowledgments: 'Outstanding required acknowledgments',
  exceptions: 'Manager exceptions',
  waivers: 'Waivers',
  reasons: 'Reason',
  title: 'Requirement',
  category: 'Category',
  kind: 'Type',
  expires_on: 'Expiration date',
  published_version: 'Current published version',
  version: 'Version requiring acknowledgment',
  acknowledged_at: 'Acknowledged at',
  exception_reason: 'Exception reason',
  action_required: 'Action required',
  assigned: 'Assigned',
  outstanding: 'Outstanding',
};

const reportTypes = [
  'vendors',
  'upcoming',
  'expiration',
  'agreements',
  'requirements',
];
/** Only report inputs are forwarded. Workspace routing parameters stay local. */
function linkedFilters(): Record<string, unknown> {
  const search = new URLSearchParams(window.location.search);
  const report = search.get('report');
  const filters: Record<string, unknown> = {
    report:
      report && reportTypes.includes(report)
        ? report
        : search.has('occurrence')
          ? 'upcoming'
          : 'vendors',
    occurrenceId: search.get('occurrenceId') ?? search.get('occurrence') ?? '',
  };
  for (const key of [
    'startsOn',
    'endsOn',
    'vendorId',
    'status',
    'requirementId',
    'category',
    'expiresFrom',
    'expiresTo',
  ]) {
    const value = search.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

export function ComplianceReports({
  api,
  data,
  canWrite,
  revision = 0,
  requestCard,
  onPreview,
}: {
  api: DocumentsApi;
  data: ComplianceData;
  canWrite: boolean;
  /** Workspace data revision; a review decision re-reads the report. */
  revision?: number;
  /** The Vendor compliance request card, whose dialog records decisions. */
  requestCard: (request: ComplianceRequest) => ReactNode;
  onPreview?: (fileId: string, title: string) => void;
}) {
  const id = useId(),
    [filtersOpen, setFiltersOpen] = useState(false),
    [selected, setSelected] = useState<string>(),
    [filters, setFilters] = useState<Record<string, unknown>>(linkedFilters),
    [skip, setSkip] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [exception, setException] = useState<number>(),
    [manageExceptions, setManageExceptions] = useState(false);
  const eventsRead = useCallback(
    () => api.advanced<UpcomingCompliance>({ view: 'upcoming' }),
    [api],
  );
  const events = useRead('report-events', eventsRead);
  const summary = filters.report === 'vendors' || filters.report === 'upcoming';
  const expiration = filters.report === 'expiration';
  const selectable = summary || expiration;
  const rowKey = (row: ComplianceReport['items'][number], index: number) =>
    summary
      ? String(row.vendor_id)
      : JSON.stringify([row.vendor_id, row.requirement_id, row.title, index]);
  const read = useCallback(
    () => api.advanced<ComplianceReport>({ view: 'report', ...filters, skip }),
    [api, filters, skip],
  );
  const state = useRead(
    `report:${JSON.stringify(filters)}:${skip}:${revision}`,
    read,
    true,
    { retainPreviousData: true },
  );
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => key !== 'report' && !!value,
  ).length;
  const current = selectable
    ? state.data?.items.find((row, index) => rowKey(row, index) === selected)
    : undefined;
  const pending = current
    ? data.requests.filter(
        (r) =>
          r.vendor_id === Number(current.vendor_id) &&
          !r.waived &&
          r.status === 'Pending review',
      )
    : [];
  const currentRequest =
    expiration && current
      ? data.requests.find(
          (r) =>
            r.vendor_id === Number(current.vendor_id) &&
            r.requirement_id === current.requirement_id,
        )
      : undefined;
  const [notificationResult, setNotificationResult] = useState<{
    key: string | undefined;
    message: string;
  }>();
  async function notifyExpiration() {
    if (!currentRequest?.submission) return;
    setBusy(true);
    setError(undefined);
    setNotificationResult(undefined);
    try {
      const result = (await api.command(
        'SEND_EXPIRATION_NOTIFICATION',
        { submissionId: currentRequest.submission.id },
        currentRequest.id,
        currentRequest.revision,
      )) as { queued: boolean };
      setNotificationResult({
        key: selected,
        message: result.queued
          ? 'Expiration notification queued for the vendor.'
          : 'An expiration notification was already requested for this version today.',
      });
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSkip(0);
    setSelected(undefined);
    setFilters(Object.fromEntries(new FormData(e.currentTarget)));
  }
  async function download() {
    setBusy(true);
    setError(undefined);
    try {
      const report = await api.advanced<ComplianceReport>({
        view: 'report',
        ...filters,
        export: true,
      });
      if (!report.csv) throw new Error('Missing CSV');
      const url = URL.createObjectURL(
        new Blob(['\uFEFF', report.csv], { type: 'text/csv;charset=utf-8' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'market-compliance.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="documents-view">
      {filtersOpen && (
        <div id={`${id}-filters`}>
          <SettingsPanel
            icon="sliders-horizontal"
            title="Report filters"
            description="Readiness is advisory. Application acceptance, participation and attendance are separate decisions. Event reports use current approvals and sharing authorization to forecast validity."
          >
            <form onSubmit={apply} className="documents-filters">
              <SelectField
                id={`${id}-report`}
                name="report"
                label="Report"
                defaultValue={String(filters.report)}
              >
                {[
                  ['vendors', 'Vendor compliance summary'],
                  ['upcoming', 'Upcoming Market readiness'],
                  ['expiration', 'Expiration report'],
                  ['agreements', 'Agreement acknowledgments'],
                  ['requirements', 'Document requirement summary'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id={`${id}-event`}
                name="occurrenceId"
                label="Market event"
                defaultValue={String(filters.occurrenceId ?? '')}
              >
                <option value="">Date preview or current date</option>
                {events.data?.items.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.starts_on} through {e.ends_on}
                  </option>
                ))}
              </SelectField>
              <Field id={`${id}-from`} label="Preview start date">
                <Input
                  id={`${id}-from`}
                  name="startsOn"
                  type="date"
                  defaultValue={String(filters.startsOn ?? '')}
                />
              </Field>
              <Field id={`${id}-to`} label="Preview end date">
                <Input
                  id={`${id}-to`}
                  name="endsOn"
                  type="date"
                  defaultValue={String(filters.endsOn ?? '')}
                />
              </Field>
              <SelectField
                id={`${id}-vendor`}
                name="vendorId"
                defaultValue={String(filters.vendorId ?? '')}
                label="Vendor"
              >
                <option value="">All eligible vendors</option>
                {data.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id={`${id}-status`}
                name="status"
                defaultValue={String(filters.status ?? '')}
                label="Compliance status"
              >
                <option value="">All statuses</option>
                {[
                  'Ready',
                  'Incomplete',
                  'Pending review',
                  'No requirements',
                  'Unknown',
                  'Approved',
                  'Missing',
                  'Expired',
                  'Rejected',
                  'Access revoked',
                  'Waived',
                  'Manager exception',
                  'Outstanding',
                  'Acknowledged',
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </SelectField>
              <SelectField
                id={`${id}-requirement`}
                name="requirementId"
                defaultValue={String(filters.requirementId ?? '')}
                label="Document requirement"
              >
                <option value="">All requirements</option>
                {data.requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
                {data.agreement_requirements?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} (agreement)
                  </option>
                ))}
              </SelectField>
              <SelectField
                id={`${id}-category`}
                name="category"
                defaultValue={String(filters.category ?? '')}
                label="Document category"
              >
                <option value="">All categories</option>
                {data.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectField>
              <Field id={`${id}-expiry-from`} label="Expiration from">
                <Input
                  id={`${id}-expiry-from`}
                  name="expiresFrom"
                  type="date"
                  defaultValue={String(filters.expiresFrom ?? '')}
                />
              </Field>
              <Field id={`${id}-expiry-to`} label="Expiration through">
                <Input
                  id={`${id}-expiry-to`}
                  name="expiresTo"
                  type="date"
                  defaultValue={String(filters.expiresTo ?? '')}
                />
              </Field>
              <div className="documents-filters-actions">
                <Button type="submit">Apply</Button>
              </div>
            </form>
            <ReadState {...events} retry={events.refresh} />
            {events.data?.hasMore && (
              <Alert severity="info">
                Showing the first 20 upcoming events. Use a date preview for
                later dates.
              </Alert>
            )}
          </SettingsPanel>
        </div>
      )}
      <ReadState {...state} retry={state.refresh} />
      {!!error && <DocumentFeedback error={error} />}
      {state.data?.counts && (
        <MarketsSummary
          className="documents-summary"
          items={[
            {
              label: 'Ready',
              value: state.data.counts.ready,
              hint: 'Across all matching vendors',
              icon: 'circle-check',
              tone: 'success',
            },
            {
              label: 'Incomplete',
              value: state.data.counts.incomplete,
              hint: 'Missing, rejected or expired',
              icon: 'triangle-alert',
              tone: 'danger',
            },
            {
              label: 'Pending review',
              value: state.data.counts.pending,
              hint: 'Awaiting a manager decision',
              icon: 'clipboard-list',
              tone: 'warning',
            },
            {
              label: 'Unknown',
              value: state.data.counts.unknown,
              hint: 'Readiness cannot be determined',
              icon: 'info',
            },
          ]}
        />
      )}
      {state.data && (
        <div
          className={`markets-columns market-applications-columns documents-report-columns${current ? ' documents-report-open' : ''}`}
        >
          <SettingsPanel
            className={`documents-table-panel${selectable ? ' market-applications-list documents-compliance-list' : ''}`}
            icon="chart-column"
            title="Report results"
            description={`${state.data.context} · Generated ${new Date(state.data.generatedAt).toLocaleString()}`}
            actions={
              <>
                <Button
                  variant="secondary"
                  aria-expanded={filtersOpen}
                  aria-controls={filtersOpen ? `${id}-filters` : undefined}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <FarmstandIcon name="sliders-horizontal" />
                  {`Filters${activeFilters ? ` (${activeFilters})` : ''}`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setManageExceptions(true)}
                >
                  Review manager exceptions
                </Button>
                <Tooltip label="Download">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void download()}
                    iconOnly
                    aria-label="Download"
                  >
                    <FarmstandIcon name="download" />
                  </Button>
                </Tooltip>
              </>
            }
          >
            {state.data.dates.historical && (
              <Alert severity="neutral">
                Historical approval state cannot be reconstructed. These results
                do not certify past readiness.
              </Alert>
            )}
            {state.data.acknowledgments && (
              <p className="documents-note">
                {state.data.acknowledgments.assigned} assigned ·{' '}
                {state.data.acknowledgments.acknowledged} acknowledged ·{' '}
                {state.data.acknowledgments.outstanding} outstanding, across all
                matching acknowledgment requests.
              </p>
            )}
            <p className="documents-note">
              Exports include all matching authorized rows, up to{' '}
              {state.data.exportLimit.toLocaleString()}. Larger results require
              narrower filters.
            </p>
            {!state.data.items.length ? (
              <EmptyState title="No matching compliance records">
                Change the filters or assign requirements through the existing
                workspace.
              </EmptyState>
            ) : selectable ? (
              <DataTable
                label="Compliance report"
                headings={
                  expiration
                    ? [
                        'Vendor',
                        'Requirement',
                        'Documentation',
                        'Expiration date',
                      ]
                    : ['Vendor', 'Documentation']
                }
              >
                {state.data.items.map((row, index) => {
                  const key = rowKey(row, index),
                    isSelected = key === selected;
                  return (
                    <tr
                      key={key}
                      tabIndex={0}
                      aria-selected={isSelected}
                      className={
                        isSelected ? 'market-application-selected' : undefined
                      }
                      onClick={() => setSelected(key)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          setSelected(key);
                        }
                      }}
                    >
                      <th scope="row">{String(row.vendor)}</th>
                      {expiration && (
                        <td>{String(row.title ?? 'Requirement')}</td>
                      )}
                      <td>
                        <DocumentStatus
                          value={String(row.status ?? 'Unknown')}
                        />
                      </td>
                      {expiration && (
                        <td>
                          {documentDate(String(row.expires_on ?? '')) ||
                            'Not available'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </DataTable>
            ) : (
              <DataTable
                label="Compliance report"
                recordDetails={{
                  status: state.data.columns.includes('status')
                    ? state.data.columns.indexOf('status')
                    : undefined,
                  labels: state.data.items.map((row) =>
                    String(
                      row.vendor
                        ? row.vendor + (row.title ? ' · ' + row.title : '')
                        : (row.title ?? 'Requirement'),
                    ),
                  ),
                }}
                wide
                headings={[
                  ...state.data.columns.map((c) => labels[c] ?? c),
                  'Details',
                ]}
              >
                {state.data.items.map((row, index) => (
                  <tr key={`${row.vendor_id ?? row.requirement_id}:${index}`}>
                    {state.data!.columns.map((column) => (
                      <td key={column}>
                        {column === 'status' ? (
                          <DocumentStatus
                            value={String(row[column] ?? 'Unknown')}
                          />
                        ) : typeof row[column] === 'boolean' ? (
                          row[column] ? (
                            'Yes'
                          ) : (
                            'No'
                          )
                        ) : (
                          String(row[column] ?? 'Not available')
                        )}
                      </td>
                    ))}
                    <td>
                      {row.vendor_id && (
                        <FarmstandLink
                          href={`/market/documents?view=requests&vendor=${row.vendor_id}`}
                        >
                          Open Vendor compliance
                        </FarmstandLink>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
            <Pagination
              summary={`${state.data.total} matching rows; showing ${skip + 1} to ${skip + state.data.items.length}`}
              hasPrevious={skip > 0}
              hasNext={skip + 20 < state.data.total}
              onPrevious={() => {
                setSelected(undefined);
                setSkip((n) => Math.max(0, n - 20));
              }}
              onNext={() => {
                setSelected(undefined);
                setSkip((n) => n + 20);
              }}
            />
          </SettingsPanel>
          <DetailSheet
            title={expiration ? 'Document details' : 'Vendor details'}
            open={!!current}
            onClose={() => setSelected(undefined)}
          >
            {current && (
              <FarmstandPanel
                as="section"
                className="markets-next market-application-details documents-vendor-details documents-report-details"
                aria-label={
                  expiration
                    ? 'Document expiration details'
                    : 'Vendor readiness details'
                }
              >
                <h2>
                  <FarmstandIcon name="shield-check" />
                  {expiration ? 'Document details' : 'Vendor details'}
                </h2>
                <div className="markets-next-content" key={selected}>
                  <div className="documents-vendor-title">
                    <h3>{String(current.vendor)}</h3>
                    <DocumentStatus
                      value={String(current.status ?? 'Unknown')}
                    />
                    <IconButton
                      icon="close"
                      label={
                        expiration
                          ? 'Close document details'
                          : 'Close vendor details'
                      }
                      variant="secondary"
                      onClick={() => setSelected(undefined)}
                    />
                  </div>
                  {expiration ? (
                    <DocumentFacts
                      items={state.data.columns
                        .filter((key) => !['vendor', 'status'].includes(key))
                        .map((key) => [
                          labels[key] ?? key,
                          typeof current[key] === 'boolean'
                            ? current[key]
                              ? 'Yes'
                              : 'No'
                            : String(current[key] ?? 'Not available'),
                        ])}
                    />
                  ) : (
                    <>
                      {!!current.participation && (
                        <p className="documents-note">
                          {String(current.participation)}
                        </p>
                      )}
                      <p className="documents-report-reason">
                        {String(current.reasons ?? 'Unable to determine')}
                      </p>
                      {Number(current.exceptions) > 0 && (
                        <p className="documents-note">
                          <DocumentStatus value="Manager exception" />{' '}
                          {current.status === 'Ready'
                            ? 'Cleared by a manager exception for this period.'
                            : 'Includes a manager exception.'}
                        </p>
                      )}
                      {Number(current.waivers) > 0 && (
                        <p className="documents-note">
                          <DocumentStatus value="Waived" /> Includes a manager
                          waiver.
                        </p>
                      )}
                      <dl className="market-application-facts">
                        {(
                          [
                            'required',
                            'approved',
                            'missing',
                            'pending',
                            'rejected',
                            'expired',
                            'expiring_soon',
                            'outstanding_acknowledgments',
                            'exceptions',
                            'waivers',
                          ] as const
                        ).map((key) => (
                          <div key={key}>
                            <dt>{labels[key]}</dt>
                            <dd>{String(current[key] ?? 'Unavailable')}</dd>
                          </div>
                        ))}
                      </dl>
                      <section
                        className="documents-vendor-section"
                        aria-label="Documents pending review"
                      >
                        <h4>Documents pending review</h4>
                        {pending.length ? (
                          <div className="documents-grid">
                            {pending.map((request) => requestCard(request))}
                          </div>
                        ) : (
                          <p className="documents-note">
                            No documents from this vendor are waiting for
                            review.
                          </p>
                        )}
                      </section>
                    </>
                  )}
                  <div className="documents-actions">
                    {currentRequest?.submission && onPreview && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          onPreview(
                            currentRequest.submission!.file_id,
                            currentRequest.title,
                          )
                        }
                      >
                        Preview document
                      </Button>
                    )}
                    {expiration && canWrite && (
                      <Button
                        variant="secondary"
                        disabled={
                          busy ||
                          !currentRequest?.submission ||
                          currentRequest.expiration !== 'Expiring Soon'
                        }
                        onClick={() => void notifyExpiration()}
                      >
                        Send expiration notification
                      </Button>
                    )}
                    <FarmstandLink
                      href={`/market/documents?view=requests&vendor=${current.vendor_id}`}
                    >
                      Open Vendor compliance
                    </FarmstandLink>
                    {canWrite && summary && (
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => setException(Number(current.vendor_id))}
                      >
                        Record date exception
                      </Button>
                    )}
                  </div>
                  {expiration &&
                    notificationResult?.key === selected &&
                    notificationResult && (
                      <Alert severity="success" role="status">
                        {notificationResult.message}
                      </Alert>
                    )}
                </div>
              </FarmstandPanel>
            )}
          </DetailSheet>
        </div>
      )}
      {exception && (
        <ExceptionDialog
          api={api}
          data={data}
          vendorId={exception}
          filters={{
            ...filters,
            startsOn: state.data?.dates.start,
            endsOn: state.data?.dates.end,
          }}
          onClose={() => setException(undefined)}
          onSaved={() => {
            setException(undefined);
            state.refresh();
          }}
        />
      )}
      {manageExceptions && (
        <ExceptionHistory
          api={api}
          canWrite={canWrite}
          onClose={() => setManageExceptions(false)}
          onChanged={state.refresh}
        />
      )}
    </div>
  );
}

function ExceptionDialog({
  api,
  data,
  vendorId,
  filters,
  onClose,
  onSaved,
}: {
  api: DocumentsApi;
  data: ComplianceData;
  vendorId: number;
  filters: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <Dialog
      open
      title="Record a scoped manager exception"
      onClose={onClose}
      busy={busy}
      actions={
        <Button form={id} type="submit" loading={busy}>
          Grant exception
        </Button>
      }
    >
      <p className="documents-note">
        This decision satisfies only the selected document requirement for the
        specified dates. It does not approve a document or change participation.
        Use the existing waiver action for an ongoing waiver.
      </p>
      {!!error && <DocumentFeedback error={error} />}
      <form
        id={id}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          void api
            .command(
              'GRANT_EXCEPTION',
              {
                reason: form.get('reason'),
                startsOn: form.get('startsOn'),
                endsOn: form.get('endsOn'),
                occurrenceId: filters.occurrenceId
                  ? Number(filters.occurrenceId)
                  : undefined,
              },
              String(form.get('assignmentId')),
            )
            .then(onSaved)
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <SelectField
            id={`${id}-assignment`}
            name="assignmentId"
            label="Document requirement"
            required
          >
            {data.requests
              .filter((r) => r.vendor_id === vendorId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.status})
                </option>
              ))}
          </SelectField>
          <Field id={`${id}-start`} label="Exception start date">
            <Input
              id={`${id}-start`}
              name="startsOn"
              type="date"
              defaultValue={String(filters.startsOn ?? '')}
              required
            />
          </Field>
          <Field id={`${id}-end`} label="Exception end date">
            <Input
              id={`${id}-end`}
              name="endsOn"
              type="date"
              defaultValue={String(filters.endsOn ?? '')}
              required
            />
          </Field>
          <Field id={`${id}-reason`} label="Manager reason">
            <Input
              id={`${id}-reason`}
              name="reason"
              required
              maxLength={2000}
            />
          </Field>
        </fieldset>
      </form>
    </Dialog>
  );
}
function ExceptionHistory({
  api,
  canWrite,
  onClose,
  onChanged,
}: {
  api: DocumentsApi;
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [skip, setSkip] = useState(0),
    [revoke, setRevoke] = useState<string>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    id = useId();
  const read = useCallback(
    () => api.advanced<ComplianceExceptions>({ view: 'exceptions', skip }),
    [api, skip],
  );
  const state = useRead(`exceptions:${skip}`, read);
  return (
    <Dialog
      open
      title="Manager exception history"
      onClose={onClose}
      busy={busy}
    >
      <ReadState {...state} retry={state.refresh} />
      {!!error && <DocumentFeedback error={error} />}
      {state.data && (
        <div className="documents-dialog-body">
          {!state.data.items.length && skip === 0 ? (
            <EmptyState title="No manager exceptions">
              Recorded date exceptions will appear here.
            </EmptyState>
          ) : (
            <>
              <DataTable
                label="Manager exceptions"
                recordDetails={{}}
                headings={[
                  'Vendor and requirement',
                  'Dates',
                  'Manager decision',
                  'Action',
                ]}
              >
                {state.data.items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.vendor_name} · {e.title}
                    </td>
                    <td>
                      {e.starts_on} through {e.ends_on}
                    </td>
                    <td>
                      {e.reason}
                      <p>
                        Manager {e.actor_id} ·{' '}
                        {new Date(e.created_at).toLocaleString()}
                      </p>
                      {e.revoked_at && <p>Revoked: {e.revocation_reason}</p>}
                    </td>
                    <td>
                      {!e.revoked_at && (
                        <Button
                          variant="destructive-outline"
                          size="compact"
                          disabled={!canWrite || busy}
                          onClick={() => setRevoke(e.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
              <Pagination
                summary={`Exception page ${skip / 20 + 1}`}
                hasPrevious={skip > 0}
                hasNext={state.data.hasMore}
                onPrevious={() => setSkip((n) => Math.max(0, n - 20))}
                onNext={() => setSkip((n) => n + 20)}
              />
            </>
          )}
        </div>
      )}
      {revoke && (
        <Dialog
          open
          title="Revoke manager exception"
          onClose={() => setRevoke(undefined)}
          busy={busy}
        >
          <form
            className="documents-dialog-body"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setBusy(true);
              void api
                .command(
                  'REVOKE_EXCEPTION',
                  { reason: form.get('reason') },
                  revoke,
                )
                .then(() => {
                  setRevoke(undefined);
                  state.refresh();
                  onChanged();
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            <Field id={id} label="Revocation reason">
              <Input id={id} name="reason" required maxLength={2000} />
            </Field>
            <div className="documents-form-actions">
              <Button type="submit" variant="destructive" loading={busy}>
                Confirm revocation
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Dialog>
  );
}

export function UpcomingReadiness({
  load,
}: {
  load: () => Promise<UpcomingCompliance>;
}) {
  const state = useRead('upcoming-compliance', load);
  return (
    <Card as="section" aria-label="Upcoming Market documentation readiness">
      <p>
        Upcoming Market documentation forecasts. Participation is confirmed only
        where the Market has a corresponding record.
      </p>
      <ReadState {...state} retry={state.refresh} />
      {state.data && (
        <>
          {!state.data.items.length ? (
            <EmptyState title="No upcoming Market dates">
              Open Market requests to review current documentation.
            </EmptyState>
          ) : (
            <OverviewTable
              label="Upcoming Market readiness"
              recordDetails={{
                status: 2,
                statuses: state.data.items
                  .slice(0, 5)
                  .map((e) => (
                    <DocumentStatus
                      value={String(e.forecast?.status ?? 'Unknown')}
                    />
                  )),
              }}
              headings={[
                'Market and dates',
                'Participation',
                'Documentation',
                'Action',
              ]}
            >
              {state.data.items.slice(0, 5).map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.market_name}
                    <p>
                      {e.starts_on}
                      {e.ends_on !== e.starts_on ? ` through ${e.ends_on}` : ''}
                    </p>
                  </td>
                  <td>
                    {String(
                      e.forecast?.participation ?? 'Participation unconfirmed',
                    )}
                  </td>
                  <td>
                    <DocumentStatus
                      value={String(e.forecast?.status ?? 'Unknown')}
                    />
                    <p>
                      {String(
                        e.forecast?.reasons ??
                          'Readiness has not been evaluated.',
                      )}
                    </p>
                    {Number(e.forecast?.exceptions) +
                      Number(e.forecast?.waivers ?? 0) >
                      0 && <p>Includes a manager exception or waiver.</p>}
                  </td>
                  <td>
                    <RouteLink
                      to={`/vendor/documents?view=requests&market=${e.market_id}`}
                    >
                      Fulfill Market requests
                    </RouteLink>
                    {Number(e.forecast?.outstanding_acknowledgments) > 0 && (
                      <p>
                        <RouteLink to="/vendor/documents?view=agreements">
                          Read Market agreements
                        </RouteLink>
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </OverviewTable>
          )}
          {(state.data.hasMore || state.data.items.length > 5) && (
            <p>
              Showing the next five dates. Open Documents to review all Market
              requests.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
