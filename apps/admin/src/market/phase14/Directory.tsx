import { useState } from 'react';
import type {
  ApplicantContact,
  MarketOperationsData,
  OperationsCommand,
  RentalDetails,
} from '@market/api';
import { Check, Control, Entry, moneyLabel } from './common';
import { RouteLink } from '../common';
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
            <li key={d.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(d.id);
                  setContact(d.contact);
                  setNotes(d.managerNotes);
                  setVendor(String(d.linkedVendorId ?? ''));
                }}
              >
                {d.contact.businessName}
              </button>
              <p>
                {d.kind.toLowerCase().replaceAll('_', ' ')} · {d.contact.email}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canManage && (view === 'add' || row) && (
        <form
          className="ops-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            const saved = await run({
              action: 'SAVE_DIRECTORY',
              id: row?.id,
              expectedRevision: row?.revision,
              data: {
                contact,
                managerNotes: notes,
                linkedVendorId: vendor ? Number(vendor) : null,
                confirmLink: !!vendor,
              },
            });
            if (!saved) return;
            setSelected(null);
            setContact(empty);
            setNotes('');
            setVendor('');
          }}
        >
          <h2>{row ? 'Edit business' : 'Add external business'}</h2>
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
                type={key === 'email' ? 'email' : 'text'}
                onChange={(v) => setContact((c) => ({ ...c, [key]: v }))}
              />
            ))}
          </div>
          <Entry
            label="Private manager notes"
            value={notes}
            onChange={setNotes}
          />
          <Control label="Confirm platform Vendor link">
            {(id) => (
              <select
                id={id}
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              >
                <option value="">External business</option>
                {data.eligibleVendors?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </Control>
          <button>Save business</button>
          {row && (
            <button type="button" onClick={() => setSelected(null)}>
              Cancel editing
            </button>
          )}
        </form>
      )}
    </>
  );
}
export function Rentals({
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
        <ul className="ops-record-list">
          {data.rentals?.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(r.id);
                  setDetails(r.details);
                  setPrice((r.details.priceMinor / 100).toFixed(2));
                }}
              >
                {r.details.name}
              </button>
              <p>
                {moneyLabel(r.details.priceMinor, r.details.currency)} ·
                Capacity {r.details.capacity ?? 'unlimited'} ·{' '}
                {r.details.enabled ? 'available' : 'disabled'}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canManage && (view === 'add' || row) && (
        <form
          className="ops-editor"
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
          <h2>{row ? 'Edit rental equipment' : 'Add rental equipment'}</h2>
          {priceError && <p role="alert">{priceError}</p>}
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
              info="Describe what is included with this rental."
              value={details.description}
              onChange={(v) => edit({ description: v })}
            />
            <Control
              label="Price (USD)"
              info="The price in US dollars for one unit at one market occurrence."
            >
              {(id) => (
                <input
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
                <select
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
                </select>
              )}
            </Control>
          </div>
          <Check
            label="Available to applicants"
            info="Turn this on to let applicants request this equipment."
            checked={details.enabled}
            onChange={(v) => edit({ enabled: v })}
          />
          <button>Save rental</button>
          {row && (
            <button type="button" onClick={() => setSelected(null)}>
              Cancel editing
            </button>
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
