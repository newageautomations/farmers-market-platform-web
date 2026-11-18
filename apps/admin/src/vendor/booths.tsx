import { useState } from 'react';
import type { VendorBoothAssignment } from '@market/api';
import { formatMoney } from '@market/config';
import { Dropdown, EmptyState, MarketMap } from '@market/ui';
import '@market/ui/farmstand.css';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { StatusBadge } from '../market/presentation';
import { Fact } from './application-detail';
import type { VendorService } from './service';
import { ReadState, useRead } from './common';
import { BoothInvoicePayment } from './BoothInvoicePayment';
import './booths.css';

/** Vendor booth assignments: one disclosure per market date with the booth's
 * facts, invoices and the published map. Other businesses appear only on the
 * map and its hover cards; there is no booth list or search here. */
export function VendorBooths({ service }: { service: VendorService }) {
  const read = useRead(
    `booths:${service.vendorId}`,
    service.boothAssignments ?? unavailable,
    true,
    { retainPreviousData: true },
  );
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('occurrence');
  const requestedInvoice = params.get('invoice');
  const assignments = [...(read.data ?? [])].sort(
    (a, b) =>
      Number(String(b.occurrenceId) === requested) -
      Number(String(a.occurrenceId) === requested),
  );
  return (
    <WorkspaceFrame
      className="vendor-booths farmstand-controls"
      icon="map-pin"
      title="Booth assignments"
      description="Your booths for upcoming market dates, with the market map and invoices for each."
      tabs={[]}
      value="booths"
      onChange={() => undefined}
    >
      <ReadState
        loading={!read.data && read.loading}
        error={read.error}
        retry={read.refresh}
      />
      {read.data && !assignments.length && (
        <EmptyState title="No upcoming booth assignments">
          <p>Booths appear here once a market assigns you one.</p>
        </EmptyState>
      )}
      {!!assignments.length && (
        <div className="vendor-booths-list">
          {assignments.map((a, index) => (
            <BoothAssignmentItem
              key={`${a.occurrenceId}:${a.elementId}`}
              assignment={a}
              service={service}
              defaultOpen={index === 0}
              requestedInvoice={
                String(a.occurrenceId) === requested ? requestedInvoice : null
              }
              onUpdated={read.refresh}
            />
          ))}
        </div>
      )}
    </WorkspaceFrame>
  );
}

function BoothAssignmentItem({
  assignment: a,
  service,
  defaultOpen,
  requestedInvoice,
  onUpdated,
}: {
  assignment: VendorBoothAssignment;
  service: VendorService;
  defaultOpen: boolean;
  requestedInvoice: string | null;
  onUpdated: () => void;
}) {
  // The map measures its canvas, so it mounts once the disclosure is opened.
  const [opened, setOpened] = useState(defaultOpen);
  const starts = new Date(a.startsAt);
  const cancelled = a.occurrenceStatus === 'cancelled';
  const invoice = a.invoices.find((i) => i.status !== 'VOID') ?? a.invoices[0];
  const amenities = a.space.amenities
    .map((x) => x.toLowerCase().replaceAll('_', ' '))
    .join(', ');
  return (
    <Dropdown
      className="vendor-booth"
      defaultOpen={defaultOpen}
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
      label={
        <span className="vendor-booth-summary">
          <span className="vendor-booth-summary-title">
            <strong>Booth {a.space.label}</strong>
            <span>
              {starts.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              ·{' '}
              {starts.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </span>
          {cancelled ? (
            <StatusBadge>Cancelled</StatusBadge>
          ) : (
            invoice && <StatusBadge>{invoice.status}</StatusBadge>
          )}
        </span>
      }
    >
      <div className="vendor-booth-body">
        {cancelled && (
          <p role="status">
            The market cancelled this date. Your booth assignment and invoices
            are cancelled. No payment is due. Recorded payments remain in your
            invoice history; contact the market about refunds.
          </p>
        )}
        <dl className="vendor-booth-facts">
          <Fact icon={{ farmstand: 'store' }} label="Booth size">
            {a.space.widthFeet > 0
              ? `${a.space.widthFeet} × ${a.space.depthFeet} ft`
              : 'Not provided'}
          </Fact>
          <Fact icon={{ farmstand: 'layers' }} label="Amenities">
            {amenities || 'None'}
          </Fact>
          <Fact icon={{ farmstand: 'package' }} label="Rentals">
            {a.rentals.length
              ? a.rentals.map((r) => `${r.name} × ${r.quantity}`).join(', ')
              : 'None'}
          </Fact>
        </dl>
        {a.publicInstructions && (
          <p className="vendor-booth-instructions">{a.publicInstructions}</p>
        )}
        {!!a.invoices.length && (
          <ul className="vendor-booth-invoices" aria-label="Booth invoices">
            {a.invoices.map((i) => (
              <li key={i.id}>
                <span className="vendor-booth-invoice-name">
                  <strong>Invoice {i.id}</strong>
                  <span>
                    {cancelled ||
                    ['VOID', 'CANCELED', 'CANCEL_PENDING'].includes(i.status)
                      ? 'No payment due'
                      : i.paidMinor >= i.totalMinor
                        ? `Paid in full · ${formatMoney(i.totalMinor, i.currency)}`
                        : `${formatMoney(i.totalMinor - i.paidMinor, i.currency)} due`}
                  </span>
                </span>
                <StatusBadge>{cancelled ? 'Cancelled' : i.status}</StatusBadge>
                {service.boothInvoices && (
                  <BoothInvoicePayment
                    api={service.boothInvoices}
                    invoiceId={i.id}
                    initialOpen={String(i.id) === requestedInvoice}
                    cancelled={cancelled}
                    onUpdated={onUpdated}
                    marketDate={starts.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {a.map ? (
          opened && (
            <div className="vendor-booth-map">
              <MarketMap
                definition={a.map.definition}
                spaces={a.map.spaces}
                selectedId={a.elementId}
                showBoothList={false}
              />
            </div>
          )
        ) : (
          <p className="markets-muted">
            The market map is awaiting publication.
          </p>
        )}
      </div>
    </Dropdown>
  );
}

async function unavailable() {
  return [];
}
