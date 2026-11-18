import { useId, useRef, useState } from 'react';
import type { MarketOperationsData, OperationsCommand } from '@market/api';
import { Alert, Badge, EmptyState, Field } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { MarketsPagination } from '../../vendor/MarketsPagination';
import {
  AssignmentCard,
  approvalBlocker,
  BoothAssignmentDialog,
  occurrenceBooths,
} from './Assignments';
import { MarketDialog, StatusBadge } from '../presentation';
import { boothStatus } from './booth-status';
import { moneyLabel } from './common';
import '@market/ui/workspace-records.css';
const PAGE_SIZE = 8;
const statusBadge = {
  available: <Badge>Open</Badge>,
  assigned: <Badge tone="info">Assigned</Badge>,
  paid: <Badge tone="success">Paid</Badge>,
};
/**
 * The date's booths as a Farmstand table beside a wide side panel, replacing
 * the map's own booth list on the Assignments page. Choosing a row (or a
 * booth on the map) opens it in the panel, which renders the shared booth
 * assignment and Edit booth views inline instead of in a dialog.
 */
export function AssignmentBooths({
  data,
  occurrenceId,
  run,
  canAssign,
  canBill,
  commandError,
  selected,
  onSelect,
}: {
  data: MarketOperationsData;
  occurrenceId: number;
  run: (command: OperationsCommand) => Promise<unknown>;
  canAssign: boolean;
  canBill: boolean;
  commandError?: unknown;
  selected: string;
  onSelect: (elementId: string) => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [page, setPage] = useState(0);
  const { assignments, spaces } = occurrenceBooths(data, occurrenceId);
  const rows = spaces
    .map((space) => {
      const assignment = assignments.find((a) => a.spaceId === space.id);
      return {
        space,
        assignment,
        status: boothStatus(assignment, data.invoices),
      };
    })
    .sort((a, b) =>
      a.space.details.label.localeCompare(b.space.details.label, undefined, {
        numeric: true,
      }),
    );
  const term = search.trim().toLocaleLowerCase();
  const filtered = rows.filter(
    (row) =>
      (status === 'all' || row.status === status) &&
      `${row.space.details.label} ${row.assignment?.businessSnapshot.businessName ?? ''}`
        .toLocaleLowerCase()
        .includes(term),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const shown = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  // Like the other list pages, the panel shows the first booth until one is chosen.
  const current =
    rows.find((row) => row.space.elementId === selected) ?? filtered[0];
  function choose(elementId: string) {
    onSelect(elementId);
    // On narrow layouts the panel stacks below the table.
    if (
      panel.current &&
      panel.current.getBoundingClientRect().top > innerHeight
    )
      panel.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return (
    <div className="assignment-booths">
      <FarmstandPanel
        as="section"
        className="markets-list market-applications-list assignment-booth-list"
        aria-label="Booths"
      >
        <div className="markets-filters assignment-booth-filters">
          <Field
            id={`${id}-search`}
            label={<span className="sr-only">Search booths</span>}
          >
            <FarmstandSearch
              id={`${id}-search`}
              placeholder="Search booths or vendors..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Field>
          <Field
            id={`${id}-status`}
            label={<span className="sr-only">Booth status</span>}
          >
            <FarmstandSelect
              id={`${id}-status`}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All booths</option>
              <option value="available">Open</option>
              <option value="assigned">Assigned</option>
              <option value="paid">Paid</option>
            </FarmstandSelect>
          </Field>
        </div>
        {shown.length ? (
          <>
            <FarmstandTable
              label="Booths"
              headings={['Booth', 'Vendor', 'Status']}
            >
              {shown.map((row) => {
                const active = row.space.elementId === current?.space.elementId;
                return (
                  <tr
                    key={row.space.id}
                    tabIndex={0}
                    aria-selected={active}
                    className={
                      active ? 'market-application-selected' : undefined
                    }
                    onClick={() => choose(row.space.elementId)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        choose(row.space.elementId);
                      }
                    }}
                  >
                    <th scope="row">
                      <div className="markets-identity">
                        <span className="markets-identity-icon">
                          <FarmstandIcon name="store" />
                        </span>
                        <span>
                          <strong>{row.space.details.label}</strong>
                          <small>
                            {row.space.details.widthFeet} ×{' '}
                            {row.space.details.depthFeet} ft ·{' '}
                            {moneyLabel(
                              row.space.details.feeMinor,
                              row.space.details.currency,
                            )}
                          </small>
                        </span>
                      </div>
                    </th>
                    <td>
                      {row.assignment ? (
                        row.assignment.businessSnapshot.businessName
                      ) : (
                        <span className="markets-muted">Unassigned</span>
                      )}
                    </td>
                    <td>{statusBadge[row.status]}</td>
                  </tr>
                );
              })}
            </FarmstandTable>
            <MarketsPagination
              label="Booth pages"
              summary={`${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} booths`}
              hasPrevious={currentPage > 0}
              hasNext={(currentPage + 1) * PAGE_SIZE < filtered.length}
              onPrevious={() => setPage(currentPage - 1)}
              onNext={() => setPage(currentPage + 1)}
            />
          </>
        ) : (
          <EmptyState title={rows.length ? 'No matching booths' : 'No booths'}>
            <p>
              {rows.length
                ? 'Try a different search or booth status.'
                : 'This layout has no booths yet.'}
            </p>
          </EmptyState>
        )}
      </FarmstandPanel>
      <div ref={panel} className="assignment-booth-panel-wrap">
        <FarmstandPanel as="div" className="assignment-booth-panel">
          {current ? (
            <BoothAssignmentDialog
              key={current.space.elementId}
              presentation="panel"
              data={data}
              occurrenceId={occurrenceId}
              elementId={current.space.elementId}
              run={run}
              canAssign={canAssign}
              canDay={false}
              canBill={canBill}
              commandError={commandError}
              onClose={() => {}}
            />
          ) : (
            <EmptyState title="No booth selected">
              <p>Select a booth on the map or in the table.</p>
            </EmptyState>
          )}
        </FarmstandPanel>
      </div>
    </div>
  );
}
/** Vendor list adapter for the date workspace. Shared primitives cannot own
 * approval eligibility or assignment commands, so the existing AssignmentCard
 * remains the editor for both booth and rental actions. */
export function AssignmentVendors({
  data,
  occurrenceId,
  run,
  canAssign,
  canBill,
}: {
  data: MarketOperationsData;
  occurrenceId: number;
  run: (command: OperationsCommand) => Promise<unknown>;
  canAssign: boolean;
  canBill: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [editor, setEditor] = useState<'booth' | 'rentals' | null>(null);
  const [approving, setApproving] = useState(false);
  const { approvals, assignments } = occurrenceBooths(data, occurrenceId);
  const rows = (data.directory ?? [])
    .filter(
      (d) =>
        d.status !== 'INACTIVE' ||
        approvals.some((a) => a.directoryId === d.id),
    )
    .map((vendor) => {
      const approval = approvals.find((a) => a.directoryId === vendor.id);
      const booths = assignments.filter((a) => a.directoryId === vendor.id);
      const invoices = (data.invoices ?? []).filter(
        (i) =>
          i.status !== 'VOID' && booths.some((b) => b.id === i.assignmentId),
      );
      const rentals = (data.allocations ?? []).filter((r) =>
        booths.some((b) => b.id === r.assignmentId),
      );
      const eligibility = data.platformEligibility?.find(
        (entry) => entry.directoryId === vendor.id,
      );
      const state =
        eligibility?.participationStatus === 'cancelled' ||
        eligibility?.state === 'PARTICIPATION_CANCELLED'
          ? 'not-attending'
          : eligibility?.participationStatus === 'planned'
            ? 'tentative'
            : eligibility?.state === 'PARTICIPATION_REQUIRED'
              ? 'attendance-unconfirmed'
              : !approval
                ? 'approval'
                : booths.length
                  ? 'assigned'
                  : 'unassigned';
      return { vendor, approval, booths, invoices, rentals, state };
    })
    .sort((a, b) =>
      a.vendor.contact.businessName.localeCompare(
        b.vendor.contact.businessName,
      ),
    );
  const filtered = rows.filter(
    (r) =>
      (status === 'all' || r.state === status) &&
      `${r.vendor.contact.businessName} ${r.booths.map((b) => b.spaceSnapshot.label).join(' ')}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const shown = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const current = filtered.find((r) => r.vendor.id === selected) ?? shown[0];
  const stateLabel = (state: string) =>
    state === 'not-attending'
      ? 'Not attending'
      : state === 'tentative'
        ? 'Tentative'
        : state === 'attendance-unconfirmed'
          ? 'Attendance unconfirmed'
          : state === 'approval'
            ? 'Needs approval'
            : state === 'assigned'
              ? 'Assigned'
              : 'Needs a booth';
  const vendorStatus = (state: string) => (
    <Badge
      tone={
        state === 'attendance-unconfirmed'
          ? 'danger'
          : state === 'assigned'
            ? 'success'
            : 'warning'
      }
      className={state === 'approval' ? 'assignment-needs-approval' : undefined}
    >
      {stateLabel(state)}
    </Badge>
  );
  const invoiceStatus = (row: (typeof rows)[number]) =>
    row.invoices.length ? (
      row.invoices.map((invoice) => (
        <StatusBadge key={invoice.id}>
          {invoice.billingStatus ?? invoice.status}
        </StatusBadge>
      ))
    ) : (
      <span className="markets-muted">No invoice</span>
    );
  const boothLabel = (row: (typeof rows)[number]) =>
    row.booths.map((b) => b.spaceSnapshot.label).join(', ') || 'Not assigned';
  const blocker = current ? approvalBlocker(data, current.vendor.id) : null;
  function choose(directoryId: number) {
    setSelected(directoryId);
    setEditor(null);
    if (
      panel.current &&
      panel.current.getBoundingClientRect().top > innerHeight
    )
      panel.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return (
    <div className="assignment-booths assignment-vendor-workspace">
      <FarmstandPanel
        as="section"
        className="markets-list market-applications-list assignment-booth-list assignment-vendor-list"
        aria-label="Vendors for this date"
      >
        <div className="markets-filters assignment-booth-filters">
          <Field
            id={`${id}-search`}
            label={<span className="sr-only">Search vendors</span>}
          >
            <FarmstandSearch
              id={`${id}-search`}
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Field>
          <Field
            id={`${id}-status`}
            label={<span className="sr-only">Vendor status</span>}
          >
            <FarmstandSelect
              id={`${id}-status`}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All vendors</option>
              <option value="not-attending">Not attending</option>
              <option value="tentative">Tentative</option>
              <option value="approval">Needs approval</option>
              <option value="attendance-unconfirmed">
                Attendance unconfirmed
              </option>
              <option value="unassigned">Needs a booth</option>
              <option value="assigned">Assigned</option>
            </FarmstandSelect>
          </Field>
        </div>
        {shown.length ? (
          <>
            <FarmstandTable
              label="Vendors for this date"
              headings={['Vendor', 'Booth', 'Invoice', 'Status']}
            >
              {shown.map((row) => (
                <tr
                  key={row.vendor.id}
                  tabIndex={0}
                  aria-selected={current?.vendor.id === row.vendor.id}
                  className={
                    current?.vendor.id === row.vendor.id
                      ? 'market-application-selected'
                      : undefined
                  }
                  onClick={() => choose(row.vendor.id)}
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      choose(row.vendor.id);
                    }
                  }}
                >
                  <th scope="row">{row.vendor.contact.businessName}</th>
                  <td>{boothLabel(row)}</td>
                  <td>{invoiceStatus(row)}</td>
                  <td>{vendorStatus(row.state)}</td>
                </tr>
              ))}
            </FarmstandTable>
            <MarketsPagination
              label="Vendor pages"
              summary={`${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} vendors`}
              hasPrevious={currentPage > 0}
              hasNext={(currentPage + 1) * PAGE_SIZE < filtered.length}
              onPrevious={() => setPage(currentPage - 1)}
              onNext={() => setPage(currentPage + 1)}
            />
          </>
        ) : (
          <EmptyState title="No matching vendors">
            <p>Try a different search or vendor status.</p>
          </EmptyState>
        )}
      </FarmstandPanel>
      <div ref={panel} className="assignment-booth-panel-wrap">
        <FarmstandPanel as="div" className="assignment-booth-panel">
          {current ? (
            <section
              className="booth-panel assignment-vendor-panel"
              aria-label={current.vendor.contact.businessName}
            >
              <div className="booth-panel-header">
                <h2>{current.vendor.contact.businessName}</h2>
                {vendorStatus(current.state)}
              </div>
              <p>Booth: {boothLabel(current)}</p>
              <p>Invoice: {invoiceStatus(current)}</p>
              {current.vendor.contact.category && (
                <p>{current.vendor.contact.category}</p>
              )}
              <p>
                {[
                  current.vendor.contact.firstName,
                  current.vendor.contact.lastName,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              {current.vendor.contact.email && (
                <a href={`mailto:${current.vendor.contact.email}`}>
                  {current.vendor.contact.email}
                </a>
              )}
              {current.vendor.contact.phone && (
                <a href={`tel:${current.vendor.contact.phone}`}>
                  {current.vendor.contact.phone}
                </a>
              )}
              <div className="assignment-rentals-summary">
                <span>Rentals:</span>
                {current.rentals.length ? (
                  <ul>
                    {current.rentals.map((r) => (
                      <li key={r.id}>
                        {r.snapshot.name} × {r.quantity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="markets-muted">None</span>
                )}
              </div>
              {!current.approval && blocker && (
                <Alert severity="warning">{blocker}</Alert>
              )}
              {canAssign && (
                <div className="attendance-assignment-actions">
                  {!current.approval ? (
                    <FarmstandButton
                      type="button"
                      variant="primary"
                      disabled={!!blocker || approving}
                      onClick={async () => {
                        setApproving(true);
                        try {
                          await run({
                            action: 'APPROVE_OCCURRENCE',
                            data: {
                              occurrenceId,
                              directoryId: current.vendor.id,
                            },
                          });
                        } finally {
                          setApproving(false);
                        }
                      }}
                    >
                      Approve for this date
                    </FarmstandButton>
                  ) : (
                    <>
                      <FarmstandButton
                        type="button"
                        variant="primary"
                        onClick={() => setEditor('booth')}
                      >
                        {current.booths.length
                          ? 'Change booth'
                          : 'Assign booth'}
                      </FarmstandButton>
                      <FarmstandButton
                        type="button"
                        variant="secondary"
                        onClick={() => setEditor('rentals')}
                      >
                        Add rentals
                      </FarmstandButton>
                    </>
                  )}
                </div>
              )}
              {editor && current.approval && (
                <MarketDialog
                  open
                  title={editor === 'booth' ? 'Assign booth' : 'Add rentals'}
                  onClose={() => setEditor(null)}
                >
                  <AssignmentCard
                    embedded
                    key={`${current.approval.id}:${current.approval.revision}:${current.booths.map((b) => b.revision).join(':')}`}
                    data={data}
                    approval={current.approval}
                    assignments={current.booths}
                    run={run}
                    canAssign={canAssign}
                    canDay={false}
                    canBill={canBill}
                  />
                </MarketDialog>
              )}
            </section>
          ) : (
            <EmptyState title="No vendor selected">
              <p>Select a vendor in the table.</p>
            </EmptyState>
          )}
        </FarmstandPanel>
      </div>
    </div>
  );
}
