import { useCallback, useId, useState } from 'react';
import type {
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
  RentalOption,
  VendorCategoryApi,
} from '@market/api';
import { Dialog, EmptyState, Field } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { WorkspaceFrame } from '../../WorkspaceFrame';
import { MarketsSummary } from '../../vendor/MarketsSummary';
import { MarketsPagination } from '../../vendor/MarketsPagination';
import { date, ReadState, useRead } from '../common';
import { go } from '../../vendor/common';
import { StatusBadge } from '../presentation';
import { moneyLabel } from './common';
import { RentalWizard } from './RentalWizard';
import './rentals.css';

export type RentalMedia = Pick<VendorCategoryApi, 'images' | 'upload'>;
const PAGE_SIZE = 10;

/** Feature composition: the shared workspace, list and wizard primitives do
 * not supply rental pricing, per-date stock or revision-aware persistence. */
export function Rentals({
  api,
  data,
  run,
  canManage,
  media,
  view = 'list',
}: {
  api?: MarketOperationsApi;
  data: MarketOperationsData;
  run: (command: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  media?: RentalMedia;
  /** Old /new links open the same dialog over the list. */
  view?: 'list' | 'add';
}) {
  const id = useId();
  const [editor, setEditor] = useState<RentalOption | 'new' | null>(
    view === 'add' ? 'new' : null,
  );
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [occurrenceId, setOccurrenceId] = useState(
    () =>
      data.occurrences
        .filter(
          (o) => o.status === 'scheduled' && Date.parse(o.endsAt) >= Date.now(),
        )
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
        ?.id ?? 0,
  );
  const stockRead = useCallback(
    () => api!.read('ASSIGNMENTS', occurrenceId),
    [api, occurrenceId],
  );
  const stock = useRead(
    `rental-stock:${data.marketId}:${occurrenceId}`,
    stockRead,
    !!api && !!occurrenceId,
  );
  // Never present a prior date's allocations as the selected date's stock.
  const allocations = api
    ? stock.loading || stock.error
      ? undefined
      : stock.data?.allocations
    : data.allocations;
  const rentals = data.rentals ?? [];
  const term = search.trim().toLocaleLowerCase();
  const filtered = rentals
    .filter(
      (r) =>
        (status === 'all' || r.details.enabled === (status === 'available')) &&
        `${r.details.name} ${r.details.description}`
          .toLocaleLowerCase()
          .includes(term),
    )
    .sort(
      (a, b) =>
        a.details.sortOrder - b.details.sortOrder ||
        a.details.name.localeCompare(b.details.name),
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const shown = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  function closeEditor() {
    setEditor(null);
    if (view === 'add') go('/market/rentals');
  }
  function stockLabel(rental: RentalOption) {
    const capacity = rental.details.capacity;
    if (capacity === null) return 'Unlimited stock';
    if (!occurrenceId) return `Total stock: ${capacity}`;
    if (allocations === undefined) return `Stock unavailable / ${capacity}`;
    const used = allocations
      .filter(
        (a) => a.optionId === rental.id && a.occurrenceId === occurrenceId,
      )
      .reduce((sum, a) => sum + a.quantity, 0);
    return `Current stock: ${Math.max(0, capacity - used)} / ${capacity}`;
  }
  return (
    <WorkspaceFrame
      icon="package"
      title="Rental equipment"
      description="Offer equipment and add-ons with clear prices and availability for each market date."
      tabs={[]}
      value="rentals"
      onChange={() => {}}
      className="market-rentals farmstand-controls"
      actions={
        canManage && (
          <FarmstandButton onClick={() => setEditor('new')}>
            <FarmstandIcon name="plus" />
            Add rental equipment
          </FarmstandButton>
        )
      }
    >
      <MarketsSummary
        items={[
          {
            label: 'Equipment types',
            value: rentals.length,
            hint: 'Equipment and add-ons in your inventory',
            icon: 'package',
          },
          {
            label: 'Available to applicants',
            value: rentals.filter((r) => r.details.enabled).length,
            hint: 'Can be offered on vendor applications',
            icon: 'circle-check',
            tone: 'success',
          },
          {
            label: 'Disabled',
            value: rentals.filter((r) => !r.details.enabled).length,
            hint: 'Kept in your inventory for later',
            icon: 'layers',
          },
        ]}
      />
      <FarmstandPanel
        as="section"
        className="markets-list rental-list"
        aria-label="Rental inventory"
      >
        <div className="markets-filters rental-filters">
          <Field
            id={`${id}-search`}
            label={<span className="sr-only">Search rental equipment</span>}
          >
            <FarmstandSearch
              id={`${id}-search`}
              placeholder="Search equipment..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Field>
          <Field
            id={`${id}-status`}
            label={<span className="sr-only">Rental availability</span>}
          >
            <FarmstandSelect
              id={`${id}-status`}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All equipment</option>
              <option value="available">Available</option>
              <option value="disabled">Disabled</option>
            </FarmstandSelect>
          </Field>
          <Field
            id={`${id}-date`}
            label={<span className="sr-only">Stock for Market Date</span>}
          >
            <FarmstandSelect
              id={`${id}-date`}
              value={occurrenceId}
              onChange={(e) => setOccurrenceId(Number(e.target.value))}
            >
              <option value={0}>Total stock</option>
              {data.occurrences.map((o) => (
                <option key={o.id} value={o.id}>
                  {date(o.startsAt)} · {o.venue}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
        </div>
        {!!api && !!occurrenceId && (
          <ReadState
            loading={stock.loading}
            error={stock.error}
            retry={stock.refresh}
          />
        )}
        {shown.length ? (
          <FarmstandTable
            label="Rental equipment"
            wide
            headings={[
              'Equipment',
              'Price per date',
              'Availability',
              'Stock',
              'Actions',
            ]}
          >
            {shown.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <div className="markets-identity">
                    <span className="markets-identity-icon rental-thumbnail">
                      <FarmstandIcon name="package" />
                      {r.details.image && (
                        <img
                          src={r.details.image}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      )}
                    </span>
                    <span>
                      <strong>{r.details.name}</strong>
                      {r.details.description && (
                        <small>{r.details.description}</small>
                      )}
                    </span>
                  </div>
                </th>
                <td>{moneyLabel(r.details.priceMinor, r.details.currency)}</td>
                <td>
                  <StatusBadge>
                    {r.details.enabled ? 'available' : 'disabled'}
                  </StatusBadge>
                </td>
                <td>{stockLabel(r)}</td>
                <td>
                  {canManage ? (
                    <FarmstandButton
                      variant="secondary"
                      onClick={() => setEditor(r)}
                      aria-label={`Edit ${r.details.name}`}
                    >
                      Edit
                      <FarmstandIcon name="chevron-right" />
                    </FarmstandButton>
                  ) : (
                    <span className="markets-muted">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </FarmstandTable>
        ) : (
          <EmptyState
            title={
              rentals.length
                ? 'No matching equipment'
                : 'No rental equipment yet'
            }
          >
            <p>
              {rentals.length
                ? 'Try a different search or availability filter.'
                : 'Add equipment to make it available on vendor applications.'}
            </p>
          </EmptyState>
        )}
        <MarketsPagination
          label="Rental equipment pages"
          summary={`${filtered.length ? currentPage * PAGE_SIZE + 1 : 0}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} items`}
          hasPrevious={currentPage > 0}
          hasNext={(currentPage + 1) * PAGE_SIZE < filtered.length}
          onPrevious={() => setPage(currentPage - 1)}
          onNext={() => setPage(currentPage + 1)}
        />
      </FarmstandPanel>
      <Dialog
        open={canManage && editor !== null}
        title={
          editor === 'new' ? 'Add rental equipment' : 'Edit rental equipment'
        }
        size="wide"
        busy={busy}
        onClose={closeEditor}
      >
        {editor !== null && canManage && (
          <RentalWizard
            key={editor === 'new' ? 'new' : editor.id}
            original={editor === 'new' ? undefined : editor}
            media={media}
            run={run}
            onBusyChange={setBusy}
            onClose={closeEditor}
          />
        )}
      </Dialog>
    </WorkspaceFrame>
  );
}
