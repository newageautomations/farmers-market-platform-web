import { useCallback, useId, useState, type FormEvent } from 'react';
import type {
  ComplianceData,
  ComplianceExceptions,
  ComplianceReport,
  DocumentsApi,
  UpcomingCompliance,
} from '@market/api';
import {
  Alert,
  Button,
  Card,
  DataTable,
  Dialog,
  Dropdown,
  EmptyState,
  Field,
  Input,
  Pagination,
  SelectField,
} from '@market/ui';
import { DocumentFeedback, DocumentStatus } from '@market/ui/documents';
import { ReadState, RouteLink, useRead } from '../vendor/common';

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
export function ComplianceReports({
  api,
  data,
  canWrite,
}: {
  api: DocumentsApi;
  data: ComplianceData;
  canWrite: boolean;
}) {
  const id = useId(),
    [filters, setFilters] = useState<Record<string, unknown>>(() => ({
      report: new URLSearchParams(window.location.search).has('occurrence')
        ? 'upcoming'
        : 'vendors',
      occurrenceId:
        new URLSearchParams(window.location.search).get('occurrence') ?? '',
    })),
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
  const read = useCallback(
    () => api.advanced<ComplianceReport>({ view: 'report', ...filters, skip }),
    [api, filters, skip],
  );
  const state = useRead(`report:${JSON.stringify(filters)}:${skip}`, read);
  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSkip(0);
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
    <>
      <p>
        Readiness is advisory. Application acceptance, participation and
        attendance are separate decisions. Event reports use current approvals
        and sharing authorization to forecast validity.
      </p>
      <form onSubmit={apply} className="ui-control-row">
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
          <Input id={`${id}-from`} name="startsOn" type="date" />
        </Field>
        <Field id={`${id}-to`} label="Preview end date">
          <Input id={`${id}-to`} name="endsOn" type="date" />
        </Field>
        <SelectField
          id={`${id}-vendor`}
          name="vendorId"
          label="Vendor"
          defaultValue=""
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
          label="Compliance status"
          defaultValue=""
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
          label="Document requirement"
          defaultValue=""
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
          label="Document category"
          defaultValue=""
        >
          <option value="">All categories</option>
          {data.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        <Field id={`${id}-expiry-from`} label="Expiration from">
          <Input id={`${id}-expiry-from`} name="expiresFrom" type="date" />
        </Field>
        <Field id={`${id}-expiry-to`} label="Expiration through">
          <Input id={`${id}-expiry-to`} name="expiresTo" type="date" />
        </Field>
        <div className="ui-field-action">
          <Button type="submit">Apply</Button>
        </div>
      </form>
      <ReadState {...events} retry={events.refresh} />
      {events.data?.hasMore && (
        <Alert severity="info">
          Showing the first 20 upcoming events. Use a date preview for later
          dates.
        </Alert>
      )}
      <ReadState {...state} retry={state.refresh} />
      {!!error && <DocumentFeedback error={error} />}
      {state.data && (
        <>
          <p>
            {state.data.context} · Generated{' '}
            {new Date(state.data.generatedAt).toLocaleString()}
          </p>
          {state.data.dates.historical && (
            <Alert severity="neutral">
              Historical approval state cannot be reconstructed. These results
              do not certify past readiness.
            </Alert>
          )}
          {state.data.counts && (
            <p>
              {state.data.counts.ready} ready · {state.data.counts.incomplete}{' '}
              incomplete · {state.data.counts.pending} pending review ·{' '}
              {state.data.counts.unknown} unknown, across all matching vendors.
            </p>
          )}
          {state.data.acknowledgments && (
            <p>
              {state.data.acknowledgments.assigned} assigned ·{' '}
              {state.data.acknowledgments.acknowledged} acknowledged ·{' '}
              {state.data.acknowledgments.outstanding} outstanding, across all
              matching acknowledgment requests.
            </p>
          )}
          <div className="ui-control-row">
            <Button disabled={busy} onClick={() => void download()}>
              Download
            </Button>
            <Button
              variant="secondary"
              onClick={() => setManageExceptions(true)}
            >
              Review manager exceptions
            </Button>
          </div>
          <p>
            Exports include all matching authorized rows, up to{' '}
            {state.data.exportLimit.toLocaleString()}. Larger results require
            narrower filters.
          </p>
          {!state.data.items.length ? (
            <EmptyState title="No matching compliance records">
              Change the filters or assign requirements through the existing
              workspace.
            </EmptyState>
          ) : summary ? (
            <DataTable
              label="Compliance report"
              recordDetails={{
                status: 1,
                labels: state.data.items.map((row) => String(row.vendor)),
                statuses: state.data.items.map((row) => (
                  <DocumentStatus value={String(row.status ?? 'Unknown')} />
                )),
              }}
              headings={['Vendor', 'Documentation', 'Reason']}
            >
              {state.data.items.map((row, index) => (
                <tr key={`${row.vendor_id}:${index}`}>
                  <td>
                    {row.vendor}
                    <p>{row.participation}</p>
                    <RouteLink
                      to={`/market/documents?view=requests&vendor=${row.vendor_id}`}
                    >
                      Open Vendor compliance
                    </RouteLink>
                    {canWrite && (
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => setException(Number(row.vendor_id))}
                      >
                        Record date exception
                      </Button>
                    )}
                  </td>
                  <td>
                    <DocumentStatus value={String(row.status ?? 'Unknown')} />
                    {Number(row.exceptions) > 0 && (
                      <p>
                        <DocumentStatus value="Manager exception" />{' '}
                        {row.status === 'Ready'
                          ? 'Cleared by a manager exception for this period.'
                          : 'Includes a manager exception.'}
                      </p>
                    )}
                    {Number(row.waivers) > 0 && (
                      <p>
                        <DocumentStatus value="Waived" /> Includes a manager
                        waiver.
                      </p>
                    )}
                    <Dropdown label="Document counts">
                      <p>
                        {row.required} required · {row.approved} approved
                        documents · {row.missing} missing
                      </p>
                      <p>
                        {row.pending} pending review · {row.rejected} rejected ·{' '}
                        {row.expired} expired · {row.expiring_soon} expiring
                        soon
                      </p>
                      <p>
                        {row.outstanding_acknowledgments} outstanding required
                        acknowledgments · {row.exceptions} manager exceptions ·{' '}
                        {row.waivers} waivers
                      </p>
                    </Dropdown>
                  </td>
                  <td>
                    {String(row.reasons ?? 'Unable to determine')}
                    {String(row.reasons ?? '').length > 240 && (
                      <p>
                        Additional issues are listed in Vendor compliance and
                        the CSV export.
                      </p>
                    )}
                  </td>
                </tr>
              ))}
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
                      <RouteLink
                        to={`/market/documents?view=requests&vendor=${row.vendor_id}`}
                      >
                        Open Vendor compliance
                      </RouteLink>
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
            onPrevious={() => setSkip((n) => Math.max(0, n - 20))}
            onNext={() => setSkip((n) => n + 20)}
          />
        </>
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
    </>
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
        <Button form={id} type="submit" disabled={busy}>
          Grant exception
        </Button>
      }
    >
      <p>
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
                      variant="destructive"
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
      {revoke && (
        <Dialog
          open
          title="Revoke manager exception"
          onClose={() => setRevoke(undefined)}
          busy={busy}
        >
          <form
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
            <Button type="submit" variant="destructive" disabled={busy}>
              Confirm revocation
            </Button>
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
            <DataTable
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
            </DataTable>
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
