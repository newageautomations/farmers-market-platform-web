import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import type {
  PackingApi,
  PackingView,
  PreparationApi,
  PreparationCommand,
  PreparationScope,
  PreparationTemplate,
  PreparationView,
} from '@market/api';
import { safeError } from '@market/api';
import {
  Alert,
  Badge,
  Card,
  Checkbox,
  Dialog,
  Field,
  Input,
  Textarea,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandLink,
  FarmstandSearch,
  FarmstandTable,
} from '@market/ui/farmstand';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { FarmstandIcon, type FarmstandIconName } from '@market/ui/farmstand';
import { navigate } from '../DashboardWidgets';
import { DayChecklist } from './DayChecklist';
import { ReadState, useRead } from '../vendor/common';
import { CompactLabel } from '../market/mobile';
import './preparation.css';

// Feature composition over the approved Card: the application-detail panel's
// inset heading and edge-to-edge content do not fit this compact workspace.
function Panel({
  title,
  icon,
  className = '',
  children,
}: {
  title: string;
  icon: { farmstand: FarmstandIconName };
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      as="section"
      spacing="contained"
      aria-label={title}
      className={`preparation-card ${className}`}
    >
      <h2>
        <FarmstandIcon name={icon.farmstand} />
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function PreparationStatus({ value }: { value: string }) {
  const labels: Record<string, string> = {
    'Not Reported': 'Not shared yet',
    'Not Ready': 'Not ready',
    'Needs Reconfirmation': 'Review needed',
    'Not Applicable': 'Not needed',
    'Unknown (no invoice)': 'No invoice yet',
    'Incomplete (draft invoice)': 'Invoice not issued',
    Complete: 'Paid',
    Incomplete: 'Payment due',
    confirmed: 'Confirmed',
    planned: 'Tentative',
    scheduled: 'Scheduled',
    cancelled: 'Cancelled',
  };
  const tone = ['Ready', 'Complete', 'confirmed'].includes(value)
    ? 'success'
    : ['cancelled', 'Not Ready'].includes(value)
      ? 'danger'
      : [
            'Incomplete',
            'Incomplete (draft invoice)',
            'Needs Reconfirmation',
            'Not Reported',
            'planned',
            'Unassigned',
          ].includes(value)
        ? 'warning'
        : value === 'scheduled'
          ? 'info'
          : 'neutral';
  return <Badge tone={tone}>{labels[value] ?? value}</Badge>;
}

export function paymentStatus(
  invoices:
    | Array<{ status: string; totalMinor: number; paidMinor: number }>
    | null
    | undefined,
) {
  if (invoices == null) return 'Unavailable';
  if (!invoices.length) return 'Unknown (no invoice)';
  const current = invoices.filter(
    (i) =>
      !['VOID', 'VOIDED', 'CANCELLED', 'CANCELED', 'CANCEL_PENDING'].includes(
        i.status,
      ),
  );
  if (!current.length) return 'Not Applicable';
  if (current.some((i) => i.status === 'DRAFT'))
    return 'Incomplete (draft invoice)';
  return current.every((i) => i.paidMinor >= i.totalMinor)
    ? 'Complete'
    : 'Incomplete';
}
const time = (value: string, timeZone: string) =>
  new Date(value).toLocaleString(undefined, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
function ChecklistFrame({ children }: ComponentProps<typeof WorkspaceFrame>) {
  return <div className="preparation-page">{children}</div>;
}
export function PreparationPage({
  api,
  scope,
  occurrenceId,
  selector,
  packing,
  canManage,
  taskPhase,
}: {
  api?: PreparationApi;
  scope: PreparationScope;
  occurrenceId: number;
  back?: string;
  selector?: ReactNode;
  packing?: PackingApi;
  canManage: boolean;
  /** Embedded Market Day checklist. Unmarked Phase B tasks remain Setup tasks. */
  taskPhase?: 'Setup' | 'Closing';
}) {
  const [packingResult, setPackingResult] = useState<{
    value?: PackingView;
    failed?: boolean;
  }>({});
  const load = useCallback(async () => {
    if (!api) throw new Error('Preparation unavailable');
    // Packing reconciles existing source changes before readiness is compared.
    if (scope === 'VENDOR' && packing) {
      try {
        setPackingResult({ value: await packing.read(occurrenceId) });
      } catch {
        setPackingResult({ failed: true });
      }
    }
    return api.read(scope, occurrenceId);
  }, [api, scope, occurrenceId, packing]);
  const query = useRead(`preparation:${scope}:${occurrenceId}`, load, !!api);
  const [saved, setSaved] = useState<{
    base: PreparationView | undefined;
    value: PreparationView;
  }>();
  const data =
    saved?.base === query.data ? (saved?.value ?? query.data) : query.data;
  const [observedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<string>();
  const [template, setTemplate] = useState<PreparationTemplate | 'new'>();
  const [templateName, setTemplateName] = useState('');
  const [templateTitles, setTemplateTitles] = useState('');
  const [confirmReady, setConfirmReady] = useState(false);
  const [search, setSearch] = useState('');
  const [attention, setAttention] = useState(false);
  async function startReadinessConfirmation() {
    setBusy(true);
    setError('');
    try {
      const current = await load();
      setSaved({ base: query.data, value: current });
      setConfirmReady(true);
    } catch {
      setError(
        'Could not refresh preparation for confirmation. Try again after the connection is restored.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function run(command: PreparationCommand) {
    if (!api || !data || busy) return false;
    setBusy(true);
    setError('');
    try {
      const result = await api.command(scope, occurrenceId, data.revision, {
        ...command,
        sourceVersion: data.sourceVersion,
      });
      setSaved({ base: query.data, value: result });
      return true;
    } catch (e) {
      setError(
        safeError(e).kind === 'conflict'
          ? 'Preparation changed in another session. Review the refreshed checklist and try again.'
          : 'Could not save preparation. Your changes were not confirmed. Review the current checklist and try again.',
      );
      query.refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }
  const manager = scope === 'MANAGER';
  const editable = canManage && !!data?.editable;
  const rows = data?.vendors ?? [];
  const invoices = data?.assignments?.flatMap((a) => a.invoices);
  const packingView = packingResult.value;
  const tasks =
    data?.tasks.filter(
      (t) =>
        !taskPhase ||
        (taskPhase === 'Closing') === t.title.startsWith('[Closing] '),
    ) ?? [];
  const complete = tasks.filter((t) => t.completedAt).length;
  const outstanding = tasks.length - complete;
  const Frame = taskPhase ? ChecklistFrame : WorkspaceFrame;
  function openTemplate(value: PreparationTemplate | 'new') {
    setTemplate(value);
    setTemplateName(value === 'new' ? '' : value.name);
    setTemplateTitles(
      value === 'new'
        ? (data?.tasks.map((t) => t.title).join('\n') ?? '')
        : value.titles.join('\n'),
    );
  }
  return (
    <Frame
      icon="calendar-days"
      title="Market preparation"
      description="Your checklist and details for market day."
      tabs={[]}
      value="preparation"
      onChange={() => {}}
      className="preparation-page"
    >
      {selector}
      {!api && (
        <Alert severity="info">
          Preparation is unavailable in this environment.
        </Alert>
      )}
      <ReadState
        loading={query.loading && !data}
        error={query.error}
        retry={query.refresh}
      />
      {error && !confirmReady && !template && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      {data && (
        <div
          className={taskPhase ? 'preparation-embedded' : 'preparation-grid'}
        >
          {!taskPhase && (
            <Panel
              className="preparation-market"
              title={data.occurrence.marketName}
              icon={{ farmstand: 'store' }}
            >
              <p>
                {new Date(data.occurrence.startsAt).toLocaleDateString(
                  undefined,
                  {
                    timeZone: data.occurrence.timezone,
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  },
                )}
                {' · '}
                {new Date(data.occurrence.startsAt).toLocaleTimeString(
                  undefined,
                  {
                    timeZone: data.occurrence.timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                  },
                )}
                {' to '}
                {new Date(data.occurrence.endsAt).toLocaleTimeString(
                  undefined,
                  {
                    timeZone: data.occurrence.timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  },
                )}
              </p>
              <p>{data.occurrence.venue || 'Location unknown'}</p>
              <PreparationStatus value={data.occurrence.status} />
              {!data.editable && (
                <Alert severity="info">
                  This market date or your attendance was cancelled. Your saved
                  checklist is read-only.
                </Alert>
              )}
              {Date.parse(data.occurrence.endsAt) < observedAt && (
                <p>This market has ended. Your checklist is saved here.</p>
              )}
              <FarmstandButton
                variant="secondary"
                disabled={busy || query.loading}
                onClick={query.refresh}
              >
                Refresh
              </FarmstandButton>
            </Panel>
          )}
          {!taskPhase && !manager && (
            <Panel
              title="Your market details"
              icon={{ farmstand: 'calendar-days' }}
            >
              <dl className="preparation-facts">
                <div>
                  <dt>Participation</dt>
                  <dd>
                    <PreparationStatus
                      value={data.participation ?? 'Unknown'}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Booth assignment</dt>
                  <dd>
                    {data.privateMarket ? (
                      <PreparationStatus value="Not Applicable" />
                    ) : data.assignments == null ? (
                      'Unavailable'
                    ) : data.assignments.length ? (
                      data.assignments.map((a) => a.space.label).join(', ')
                    ) : (
                      <PreparationStatus value="Unassigned" />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Booth payment</dt>
                  <dd>
                    <PreparationStatus
                      value={
                        data.privateMarket
                          ? 'Not Applicable'
                          : paymentStatus(invoices)
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Equipment</dt>
                  <dd>
                    {data.privateMarket ? (
                      <PreparationStatus value="Not Applicable" />
                    ) : data.assignments == null ? (
                      'Unavailable'
                    ) : data.assignments.flatMap((a) => a.rentals).length ? (
                      data.assignments
                        .flatMap((a) => a.rentals)
                        .map((r, i) => (
                          <span key={i}>
                            {r.quantity} × {r.name}{' '}
                          </span>
                        ))
                    ) : (
                      'No equipment reserved'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Preorder packing</dt>
                  <dd>
                    {packingView
                      ? `${packingView.summary.packed} of ${packingView.summary.required} items packed`
                      : 'Unavailable'}
                  </dd>
                </div>
              </dl>
              <div className="ui-actions">
                <FarmstandLink
                  href={`/vendor/orders/packing?occurrence=${occurrenceId}`}
                  onClick={navigate}
                >
                  Open packing list
                </FarmstandLink>
                {!data.privateMarket && (
                  <FarmstandLink
                    href={`/vendor/booths?occurrence=${occurrenceId}`}
                    variant="secondary"
                    onClick={navigate}
                  >
                    View booth and invoices
                  </FarmstandLink>
                )}
              </div>
            </Panel>
          )}
          {!taskPhase && !manager && (
            <Panel title="Your readiness" icon={{ farmstand: 'circle-check' }}>
              <PreparationStatus value={data.readiness} />
              <p>
                {data.confirmedAt
                  ? `Last confirmed: ${time(data.confirmedAt, data.occurrence.timezone)}.`
                  : 'Let the market know when you are ready.'}
              </p>
              <p>
                Check your booth, payment and packing, then share your
                readiness. This does not check you in for market day.
              </p>
              {editable && (
                <div className="ui-actions">
                  <FarmstandButton
                    disabled={busy}
                    onClick={() => void startReadinessConfirmation()}
                  >
                    {data.readiness === 'Ready'
                      ? 'Confirm again'
                      : 'Mark ready'}
                  </FarmstandButton>
                  <FarmstandButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run({ action: 'DECLARE', ready: false })
                    }
                  >
                    Mark not ready
                  </FarmstandButton>
                </div>
              )}
            </Panel>
          )}
          {!taskPhase && manager && (
            <Panel
              className="preparation-vendors"
              title="Participating vendors"
              icon={{ farmstand: 'store' }}
            >
              <p>
                {rows.filter((r) => r.participation === 'confirmed').length}{' '}
                confirmed; {rows.filter((r) => r.readiness === 'Ready').length}{' '}
                ready;{' '}
                {
                  rows.filter((r) =>
                    ['Not Ready', 'Needs Reconfirmation'].includes(r.readiness),
                  ).length
                }{' '}
                need review;{' '}
                {rows.filter((r) => r.readiness === 'Not Reported').length} not
                shared yet.
              </p>
              <p>
                {rows.filter((r) => r.booths.length).length} vendors assigned
                booths; {rows.filter((r) => !r.booths.length).length}{' '}
                unassigned.{' '}
                {rows.every((r) => r.invoices !== null)
                  ? `${rows.filter((r) => paymentStatus(r.invoices).startsWith('Incomplete')).length} vendors with outstanding or draft invoices.`
                  : 'Payment summary unavailable.'}{' '}
                {rows.filter((r) => r.rentals.length).length} vendors with
                equipment reservations.
              </p>
              {data.operationsSummary && (
                <p>
                  {data.operationsSummary.assignedBooths} booths assigned;{' '}
                  {data.operationsSummary.unassignedBooths == null
                    ? 'Choose a layout to see available booths'
                    : `${data.operationsSummary.unassignedBooths} booths available`}
                  .{' '}
                  {data.operationsSummary.outstandingInvoices == null
                    ? 'Outstanding invoice count unavailable.'
                    : `${data.operationsSummary.outstandingInvoices} invoices need attention.`}
                </p>
              )}
              <div className="ui-control-row">
                <FarmstandSearch
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendors"
                  aria-label="Search vendors"
                />
                <label>
                  <Checkbox
                    checked={attention}
                    onChange={(e) => setAttention(e.target.checked)}
                  />{' '}
                  Needs attention only
                </label>
              </div>
              <FarmstandTable
                label="Vendor preparation readiness"
                headings={[
                  'Vendor',
                  'Participation',
                  'Readiness',
                  'Booth',
                  'Payment',
                  'Issues',
                ]}
              >
                {rows
                  .filter(
                    (r) =>
                      r.name.toLowerCase().includes(search.toLowerCase()) &&
                      (!attention ||
                        !['Ready', 'Not Applicable'].includes(r.readiness) ||
                        r.participation !== 'confirmed' ||
                        !r.booths.length ||
                        !['Complete', 'Not Applicable'].includes(
                          paymentStatus(r.invoices),
                        )),
                  )
                  .map((r) => (
                    <tr key={r.vendorId ?? `external:${r.directoryId}`}>
                      <td>{r.name}</td>
                      <td>
                        <PreparationStatus value={r.participation} />
                      </td>
                      <td>
                        <PreparationStatus value={r.readiness} />
                        {r.confirmedAt && (
                          <p>{time(r.confirmedAt, data.occurrence.timezone)}</p>
                        )}
                      </td>
                      <td>
                        {r.booths.join(', ') || (
                          <PreparationStatus value="Unassigned" />
                        )}
                      </td>
                      <td>
                        <PreparationStatus value={paymentStatus(r.invoices)} />
                      </td>
                      <td>
                        {[
                          r.participation !== 'confirmed'
                            ? 'Participation not confirmed'
                            : '',
                          !r.booths.length ? 'Booth unassigned' : '',
                          !['Complete', 'Not Applicable'].includes(
                            paymentStatus(r.invoices),
                          )
                            ? paymentStatus(r.invoices) === 'Incomplete'
                              ? 'Booth payment due'
                              : paymentStatus(r.invoices) ===
                                  'Incomplete (draft invoice)'
                                ? 'Invoice not issued'
                                : 'Check booth payment'
                            : '',
                          !['Ready', 'Not Applicable'].includes(r.readiness)
                            ? 'Readiness needs attention'
                            : '',
                        ]
                          .filter(Boolean)
                          .join('; ') || 'None reported'}
                      </td>
                    </tr>
                  ))}
              </FarmstandTable>
              {!rows.length && (
                <p>No participating vendors found for this date.</p>
              )}
              <p>
                Readiness is shared by each vendor. Check-in is recorded
                separately.
              </p>
              <div className="ui-actions">
                <FarmstandLink
                  href={`/market/assignments/${occurrenceId}`}
                  onClick={navigate}
                >
                  Manage assignments and rentals
                </FarmstandLink>
                <FarmstandLink
                  href={`/market/finances/invoices?occurrence=${occurrenceId}`}
                  onClick={navigate}
                  variant="secondary"
                >
                  View invoices
                </FarmstandLink>
              </div>
            </Panel>
          )}
          {taskPhase ? (
            <DayChecklist
              phase={taskPhase}
              tasks={tasks}
              complete={complete}
              timezone={data.occurrence.timezone}
              disabled={busy || !editable}
              editing={editing}
              title={title}
              setTitle={setTitle}
              onEdit={(task) => {
                setEditing(task?.id);
                setTitle(task?.title.replace(/^\[Closing\] /, '') ?? '');
              }}
              run={run}
              allTasks={data.tasks}
            />
          ) : (
            <Panel
              className="preparation-checklist"
              title={
                manager
                  ? 'Market preparation checklist'
                  : 'Your preparation checklist'
              }
              icon={{ farmstand: 'circle-check' }}
            >
              <p>
                {tasks.length
                  ? `${complete} / ${tasks.length} tasks complete`
                  : 'Add your first task or use a saved template.'}
              </p>
              <fieldset disabled={busy || !editable}>
                <legend className="sr-only">Preparation tasks</legend>
                <ul className="preparation-tasks">
                  {tasks.map((task, position) => {
                    const index = data.tasks.indexOf(task);
                    return (
                      <li key={task.id}>
                        <label>
                          <Checkbox
                            checked={!!task.completedAt}
                            onChange={(e) =>
                              void run({
                                action: 'COMPLETE',
                                taskId: task.id,
                                complete: e.target.checked,
                              })
                            }
                          />{' '}
                          {task.title}
                        </label>
                        {task.completedAt && (
                          <small>
                            Completed{' '}
                            {time(task.completedAt, data.occurrence.timezone)}
                          </small>
                        )}
                        <div className="ui-actions">
                          <FarmstandButton
                            variant="secondary"
                            onClick={() => {
                              setEditing(task.id);
                              setTitle(task.title);
                            }}
                          >
                            <CompactLabel icon="edit">Edit</CompactLabel>
                          </FarmstandButton>
                          <FarmstandButton
                            variant="secondary"
                            disabled={!position}
                            aria-label={`Move ${task.title} up`}
                            onClick={() => {
                              const ids = data.tasks.map((t) => t.id);
                              const previous = data.tasks.indexOf(
                                tasks[position - 1]!,
                              );
                              [ids[previous], ids[index]] = [
                                ids[index]!,
                                ids[previous]!,
                              ];
                              void run({ action: 'REORDER', taskIds: ids });
                            }}
                          >
                            <CompactLabel icon="arrow-up">Move up</CompactLabel>
                          </FarmstandButton>
                          <FarmstandButton
                            variant="secondary"
                            disabled={position === tasks.length - 1}
                            aria-label={`Move ${task.title} down`}
                            onClick={() => {
                              const ids = data.tasks.map((t) => t.id);
                              const next = data.tasks.indexOf(
                                tasks[position + 1]!,
                              );
                              [ids[index], ids[next]] = [
                                ids[next]!,
                                ids[index]!,
                              ];
                              void run({ action: 'REORDER', taskIds: ids });
                            }}
                          >
                            <CompactLabel icon="arrow-down">
                              Move down
                            </CompactLabel>
                          </FarmstandButton>
                          <FarmstandButton
                            variant="destructive-outline"
                            onClick={() =>
                              void run({ action: 'DELETE', taskId: task.id })
                            }
                          >
                            <CompactLabel icon="trash">Delete</CompactLabel>
                          </FarmstandButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run({
                      action: editing ? 'EDIT' : 'ADD',
                      taskId: editing,
                      title:
                        !editing &&
                        taskPhase === 'Closing' &&
                        !title.startsWith('[Closing] ')
                          ? `[Closing] ${title}`
                          : title,
                    }).then((ok) => {
                      if (ok) {
                        setTitle('');
                        setEditing(undefined);
                      }
                    });
                  }}
                >
                  <Field
                    id="preparation-task-title"
                    label={editing ? 'Edit task' : 'New task'}
                  >
                    <Input
                      id="preparation-task-title"
                      value={title}
                      maxLength={
                        !editing && taskPhase === 'Closing' ? 150 : 160
                      }
                      required
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </Field>
                  <div className="ui-actions">
                    <FarmstandButton type="submit">
                      {editing ? 'Save task' : 'Add task'}
                    </FarmstandButton>
                    {editing && (
                      <FarmstandButton
                        variant="secondary"
                        onClick={() => {
                          setEditing(undefined);
                          setTitle('');
                        }}
                      >
                        Cancel edit
                      </FarmstandButton>
                    )}
                  </div>
                </form>
              </fieldset>
              {!taskPhase && (
                <div className="preparation-templates">
                  <p>
                    Save a checklist to reuse at future markets, or add tasks
                    from a saved template.
                  </p>
                  {data.templates.map((t) => (
                    <div className="preparation-template" key={t.id}>
                      <p>
                        {t.name} ({t.titles.length} tasks)
                      </p>
                      <div className="ui-actions">
                        <FarmstandButton
                          disabled={
                            busy ||
                            !editable ||
                            data.appliedTemplates.includes(String(t.id))
                          }
                          onClick={() =>
                            void run({
                              action: 'APPLY_TEMPLATE',
                              templateId: t.id,
                              templateRevision: t.revision,
                            })
                          }
                        >
                          {data.appliedTemplates.includes(String(t.id))
                            ? 'Applied to this date'
                            : 'Apply to this date'}
                        </FarmstandButton>
                        <FarmstandButton
                          variant="secondary"
                          disabled={busy || !editable}
                          onClick={() => openTemplate(t)}
                        >
                          Edit template
                        </FarmstandButton>
                        <FarmstandButton
                          variant="destructive-outline"
                          disabled={busy || !editable}
                          onClick={() =>
                            void run({
                              action: 'DELETE_TEMPLATE',
                              templateId: t.id,
                              templateRevision: t.revision,
                            })
                          }
                        >
                          Delete template
                        </FarmstandButton>
                      </div>
                    </div>
                  ))}
                  {editable && (
                    <FarmstandButton
                      variant="secondary"
                      disabled={busy}
                      onClick={() => openTemplate('new')}
                    >
                      Create template
                    </FarmstandButton>
                  )}
                </div>
              )}
            </Panel>
          )}
          <Dialog
            open={confirmReady}
            title="Confirm your readiness"
            busy={busy}
            onClose={() => {
              if (!busy) setConfirmReady(false);
            }}
            actions={
              <FarmstandButton
                loading={busy}
                onClick={() =>
                  void run({ action: 'DECLARE', ready: true }).then((ok) => {
                    if (ok) setConfirmReady(false);
                  })
                }
              >
                I am ready
              </FarmstandButton>
            }
          >
            <p>
              {outstanding === 1
                ? '1 task left to complete.'
                : `${outstanding} tasks left to complete.`}
            </p>
            <p>
              Participation: {data.participation ?? 'Unknown'}. Booth:{' '}
              {data.privateMarket ? (
                <PreparationStatus value="Not Applicable" />
              ) : data.assignments?.length ? (
                'Assigned'
              ) : (
                'Incomplete or unavailable'
              )}
              . Payment:{' '}
              {data.privateMarket ? (
                <PreparationStatus value="Not Applicable" />
              ) : (
                paymentStatus(invoices)
              )}
              . Packing:{' '}
              {packingView
                ? `${packingView.summary.packed} / ${packingView.summary.required} units packed`
                : 'Unavailable'}
              .
            </p>
            <p>
              You can mark yourself ready with unfinished tasks. Your
              attendance, payments and check-in stay separate.
            </p>
            {error && confirmReady && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
          </Dialog>
          <Dialog
            open={!!template}
            title={
              template === 'new'
                ? 'Create checklist template'
                : 'Edit checklist template'
            }
            busy={busy}
            onClose={() => {
              if (!busy) setTemplate(undefined);
            }}
            actions={
              <FarmstandButton
                type="submit"
                form="preparation-template-form"
                loading={busy}
              >
                Save template
              </FarmstandButton>
            }
          >
            <form
              id="preparation-template-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run({
                  action: 'SAVE_TEMPLATE',
                  templateId:
                    template && template !== 'new' ? template.id : undefined,
                  templateRevision:
                    template && template !== 'new'
                      ? template.revision
                      : undefined,
                  name: templateName,
                  titles: templateTitles
                    .split('\n')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }).then((ok) => {
                  if (ok) setTemplate(undefined);
                });
              }}
            >
              <Field id="preparation-template-name" label="Template name">
                <Input
                  id="preparation-template-name"
                  required
                  maxLength={80}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </Field>
              <Field
                id="preparation-template-titles"
                label="Tasks (one per line)"
              >
                <Textarea
                  id="preparation-template-titles"
                  required
                  value={templateTitles}
                  onChange={(e) => setTemplateTitles(e.target.value)}
                />
              </Field>
              <p>
                Up to 100 tasks, 160 characters each. Existing checklists stay
                the same.
              </p>
              {error && template && (
                <Alert severity="error" role="alert">
                  {error}
                </Alert>
              )}
            </form>
          </Dialog>
        </div>
      )}
    </Frame>
  );
}
