import { useCallback, useId, useMemo, useState, type MouseEvent } from 'react';
import type {
  DirectoryEntry,
  MarketOperationsData,
  OperationsCommand,
  VendorNote,
} from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Alert, Dialog, EmptyState, Field } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { MarketsSummary } from '../vendor/MarketsSummary';
import { MarketsPagination } from '../vendor/MarketsPagination';
import { go, ReadState, useRead } from './common';
import { StatusBadge } from './presentation';
import type { MarketService } from './service';
import { BusinessWizard, type PlatformVendorAccess } from './BusinessWizard';
import { VendorNotesDialog } from './VendorNotes';
import {
  AccountBadge,
  ComplianceCell,
  ComplianceSummary,
  linkState,
  needsAttention,
  plural,
  useVendorCompliance,
  verifiedVendor,
} from './vendor-compliance';
import '@market/ui/farmstand.css';
import '../vendor/markets-workspace.css';
import '../vendor/market-applications.css';
import './market-occurrences.css';
import './vendors.css';

const PAGE_SIZE = 10;
type Membership = Awaited<
  ReturnType<MarketService['relationshipPage']>
>['items'][number];
/** One business at the market: a platform Vendor membership or an external record. */
export interface BusinessRow {
  key: string;
  kind: 'platform' | 'external';
  name: string;
  vendorId?: number;
  membership?: Membership;
  directory?: DirectoryEntry;
  note?: VendorNote;
  notes: string;
}

export function vendorRows(
  memberships: readonly Membership[],
  data?: MarketOperationsData,
): BusinessRow[] {
  const directory = data?.directory ?? [];
  const notes = data?.vendorNotes ?? [];
  const platform = memberships.map((membership): BusinessRow => {
    const vendorId = Number(membership.vendorId);
    const record = directory.find((d) => verifiedVendor(d) === vendorId);
    const note = notes.find((n) => n.vendorId === vendorId);
    return {
      key: `membership:${membership.id}`,
      kind: 'platform',
      name: membership.vendor.name,
      vendorId,
      membership,
      directory: record,
      note,
      notes: note?.notes ?? record?.managerNotes ?? '',
    };
  });
  const members = new Set(platform.map((row) => row.vendorId));
  // A verified link without a membership is still a Vendor-managed business.
  const linkedOnly = directory
    .filter((d) => {
      const vendorId = verifiedVendor(d);
      return vendorId !== undefined && !members.has(vendorId);
    })
    .map((d): BusinessRow => {
      const vendorId = verifiedVendor(d)!;
      const note = notes.find((n) => n.vendorId === vendorId);
      return {
        key: `directory:${d.id}`,
        kind: 'platform',
        name: d.contact.businessName,
        vendorId,
        directory: d,
        note,
        notes: note?.notes ?? d.managerNotes,
      };
    });
  const external = directory
    .filter((d) => verifiedVendor(d) === undefined)
    .map(
      (d): BusinessRow => ({
        key: `directory:${d.id}`,
        kind: 'external',
        name: d.contact.businessName,
        directory: d,
        notes: d.managerNotes,
      }),
    );
  return [...platform, ...linkedOnly, ...external].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
export function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
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
function accountState(row: BusinessRow) {
  return row.kind === 'platform'
    ? 'LINK_VERIFIED'
    : linkState(row.directory!);
}

/**
 * Market Vendors: platform Vendor memberships and external businesses in one
 * list. Composes the Applications/Occurrences list (summary, filters,
 * selectable table, side panel, pagination); add and edit open
 * `BusinessWizard` in the shared Dialog, as rentals and rewards do.
 */
export function VendorsWorkspace({
  service,
  adding = false,
}: {
  service: MarketService;
  /** Legacy `/market/directory/new` links open the add dialog. */
  adding?: boolean;
}) {
  const id = useId();
  const permissions = service.context.permissions;
  const canExternal =
    !!service.phase14 &&
    mayMarketCommand(service.context, 'ManageOwnMarketApplications');
  const canPlatform = mayMarketCommand(
    service.context,
    'ManageOwnMarketMemberships',
  );
  const readMemberships = useCallback(async () => {
    const rows: Membership[] = [];
    for (let skip = 0; skip < 1000; skip += 20) {
      const page = await service.relationshipPage({ take: 20, skip });
      rows.push(...page.items);
      if (!page.items.length || rows.length >= page.totalItems) break;
    }
    return rows;
  }, [service]);
  const memberships = useRead(
    `${service.readKey}:vendors:memberships`,
    readMemberships,
  );
  const directoryAllowed =
    !!service.phase14 && permissions.includes('ReadOwnMarketApplications');
  const readDirectory = useCallback(
    () => service.phase14!.read('DIRECTORY'),
    [service],
  );
  const directory = useRead(
    `${service.readKey}:vendors:directory`,
    readDirectory,
    directoryAllowed,
  );
  const rows = useMemo(
    () => vendorRows(memberships.data ?? [], directory.data),
    [memberships.data, directory.data],
  );
  const compliance = useVendorCompliance(
    `${service.readKey}:vendors`,
    rows.flatMap((r) => (r.vendorId === undefined ? [] : [r.vendorId])),
    service.notifications,
    service.documents,
  );
  const [editor, setEditor] = useState<DirectoryEntry | 'new' | null>(
    adding ? 'new' : null,
  );
  const [notesFor, setNotesFor] = useState<BusinessRow>();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();

  const run = service.phase14
    ? async (command: OperationsCommand) => {
        const saved = await service.phase14!.command(command);
        directory.refresh();
        return saved;
      }
    : undefined;
  const platform: PlatformVendorAccess | undefined = canPlatform
    ? {
        search: (term) =>
          service.eligibleVendors({ take: 20, skip: 0, search: term }),
        add: async (vendorId, status) => {
          const saved = await service.membershipStatus(
            service.marketId,
            vendorId,
            status,
          );
          memberships.refresh();
          return saved;
        },
        memberIds: new Set(
          (memberships.data ?? []).map((m) => String(m.vendorId)),
        ),
      }
    : undefined;

  const term = search.trim().toLocaleLowerCase();
  const visible = (() => {
    return rows.filter((row) => {
      const state = accountState(row);
      const ready = compliance.readiness(row.vendorId);
      const contact = row.directory?.contact;
      return (
        (account === 'all' ||
          (account === 'platform' && row.kind === 'platform') ||
          (account === 'external' && state === 'EXTERNAL') ||
          (account === 'pending' &&
            (row.membership?.status === 'pending' ||
              ['LINK_PENDING', 'LEGACY_UNVERIFIED', 'LINK_REVOKED'].includes(
                state,
              )))) &&
        (readinessFilter === 'all' ||
          (readinessFilter === 'attention' && needsAttention(ready)) ||
          (readinessFilter === 'ready' && ready?.status === 'Ready')) &&
        [
          row.name,
          contact?.firstName,
          contact?.lastName,
          contact?.email,
          contact?.category,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(term)
      );
    });
  })();
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / PAGE_SIZE) - 1),
  );
  const shown = visible.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const current =
    shown.find((row) => row.key === selected) ??
    rows.find((row) => row.key === selected) ??
    shown[0];
  const attention = rows.filter((row) =>
    needsAttention(compliance.readiness(row.vendorId)),
  ).length;
  const pendingMembers = rows.filter(
    (row) => row.membership?.status === 'pending',
  ).length;

  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }
  function closeEditor() {
    setEditor(null);
    if (adding) go('/market/vendors');
  }
  const add = (canExternal || canPlatform) && (
    <FarmstandButton onClick={() => setEditor('new')}>
      <FarmstandIcon name="plus" />
      Add business
    </FarmstandButton>
  );
  const loading = memberships.loading || (directoryAllowed && directory.loading);
  return (
    <WorkspaceFrame
      icon="store"
      title="Vendors"
      description="Every business at your market: platform Vendors and external businesses, with their membership and document compliance."
      tabs={[]}
      value="vendors"
      onChange={() => {}}
      className="market-vendors farmstand-controls"
      actions={add || undefined}
    >
      <MarketsSummary
        className="vendors-summary"
        items={[
          {
            label: 'Businesses',
            value: loading ? '…' : rows.length,
            hint: `${plural(rows.filter((r) => r.kind === 'external').length, 'external business')}`,
            icon: 'store',
          },
          {
            label: 'Platform Vendors',
            value: loading ? '…' : rows.filter((r) => r.kind === 'platform').length,
            tone: 'success',
            hint: 'Manage their own details',
            icon: 'circle-check',
          },
          {
            label: 'Pending memberships',
            value: loading ? '…' : pendingMembers,
            tone: pendingMembers ? 'warning' : undefined,
            hint: pendingMembers ? 'Waiting for your decision' : 'Nothing waiting',
            icon: 'inbox',
          },
          {
            label: 'Missing documents',
            value: compliance.loading ? '…' : attention,
            tone: attention ? 'danger' : undefined,
            hint: attention
              ? 'Vendors with outstanding compliance items'
              : 'No outstanding compliance items',
            icon: 'shield-check',
          },
        ]}
      />
      <ReadState
        loading={false}
        error={memberships.error}
        retry={memberships.refresh}
      />
      {directory.error && (
        <Alert severity="warning">
          External businesses could not be loaded.{' '}
          <FarmstandButton variant="tertiary" onClick={directory.refresh}>
            Try again
          </FarmstandButton>
        </Alert>
      )}
      <div className="markets-columns market-applications-columns">
        <div className="market-applications-main">
          <FarmstandPanel
            as="section"
            className="markets-list market-applications-list vendors-list"
            aria-label="Market businesses"
          >
            <div className="markets-filters vendors-filters">
              <Field
                id={`${id}-search`}
                label={<span className="sr-only">Search businesses</span>}
              >
                <FarmstandSearch
                  id={`${id}-search`}
                  placeholder="Search businesses or contacts..."
                  value={search}
                  onChange={(e) =>
                    changeFilter(() => setSearch(e.target.value))
                  }
                />
              </Field>
              <Field
                id={`${id}-account`}
                label={<span className="sr-only">Account type</span>}
              >
                <FarmstandSelect
                  id={`${id}-account`}
                  value={account}
                  onChange={(e) =>
                    changeFilter(() => setAccount(e.target.value))
                  }
                >
                  <option value="all">All businesses</option>
                  <option value="platform">Platform Vendors</option>
                  <option value="external">External only</option>
                  <option value="pending">Needs a decision</option>
                </FarmstandSelect>
              </Field>
              <Field
                id={`${id}-readiness`}
                label={<span className="sr-only">Document compliance</span>}
              >
                <FarmstandSelect
                  id={`${id}-readiness`}
                  value={readinessFilter}
                  onChange={(e) =>
                    changeFilter(() => setReadinessFilter(e.target.value))
                  }
                >
                  <option value="all">Any compliance</option>
                  <option value="attention">Missing documents</option>
                  <option value="ready">Ready</option>
                </FarmstandSelect>
              </Field>
            </div>
            {compliance.limited && (
              <Alert severity="info">
                Compliance is shown for the first 50 platform Vendors. Open
                Documents for the others.
              </Alert>
            )}
            {loading && !rows.length ? (
              <ReadState loading error={undefined} retry={() => {}} />
            ) : shown.length ? (
              <>
                <FarmstandTable
                  label="Market businesses"
                  wide
                  headings={['Business', 'Contact', 'Account', 'Compliance']}
                >
                  {shown.map((row) => (
                    <tr
                      key={row.key}
                      tabIndex={0}
                      aria-selected={row.key === current?.key}
                      className={
                        row.key === current?.key
                          ? 'market-application-selected'
                          : undefined
                      }
                      onClick={() => setSelected(row.key)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          setSelected(row.key);
                        }
                      }}
                    >
                      <th scope="row">
                        <div className="markets-identity">
                          <span className="markets-identity-icon">
                            <FarmstandIcon
                              name={row.kind === 'platform' ? 'store' : 'user-round'}
                            />
                          </span>
                          <span>
                            <span className="market-application-name">
                              {row.name}
                            </span>
                            {row.directory?.contact.category && (
                              <small>{row.directory.contact.category}</small>
                            )}
                          </span>
                        </div>
                      </th>
                      <td>
                        {row.directory ? (
                          <div className="vendor-contact-cell">
                            <span>
                              {row.directory.contact.firstName}{' '}
                              {row.directory.contact.lastName}
                            </span>
                            <small>{row.directory.contact.email}</small>
                          </div>
                        ) : (
                          <span className="markets-muted">Managed by the Vendor</span>
                        )}
                      </td>
                      <td>
                        <div className="vendor-account-cell">
                          <AccountBadge state={accountState(row)} />
                          {row.membership && (
                            <small>Membership {row.membership.status}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <ComplianceCell
                          vendor={row.vendorId}
                          compliance={compliance}
                        />
                      </td>
                    </tr>
                  ))}
                </FarmstandTable>
                <MarketsPagination
                  label="Vendor pages"
                  summary={`${plural(visible.length, 'business')}. Showing ${currentPage * PAGE_SIZE + 1} to ${Math.min((currentPage + 1) * PAGE_SIZE, visible.length)}.`}
                  hasPrevious={currentPage > 0}
                  hasNext={(currentPage + 1) * PAGE_SIZE < visible.length}
                  onPrevious={() => setPage(currentPage - 1)}
                  onNext={() => setPage(currentPage + 1)}
                />
              </>
            ) : (
              <EmptyState
                title={rows.length ? 'No matching businesses' : 'No businesses yet'}
                action={rows.length ? undefined : add || undefined}
              >
                <p>
                  {rows.length
                    ? 'Try another search or filter.'
                    : 'Add a platform Vendor or an external business to start managing your market’s vendors.'}
                </p>
              </EmptyState>
            )}
          </FarmstandPanel>
        </div>
        <BusinessDetails
          row={current}
          data={directory.data}
          compliance={compliance}
          canEditExternal={canExternal}
          canNotes={!!run && permissions.includes('ManageOwnMarketApplications')}
          onEdit={setEditor}
          onNotes={setNotesFor}
        />
      </div>
      <Dialog
        open={editor !== null}
        title={editor === 'new' ? 'Add business' : 'Edit business'}
        size="wide"
        busy={busy}
        onClose={closeEditor}
      >
        {editor !== null && (
          <BusinessWizard
            key={editor === 'new' ? 'new' : editor.id}
            original={editor === 'new' ? undefined : editor}
            data={directory.data}
            run={canExternal ? run : undefined}
            platform={editor === 'new' ? platform : undefined}
            onBusyChange={setBusy}
            onClose={closeEditor}
          />
        )}
      </Dialog>
      {notesFor && run && notesFor.vendorId !== undefined && (
        <VendorNotesDialog
          open
          vendorId={notesFor.vendorId}
          name={notesFor.name}
          notes={notesFor.notes}
          revision={notesFor.note?.revision}
          run={run}
          onClose={() => setNotesFor(undefined)}
          onSaved={directory.refresh}
        />
      )}
    </WorkspaceFrame>
  );
}

function BusinessDetails({
  row,
  data,
  compliance,
  canEditExternal,
  canNotes,
  onEdit,
  onNotes,
}: {
  row?: BusinessRow;
  data?: MarketOperationsData;
  compliance: ReturnType<typeof useVendorCompliance>;
  canEditExternal: boolean;
  canNotes: boolean;
  onEdit: (entry: DirectoryEntry) => void;
  onNotes: (row: BusinessRow) => void;
}) {
  const contact = row?.directory?.contact;
  const pendingLink = data?.linkRequests?.find(
    (r) => r.directoryId === row?.directory?.id && r.status === 'PENDING',
  );
  const page = row?.membership
    ? `/market/vendors/memberships/${row.membership.id}`
    : undefined;
  const documentsHref =
    row?.vendorId !== undefined
      ? `/market/documents?vendor=${row.vendorId}#vendor-${row.vendorId}`
      : undefined;
  return (
    <FarmstandPanel
      as="section"
      className="markets-next market-application-details application-template-details vendor-details"
      aria-label="Business details"
    >
      <h2>
        <FarmstandIcon name="store" />
        Business details
      </h2>
      {row ? (
        <div className="markets-next-content" key={row.key}>
          <div className="occurrence-details-title">
            <h3>{row.name}</h3>
            <AccountBadge state={accountState(row)} />
          </div>
          <dl className="market-application-facts">
            {row.membership && (
              <div>
                <dt>Membership</dt>
                <dd>
                  <StatusBadge>{row.membership.status}</StatusBadge>
                </dd>
              </div>
            )}
            {contact ? (
              <>
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {contact.firstName} {contact.lastName}
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{contact.phone || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{contact.category || 'Not set'}</dd>
                </div>
              </>
            ) : (
              <div>
                <dt>Details</dt>
                <dd>Managed by the Vendor</dd>
              </div>
            )}
            {pendingLink && (
              <div>
                <dt>Link request</dt>
                <dd>Waiting for the Vendor to confirm</dd>
              </div>
            )}
          </dl>
          <section className="vendor-details-section" aria-label="Compliance">
            <h4>Compliance</h4>
            <ComplianceSummary
              vendor={row.vendorId}
              compliance={compliance}
              untracked={
                row.directory && linkState(row.directory) === 'LINK_PENDING'
                  ? 'Document compliance appears here once the Vendor confirms the link.'
                  : 'Document compliance is tracked for platform Vendors. External businesses do not receive document requests.'
              }
            />
          </section>
          <section className="vendor-details-section" aria-label="Private notes">
            <h4>Private notes</h4>
            <p className="market-application-guidance">
              {row.notes || 'No notes yet.'}
            </p>
          </section>
          <div className="application-details-actions">
            {page && (
              <FarmstandLink
                href={page}
                variant="primary"
                className="application-detail-arrow"
                onClick={(event) => inApp(event, page)}
              >
                Open Vendor page
                <FarmstandIcon name="chevron-right" />
              </FarmstandLink>
            )}
            {row.kind === 'external' && canEditExternal && row.directory && (
              <FarmstandButton onClick={() => onEdit(row.directory!)}>
                Edit business
                <FarmstandIcon name="chevron-right" />
              </FarmstandButton>
            )}
            {row.kind === 'platform' && canNotes && (
              <FarmstandButton variant="secondary" onClick={() => onNotes(row)}>
                Edit private notes
              </FarmstandButton>
            )}
            {documentsHref && (
              <FarmstandLink
                href={documentsHref}
                variant="secondary"
                onClick={(event) => inApp(event, documentsHref)}
              >
                Open in Documents
                <FarmstandIcon name="chevron-right" />
              </FarmstandLink>
            )}
          </div>
        </div>
      ) : (
        <EmptyState title="No business selected">
          <p>Select a business to see its details and compliance.</p>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}
