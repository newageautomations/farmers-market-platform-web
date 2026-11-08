import { useId, useMemo, useState, type MouseEvent } from 'react';
import type {
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { Dialog, EmptyState, Field } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { WorkspaceFrame } from '../../WorkspaceFrame';
import { MarketsSummary } from '../../vendor/MarketsSummary';
import { MarketsPagination as Pagination } from '../../vendor/MarketsPagination';
import { go } from '../../vendor/common';
import { ApplicationSubmissionDetail } from './ApplicationSubmissionDetail';
import { ApplicationSubmissions } from './ApplicationSubmissions';
import { ApplicationBuilder } from './ApplicationBuilder';
import {
  applicationRows,
  plural,
  shortDate,
  windowSummary,
  type ApplicationRow,
} from './applications-data';
import { ApplicationStateBadge, sharingLabel } from './application-status';
import '@market/ui/farmstand.css';
import '../../vendor/markets-workspace.css';
import '../../vendor/market-applications.css';
import './applications.css';

const PAGE_SIZE = 10;

function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(href);
}

/**
 * Market applications. The list mirrors the vendor Applications view
 * (summary, filtered table, selected-application panel); `/new` and `/:id`
 * open the builder. Both list views share the heading, menu and summary.
 */
export function Applications({
  api,
  data,
  run,
  canManage,
  canConfirmDates = false,
  canBilling = false,
  canRequestDocuments = false,
  view = 'templates',
  path = '/market/applications',
}: {
  api?: MarketOperationsApi;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates?: boolean;
  canBilling?: boolean;
  canRequestDocuments?: boolean;
  view?: 'templates' | 'submissions';
  path?: string;
}) {
  const target = path.split('/')[3];
  const submissionId =
    view === 'submissions'
      ? Number(
          target ||
            new URLSearchParams(window.location.search).get('submission'),
        )
      : 0;
  if (view === 'submissions' && submissionId > 0)
    return api ? (
      <ApplicationSubmissionDetail
        key={submissionId}
        api={api}
        id={submissionId}
        run={run}
        canManage={canManage}
        canConfirmDates={canConfirmDates}
        canBilling={canBilling}
        canRequestDocuments={canRequestDocuments}
      />
    ) : (
      <p>Application review connection is unavailable.</p>
    );

  if (view === 'templates' && (target === 'new' || Number(target) > 0))
    return (
      <ApplicationBuilder
        key={target}
        templateId={target === 'new' ? undefined : Number(target)}
        data={data}
        run={run}
        persist={api ? (command) => api.command(command) : run}
        canManage={canManage}
      />
    );
  const rows = applicationRows(data);
  const awaiting = rows.reduce((sum, row) => sum + row.activity.awaiting, 0);
  const accepting = rows.filter(
    (row) =>
      row.state === 'PUBLISHED' &&
      windowSummary(row.published?.definition, data.timeZone).open,
  ).length;

  const create = canManage && (
    <FarmstandLink
      href="/market/applications/new"
      variant="primary"
      onClick={(event) => inApp(event, '/market/applications/new')}
    >
      <FarmstandIcon name="plus" />
      Create application
    </FarmstandLink>
  );
  return (
    <WorkspaceFrame
      icon="file-text"
      title="Applications"
      description="Build the forms vendors fill in to join your market, then publish and share them."
      tabs={[
        {
          value: 'templates',
          label: 'Applications',
          href: '/market/applications',
          icon: 'file-text',
        },
        {
          value: 'submissions',
          label: 'Submitted Applications',
          href: '/market/application-submissions',
          icon: 'inbox',
        },
      ]}
      value={view}
      onChange={(next) =>
        go(
          next === 'templates'
            ? '/market/applications'
            : '/market/application-submissions',
        )
      }
      className="market-applications-workspace farmstand-controls"
      actions={create || undefined}
    >
      <MarketsSummary
        items={[
          {
            label: 'Accepting submissions',
            tone: accepting ? 'success' : undefined,
            value: accepting,
            hint: 'Published and inside their submission window',
            icon: 'circle-check',
          },
          {
            label: 'Drafts',
            value: rows.filter((row) => row.state === 'DRAFT').length,
            hint: 'Not published yet',
            icon: 'file-text',
          },
          {
            label: 'Awaiting review',
            tone: awaiting ? 'warning' : undefined,
            value: awaiting,
            hint: awaiting
              ? 'Submitted applications to review'
              : 'Nothing waiting for review',
            icon: 'inbox',
          },
        ]}
      />
      {view === 'submissions' ? (
        api ? (
          <ApplicationSubmissions
            key={data.marketId}
            api={api}
            data={data}
            run={run}
            canManage={canManage}
            canConfirmDates={canConfirmDates}
            canBilling={canBilling}
            canRequestDocuments={canRequestDocuments}
          />
        ) : (
          <p>Application review connection is unavailable.</p>
        )
      ) : (
        <ApplicationList data={data} run={run} canManage={canManage} />
      )}
    </WorkspaceFrame>
  );
}

const filters: Array<{ value: string; label: string }> = [
  { value: 'active', label: 'All active' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function ApplicationList({
  data,
  run,
  canManage,
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const id = useId();
  const rows = useMemo(() => applicationRows(data), [data]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [sort, setSort] = useState('edited');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | undefined>(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get('application'),
    );
    return value > 0 ? value : undefined;
  });
  const [confirm, setConfirm] = useState<ApplicationRow>();
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return rows
      .filter(
        (row) =>
          (status === 'active'
            ? row.state !== 'ARCHIVED'
            : row.state === status) &&
          row.template.name.toLocaleLowerCase().includes(term),
      )
      .sort((a, b) =>
        sort === 'name'
          ? a.template.name.localeCompare(b.template.name)
          : (Date.parse(b.updatedAt ?? '') || 0) -
              (Date.parse(a.updatedAt ?? '') || 0) ||
            b.template.id - a.template.id,
      );
  }, [rows, search, status, sort]);
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current =
    shown.find((row) => row.template.id === selected) ??
    // A just-archived or deep-linked application stays selected even when
    // the filter hides it, so its Restore action stays in reach.
    rows.find((row) => row.template.id === selected) ??
    shown[0];
  const archived = rows.filter((row) => row.state === 'ARCHIVED').length;

  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }
  async function archive(row: ApplicationRow, restore = false) {
    setBusy(true);
    try {
      const result = await run({
        action: restore ? 'UNARCHIVE_APPLICATION' : 'ARCHIVE_APPLICATION',
        id: row.template.id,
        expectedRevision: row.template.revision,
        data: {},
      });
      if (result) {
        setSelected(row.template.id);
        setConfirm(undefined);
      }
    } finally {
      setBusy(false);
    }
  }

  const create = canManage && (
    <FarmstandLink
      href="/market/applications/new"
      variant="primary"
      onClick={(event) => inApp(event, '/market/applications/new')}
    >
      <FarmstandIcon name="plus" />
      Create application
    </FarmstandLink>
  );
  return (
    <>
      <div className="markets-columns market-applications-columns">
        <div className="market-applications-main">
          <FarmstandPanel
            as="section"
            className="markets-list market-applications-list application-templates-list"
            aria-label="Your applications"
          >
            <h2>Your applications</h2>
            <div className="markets-filters">
              <Field
                id={`${id}-search`}
                label={<span className="sr-only">Search applications</span>}
              >
                <FarmstandSearch
                  id={`${id}-search`}
                  placeholder="Search applications..."
                  value={search}
                  onChange={(e) =>
                    changeFilter(() => setSearch(e.target.value))
                  }
                />
              </Field>
              <Field
                id={`${id}-status`}
                label={<span className="sr-only">Application status</span>}
              >
                <FarmstandSelect
                  id={`${id}-status`}
                  value={status}
                  onChange={(e) =>
                    changeFilter(() => setStatus(e.target.value))
                  }
                >
                  {filters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.value === 'ARCHIVED' && archived
                        ? `${filter.label} (${archived})`
                        : filter.label}
                    </option>
                  ))}
                </FarmstandSelect>
              </Field>
              <Field
                id={`${id}-sort`}
                label={<span className="sr-only">Sort applications</span>}
              >
                <FarmstandSelect
                  id={`${id}-sort`}
                  value={sort}
                  onChange={(e) => changeFilter(() => setSort(e.target.value))}
                >
                  <option value="edited">Last edited</option>
                  <option value="name">Name: A to Z</option>
                </FarmstandSelect>
              </Field>
            </div>
            {shown.length ? (
              <>
                <FarmstandTable
                  label="Your applications"
                  wide
                  headings={[
                    'Application',
                    'Status',
                    'Submissions',
                    'Last edited',
                    '',
                  ]}
                >
                  {shown.map((row) => {
                    const href = `/market/applications/${row.template.id}`;
                    return (
                      <tr
                        key={row.template.id}
                        tabIndex={0}
                        className={
                          row.template.id === current?.template.id
                            ? 'market-application-selected'
                            : undefined
                        }
                        onClick={() => setSelected(row.template.id)}
                        onKeyDown={(event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            setSelected(row.template.id);
                          }
                        }}
                      >
                        <th scope="row">
                          <div className="markets-identity">
                            <span className="markets-identity-icon">
                              <FarmstandIcon name="file-text" />
                            </span>
                            <span>
                              <span className="market-application-name">
                                {row.template.name}
                              </span>
                              <small>{sharingLabel(row)}</small>
                            </span>
                          </div>
                        </th>
                        <td>
                          <div className="application-state-cell">
                            <ApplicationStateBadge state={row.state} />
                            {row.state === 'PUBLISHED' && row.draft && (
                              <small>Unpublished changes</small>
                            )}
                          </div>
                        </td>
                        <td>
                          {row.activity.total ? (
                            <span className="application-count-cell">
                              {row.activity.total}
                              {row.activity.awaiting > 0 && (
                                <small>{row.activity.awaiting} to review</small>
                              )}
                            </span>
                          ) : (
                            <span className="markets-muted">None yet</span>
                          )}
                        </td>
                        <td>
                          {shortDate(row.updatedAt) ?? (
                            <span className="markets-muted">Unknown</span>
                          )}
                        </td>
                        <td>
                          <FarmstandLink
                            href={href}
                            variant="secondary"
                            className="occurrence-manage"
                            aria-label={`${canManage && !['ARCHIVED', 'CLOSED'].includes(row.state) ? 'Edit' : 'View'} ${row.template.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              inApp(event, href);
                            }}
                          >
                            {canManage &&
                            !['ARCHIVED', 'CLOSED'].includes(row.state)
                              ? 'Edit'
                              : 'View'}
                            <FarmstandIcon name="chevron-right" />
                          </FarmstandLink>
                        </td>
                      </tr>
                    );
                  })}
                </FarmstandTable>
                <Pagination
                  label="Application pages"
                  summary={`${plural(visible.length, 'application')}. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, visible.length)}.`}
                  hasPrevious={page > 0}
                  hasNext={(page + 1) * PAGE_SIZE < visible.length}
                  onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                />
              </>
            ) : (
              <EmptyState
                title={
                  rows.length
                    ? status === 'ARCHIVED'
                      ? 'No archived applications'
                      : 'No matching applications'
                    : 'No applications yet'
                }
                action={rows.length ? undefined : create || undefined}
              >
                <p>
                  {rows.length
                    ? 'Try another search or status.'
                    : 'Create an application, choose the questions vendors answer, then publish it to start accepting vendors.'}
                </p>
              </EmptyState>
            )}
          </FarmstandPanel>
        </div>
        <ApplicationDetails
          row={current}
          timeZone={data.timeZone}
          canManage={canManage}
          busy={busy}
          onArchive={setConfirm}
          onRestore={(row) => archive(row, true)}
        />
      </div>
      <Dialog
        open={!!confirm}
        size="standard"
        title={`Archive ${confirm?.template.name ?? 'application'}?`}
        busy={busy}
        onClose={() => setConfirm(undefined)}
        actions={
          <>
            <FarmstandButton
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm(undefined)}
            >
              Cancel
            </FarmstandButton>
            <FarmstandButton
              variant="destructive"
              loading={busy}
              onClick={() => confirm && archive(confirm)}
            >
              Archive application
            </FarmstandButton>
          </>
        }
      >
        <p>
          Vendors can no longer open or submit it, and it moves to Archived.
          Submissions you already received stay available for review. You can
          restore it at any time.
        </p>
      </Dialog>
    </>
  );
}

function ApplicationDetails({
  row,
  timeZone,
  canManage,
  busy,
  onArchive,
  onRestore,
}: {
  row?: ApplicationRow;
  timeZone?: string;
  canManage: boolean;
  busy: boolean;
  onArchive: (row: ApplicationRow) => void;
  onRestore: (row: ApplicationRow) => void;
}) {
  const submissionWindow = row?.published
    ? windowSummary(row.published.definition, timeZone)
    : undefined;
  const definition = row?.current?.definition;
  const href = row && `/market/applications/${row.template.id}`;
  const editable =
    canManage && row && !['ARCHIVED', 'CLOSED'].includes(row.state);
  return (
    <FarmstandPanel
      as="section"
      className="markets-next market-application-details application-template-details"
      aria-label="Application details"
    >
      <h2>
        <FarmstandIcon name="file-text" />
        Application details
      </h2>
      {row && href ? (
        <div className="markets-next-content">
          <div className="occurrence-details-title">
            <h3>{row.template.name}</h3>
            <ApplicationStateBadge state={row.state} />
          </div>
          <dl className="market-application-facts">
            <div>
              <dt>Sharing</dt>
              <dd>{sharingLabel(row)}</dd>
            </div>
            <div>
              <dt>Submissions</dt>
              <dd>
                {row.state === 'ARCHIVED'
                  ? 'Closed while archived'
                  : row.state === 'CLOSED'
                    ? 'Closed'
                    : submissionWindow
                      ? `${submissionWindow.label} · ${submissionWindow.detail}`
                      : 'Opens once published'}
              </dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>
                {row.activity.total
                  ? `${plural(row.activity.total, 'application')}${row.activity.awaiting ? ` · ${row.activity.awaiting} to review` : ''}`
                  : 'None yet'}
              </dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>
                {definition
                  ? `${plural(definition.questions.length, 'question')} in ${plural(definition.sections.length, 'section')}`
                  : 'Not available'}
              </dd>
            </div>
            <div>
              <dt>Market dates</dt>
              <dd>
                {definition?.occurrenceIds.length
                  ? plural(definition.occurrenceIds.length, 'date')
                  : 'None offered'}
              </dd>
            </div>
            <div>
              <dt>Last edited</dt>
              <dd>{shortDate(row.updatedAt) ?? 'Unknown'}</dd>
            </div>
          </dl>
          <p className="market-application-guidance">
            {row.state === 'ARCHIVED'
              ? 'This application is archived. Restore it to edit it or accept vendors again.'
              : row.state === 'CLOSED'
                ? 'This application was closed and no longer accepts vendors.'
                : row.state === 'DRAFT'
                  ? 'Vendors cannot see this application yet. Finish the questions, then publish it.'
                  : row.draft
                    ? 'You have changes that are not published. Vendors still see the published version.'
                    : 'Vendors can apply with this application. Edits are saved as a draft until you publish them.'}
          </p>
          <div className="application-details-actions">
            <FarmstandLink
              href={href}
              variant="primary"
              onClick={(event) => inApp(event, href)}
            >
              {editable ? 'Edit application' : 'View application'}
              <FarmstandIcon name="chevron-right" />
            </FarmstandLink>
            {row.activity.total > 0 && (
              <FarmstandLink
                href="/market/application-submissions"
                variant="secondary"
                onClick={(event) =>
                  inApp(event, '/market/application-submissions')
                }
              >
                Review submissions
                <FarmstandIcon name="chevron-right" />
              </FarmstandLink>
            )}
            {canManage &&
              (row.state === 'ARCHIVED' ? (
                <FarmstandButton
                  variant="secondary"
                  loading={busy}
                  onClick={() => onRestore(row)}
                >
                  <FarmstandIcon name="archive" />
                  Restore application
                </FarmstandButton>
              ) : (
                <FarmstandButton
                  variant="destructive-outline"
                  disabled={busy}
                  onClick={() => onArchive(row)}
                >
                  <FarmstandIcon name="archive" />
                  Archive
                </FarmstandButton>
              ))}
          </div>
        </div>
      ) : (
        <EmptyState title="No application selected">
          <p>
            Select an application to see how it is shared and what to do next.
          </p>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}
