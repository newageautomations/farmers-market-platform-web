import { cardClassName } from '@market/ui/presentation';
import { Card, Button, Input, Select } from '@market/ui';
import { useCallback, useId, useState } from 'react';
import type {
  ApplicantContact,
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
  DirectoryEntry,
  RentalDetails,
} from '@market/api';
import { Check, Control, Entry, moneyLabel } from './common';
import { RouteLink, date, useRead } from '../common';
import { MarketDialog, StatusBadge } from '../presentation';
const empty: ApplicantContact = {
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  description: '',
  category: '',
};
export function Directory({
  data,
  run,
  canManage,
  view = 'list',
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  view?: 'list' | 'add';
}) {
  const [selected, setSelected] = useState<number | null>(null),
    [contact, setContact] = useState(empty),
    [notes, setNotes] = useState(''),
    [vendor, setVendor] = useState('');
  const [linkReason, setLinkReason] = useState('');
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const row = data.directory?.find((d) => d.id === selected);
  return (
    <>
      <p>
        Add a business that does not have a platform account so you can reserve
        booths, track attendance, and manage its market participation. You can
        link it to a platform vendor later.
      </p>
      {view === 'list' && canManage && (
        <RouteLink to="/market/directory/new">Add external business</RouteLink>
      )}
      {view === 'list' && (
        <ul className="ops-record-list">
          {data.directory?.map((d) => (
            <Card as="li" spacing="contained" key={d.id}>
              <Button
                variant="secondary"
                size="compact"
                type="button"
                onClick={() => {
                  setSelected(d.id);
                  setContact(d.contact);
                  setNotes(d.managerNotes);
                  setVendor('');
                  setLinkReason('');
                }}
              >
                {d.contact.businessName}
              </Button>
              <p>
                {(
                  d.linkState ??
                  (d.linkedVendorId ? 'LEGACY_UNVERIFIED' : 'EXTERNAL')
                )
                  .toLowerCase()
                  .replaceAll('_', ' ')}{' '}
                · {d.contact.email}
              </p>
            </Card>
          ))}
        </ul>
      )}
      {canManage && (view === 'add' || row) && (
        <DirectoryEditorShell
          modal={view === 'list'}
          title="Edit Business"
          busy={busy}
          close={() => setSelected(null)}
          actions={
            <Button type="submit" form={formId} disabled={busy}>
              Save business
            </Button>
          }
        >
          <form
            id={formId}
            className={cardClassName({
              className: 'ops-editor',
              surface: view === 'list' ? 'embedded' : 'card',
            })}
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              let saved;
              try {
                saved = await run({
                  action: 'SAVE_DIRECTORY',
                  id: row?.id,
                  expectedRevision: row?.revision,
                  data: {
                    contact,
                    managerNotes: notes,
                  },
                });
                if (saved && vendor) {
                  const entry = saved as DirectoryEntry;
                  saved = await run({
                    action: 'REQUEST_VENDOR_LINK',
                    id: entry.id,
                    expectedRevision: entry.revision,
                    data: { vendorId: Number(vendor), reason: linkReason },
                  });
                }
              } finally {
                setBusy(false);
              }
              if (!saved) return;
              setSelected(null);
              setContact(empty);
              setNotes('');
              setVendor('');
            }}
          >
            <fieldset disabled={busy}>
              <h2 className="ui-section-title-dashboard">
                {row ? 'Edit business' : 'Add external business'}
              </h2>
              <div className="form-grid">
                {Object.entries(contact).map(([key, value]) => (
                  <Entry
                    key={key}
                    label={key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    value={value}
                    required={[
                      'businessName',
                      'firstName',
                      'lastName',
                      'email',
                    ].includes(key)}
                    type={
                      key === 'email'
                        ? 'email'
                        : key === 'phone'
                          ? 'tel'
                          : 'text'
                    }
                    maxLength={
                      key === 'description'
                        ? 5000
                        : key === 'email'
                          ? 254
                          : ['firstName', 'lastName'].includes(key)
                            ? 100
                            : 200
                    }
                    onChange={(v) => setContact((c) => ({ ...c, [key]: v }))}
                  />
                ))}
              </div>
              <Entry
                label="Private manager notes"
                value={notes}
                onChange={setNotes}
              />
              <p>
                A link request requires confirmation from an authorized Vendor
                owner. Requesting a correction revokes the prior link's
                authority while preserving history.
              </p>
              <Control label="Request platform Vendor verification or correction">
                {(id) => (
                  <Select
                    id={id}
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                  >
                    <option value="">Save without a link request</option>
                    {data.eligibleVendors?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Control>
              {vendor && (
                <Entry
                  label="Reason for the link or correction request"
                  value={linkReason}
                  onChange={setLinkReason}
                />
              )}
              {data.linkRequests?.some(
                (r) => r.directoryId === row?.id && r.status === 'PENDING',
              ) && <p>A link request is awaiting Vendor confirmation.</p>}
              {view === 'add' && (
                <Button type="submit" variant="primary" size="compact">
                  Save business
                </Button>
              )}
            </fieldset>
          </form>
        </DirectoryEditorShell>
      )}
    </>
  );
}
function DirectoryEditorShell({
  modal,
  title,
  busy,
  close,
  children,
  actions,
}: {
  modal: boolean;
  title: string;
  busy: boolean;
  close: () => void;
  children: import('react').ReactNode;
  actions: import('react').ReactNode;
}) {
  return modal ? (
    <MarketDialog
      open
      title={title}
      busy={busy}
      onClose={close}
      actions={actions}
    >
      {children}
    </MarketDialog>
  ) : (
    <>{children}</>
  );
}
export function Rentals({
  api,
  data,
  run,
  canManage,
  view = 'list',
}: {
  api?: MarketOperationsApi;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  view?: 'list' | 'add';
}) {
  const initial: RentalDetails = {
    name: '',
    description: '',
    enabled: true,
    priceMinor: 0,
    currency: 'USD',
    defaultQuantity: 0,
    maxQuantity: 10,
    capacity: null,
    requiredAmenity: null,
    sortOrder: 0,
  };
  const [selected, setSelected] = useState<number | null>(null),
    [details, setDetails] = useState(initial),
    [price, setPrice] = useState('0.00'),
    [priceError, setPriceError] = useState('');
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
  const allocations =
    stock.data?.allocations ?? (api ? undefined : data.allocations);
  const row = data.rentals?.find((r) => r.id === selected),
    edit = (patch: Partial<RentalDetails>) =>
      setDetails((d) => ({ ...d, ...patch }));
  return (
    <section>
      <p>
        Offer equipment and add-ons that vendors can request for a market date,
        with clear prices and availability limits.
      </p>
      {view === 'list' && canManage && (
        <RouteLink to="/market/rentals/new">Add rental equipment</RouteLink>
      )}
      {view === 'list' && (
        <>
          <Control label="Stock for Market Date">
            {(id) => (
              <Select
                id={id}
                value={occurrenceId}
                onChange={(e) => setOccurrenceId(Number(e.target.value))}
              >
                <option value={0}>Choose a market date</option>
                {data.occurrences.map((o) => (
                  <option key={o.id} value={o.id}>
                    {date(o.startsAt)}
                  </option>
                ))}
              </Select>
            )}
          </Control>
          <ul className="ops-record-list market-rental-grid">
            {data.rentals?.map((r) => (
              <Card as="li" spacing="contained" key={r.id}>
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  onClick={() => {
                    setSelected(r.id);
                    setDetails(r.details);
                    setPrice((r.details.priceMinor / 100).toFixed(2));
                  }}
                >
                  {r.details.name}
                </Button>
                <p>{moneyLabel(r.details.priceMinor, r.details.currency)}</p>
                <p>
                  <StatusBadge>
                    {r.details.enabled ? 'available' : 'disabled'}
                  </StatusBadge>
                </p>
                <p className="market-stock">
                  {r.details.capacity === null
                    ? 'Unlimited stock'
                    : !occurrenceId
                      ? `Total stock: ${r.details.capacity}`
                      : allocations === undefined
                        ? `Stock unavailable / ${r.details.capacity}`
                        : `Current stock: ${Math.max(0, r.details.capacity - allocations.filter((a) => a.optionId === r.id && a.occurrenceId === occurrenceId).reduce((sum, a) => sum + a.quantity, 0))} / ${r.details.capacity}`}
                </p>
              </Card>
            ))}
          </ul>
        </>
      )}
      {canManage && (view === 'add' || row) && (
        <form
          className={cardClassName({ className: 'ops-editor' })}
          onSubmit={async (e) => {
            e.preventDefault();
            let priceMinor: number;
            try {
              priceMinor = usdToMinor(price);
              setPriceError('');
            } catch {
              setPriceError(
                'Enter a USD price from $0.00 to $1,000,000.00 with up to two decimal places.',
              );
              return;
            }
            const saved = await run({
              action: 'SAVE_RENTAL',
              id: row?.id,
              expectedRevision: row?.revision,
              data: {
                details: {
                  ...details,
                  priceMinor,
                  currency: 'USD',
                },
              },
            });
            if (!saved) return;
            setSelected(null);
            setDetails(initial);
            setPrice('0.00');
          }}
        >
          <h2 className="ui-section-title-dashboard">
            {row ? 'Edit rental equipment' : 'Add rental equipment'}
          </h2>
          {priceError && (
            <p className="alert ui-alert ui-alert-error" role="alert">
              {priceError}
            </p>
          )}
          <div className="form-grid">
            <Entry
              label="Rental name"
              info="This name appears to vendors when they request equipment."
              value={details.name}
              onChange={(v) => edit({ name: v })}
              required
            />
            <Entry
              label="Description"
              maxLength={2000}
              info="Describe what is included with this rental."
              value={details.description}
              onChange={(v) => edit({ description: v })}
            />
            <Control
              label="Price (USD)"
              info="The price in US dollars for one unit at one market occurrence."
            >
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={price}
                  required
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  onChange={(e) => {
                    if (/^\d*(\.\d{0,2})?$/.test(e.target.value))
                      setPrice(e.target.value);
                  }}
                  onBlur={() => {
                    if (price && Number.isFinite(Number(price)))
                      setPrice(Number(price).toFixed(2));
                  }}
                />
              )}
            </Control>
            <Entry
              label="Default quantity"
              info="The quantity preselected for applicants before they make changes."
              type="number"
              min={0}
              max={1000}
              value={details.defaultQuantity}
              onChange={(v) => edit({ defaultQuantity: Number(v) })}
            />
            <Entry
              label="Maximum per Vendor"
              info="The largest quantity one vendor may request for a single market date."
              type="number"
              min={1}
              max={1000}
              value={details.maxQuantity}
              onChange={(v) => edit({ maxQuantity: Number(v) })}
            />
            <Entry
              label="Capacity per occurrence, blank for unlimited"
              info="The total quantity available across all vendors on each market date."
              type="number"
              min={0}
              value={details.capacity ?? ''}
              onChange={(v) => edit({ capacity: v === '' ? null : Number(v) })}
            />
            <Entry
              label="Sort order"
              info="Lower numbers appear first in the list of available rentals."
              type="number"
              min={0}
              value={details.sortOrder}
              onChange={(v) => edit({ sortOrder: Number(v) })}
            />
            <Control
              label="Required booth amenity"
              info="The booth must have this feature to support the rental."
            >
              {(id) => (
                <Select
                  id={id}
                  value={details.requiredAmenity ?? ''}
                  onChange={(e) =>
                    edit({ requiredAmenity: e.target.value || null })
                  }
                >
                  <option value="">None</option>
                  {['ELECTRICITY', 'WATER', 'VEHICLE', 'FOOD_TRUCK'].map(
                    (a) => (
                      <option key={a} value={a}>
                        {a.toLowerCase().replaceAll('_', ' ')}
                      </option>
                    ),
                  )}
                </Select>
              )}
            </Control>
          </div>
          <Check
            label="Available to applicants"
            info="Turn this on to let applicants request this equipment."
            checked={details.enabled}
            onChange={(v) => edit({ enabled: v })}
          />
          <Button type="submit" variant="primary" size="compact">
            Save rental
          </Button>
          {row && (
            <Button
              variant="secondary"
              size="compact"
              type="button"
              onClick={() => setSelected(null)}
            >
              Cancel editing
            </Button>
          )}
        </form>
      )}
    </section>
  );
}
export function usdToMinor(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Enter a price with up to two decimal places.');
  const [dollars, cents = ''] = value.split('.');
  const minor = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor > 100000000)
    throw new Error('Price must be between $0.00 and $1,000,000.00.');
  return minor;
}
