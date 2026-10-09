import { useCallback, useId, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import type {
  PreorderInput,
  MembershipState,
  AttendanceInput,
  Listing,
} from '@market/api';
import { Button, Checkbox, Field, Pagination, Select } from '@market/ui';
import type { VendorService } from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  RouteLink,
  TextField,
  date,
  integer,
  text,
  useRead,
} from './common';

function RuleFields({ rule }: { rule: PreorderInput }) {
  const ruleId = useId();
  return (
    <>
      <Field id={ruleId} label="Use a Vendor preorder override">
        <Checkbox id={ruleId} name="use-rule" defaultChecked={!!rule} />
      </Field>
      <div className="form-grid">
        <TextField
          name="opens-days"
          label="Opens days before occurrence"
          value={rule?.opensDaysBefore}
          required={false}
        />
        <TextField
          name="opens-time"
          label="Opening local time"
          value={rule?.opensTime}
          type="time"
          required={false}
        />
        <TextField
          name="closes-days"
          label="Closes days before occurrence"
          value={rule?.closesDaysBefore}
          required={false}
        />
        <TextField
          name="closes-time"
          label="Closing local time"
          value={rule?.closesTime}
          type="time"
          required={false}
        />
      </div>
      <p>
        These are occurrence-local times. The backend applies the Market
        override policy and returns effective UTC windows.
      </p>
    </>
  );
}
function ruleInput(data: FormData): PreorderInput {
  if (!data.has('use-rule')) return null;
  const opensTime = text(data, 'opens-time'),
    closesTime = text(data, 'closes-time');
  if (!/^\d{2}:\d{2}$/.test(opensTime) || !/^\d{2}:\d{2}$/.test(closesTime))
    throw new Error('Invalid time');
  return {
    opensDaysBefore: integer(data.get('opens-days'), { zero: true }),
    opensTime,
    closesDaysBefore: integer(data.get('closes-days'), { zero: true }),
    closesTime,
  };
}
export function Markets({
  service,
  id,
}: {
  service: VendorService;
  id?: string;
}) {
  const read = useCallback(() => service.memberships(), [service]);
  const query = useRead('memberships', read, !id);
  if (id) return <MarketDetail service={service} id={id} />;
  return (
    <>
      {service.boothAssignments && (
        <RouteLink to="/vendor/booths">Your booth assignments</RouteLink>
      )}
      <p>
        Business membership, attendance, listing approval, publication and
        occurrence offering are separate states.
      </p>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <DataTable
            label="Owned Market relationships"
            headings={['Market', 'Membership', 'Actions']}
          >
            {query.data.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  {m.market.name}
                  {service.context.source === 'backend' && (
                    <small>Relationship reference {m.id}</small>
                  )}
                </th>
                <td>{m.status}</td>
                <td>
                  <RouteLink to={`/vendor/markets/${encodeURIComponent(m.id)}`}>
                    Manage relationship
                  </RouteLink>
                </td>
              </tr>
            ))}
          </DataTable>
          {!query.data.length && <p>No Market relationships are available.</p>}
          <p>
            The backend caps this relationship projection at 1,000 rows. No
            total or cursor is provided.
          </p>
        </>
      )}
    </>
  );
}
function MarketDetail({ service, id }: { service: VendorService; id: string }) {
  const read = useCallback(() => service.membership(id), [service, id]);
  const query = useRead(`membership:${id}`, read);
  const can = mayCommand(service.context, 'ManageOwnMarketParticipation');
  return (
    <>
      <RouteLink to="/vendor/markets">Markets</RouteLink>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <div key={JSON.stringify(query.data)}>
          <h2>{query.data.membership.market.name}</h2>
          <p>
            Membership: {query.data.membership.status} · Version{' '}
            {query.data.membership.version}
          </p>
          {can && (
            <CommandForm
              title="Membership preorder default"
              validate={(d) => {
                ruleInput(d);
              }}
              run={(d) =>
                service.marketDefault(
                  id,
                  query.data!.membership.version,
                  ruleInput(d),
                )
              }
              onDone={query.refresh}
            >
              <RuleFields rule={query.data.membership.preorderDefault} />
            </CommandForm>
          )}
          <Occurrences
            service={service}
            state={query.data}
            refresh={query.refresh}
            can={can}
          />
          <DataTable
            label="Market variant listings"
            headings={['Variant', 'Listing approval', 'Publication', 'Actions']}
          >
            {query.data.listings.map((l) => (
              <PublicationRow
                key={l.id}
                service={service}
                listing={l}
                refresh={query.refresh}
              />
            ))}
          </DataTable>
          {can && (
            <ListingRequest
              service={service}
              membershipId={id}
              refresh={query.refresh}
            />
          )}
          {can && (
            <OfferingEditor
              service={service}
              state={query.data}
              refresh={query.refresh}
            />
          )}
          <DataTable
            label="Occurrence offerings"
            headings={[
              'Variant',
              'Offering',
              'Preorder',
              'Sales cap',
              'Effective window',
              'Provenance',
            ]}
          >
            {query.data.offerings.map((o) => (
              <tr key={o.id}>
                <th scope="row">{service.variantName(o.variantId)}</th>
                <td>{o.enabled ? 'Enabled' : 'Disabled'}</td>
                <td>{o.preorderEnabled ? 'Enabled' : 'Disabled'}</td>
                <td>{o.salesCap ?? 'Uncapped'}</td>
                <td>
                  {date(
                    o.effectivePreorderOpensAt,
                    o.windowProvenance.timezone,
                  )}{' '}
                  to{' '}
                  {date(
                    o.effectivePreorderClosesAt,
                    o.windowProvenance.timezone,
                  )}{' '}
                  ({o.windowProvenance.timezone})
                </td>
                <td>
                  {o.windowProvenance.source} · Version {o.version}
                </td>
              </tr>
            ))}
          </DataTable>
          <p>
            A sales cap limits units for this occurrence. It is separate from
            physical stock and allocations. Settled and held cap usage is not
            exposed by this Admin projection.
          </p>
        </div>
      )}
    </>
  );
}
function Occurrences({
  service,
  state,
  refresh,
  can,
}: {
  service: VendorService;
  state: MembershipState;
  refresh: () => void;
  can: boolean;
}) {
  const [range, setRange] = useState(() => ({
      from: new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
      through:
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) +
        'T00:00:00.000Z',
    })),
    [selected, setSelected] = useState<string>(''),
    [rangeError, setRangeError] = useState(false);
  const read = useCallback(
    () => service.occurrences(state.membership.id, range.from, range.through),
    [service, state.membership.id, range],
  );
  const query = useRead(`occurrences:${range.from}:${range.through}`, read);
  const occurrence = query.data?.find((o) => o.id === selected),
    participation = state.participations.find(
      (p) => p.occurrenceId === selected,
    );
  const input = (data: FormData): AttendanceInput => ({
    membershipId: state.membership.id,
    occurrenceId: selected,
    expectedVersion: participation?.version ?? null,
    status: text(data, 'attendance-status') as AttendanceInput['status'],
    pickupInstructions: text(data, 'pickup-instructions'),
    preorderOverride: ruleInput(data),
  });
  return (
    <>
      <h2>Occurrences and participation</h2>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget),
            from = `${text(d, 'from')}T00:00:00.000Z`,
            through = `${text(d, 'through')}T00:00:00.000Z`;
          const span = new Date(through).getTime() - new Date(from).getTime();
          if (!Number.isFinite(span) || span <= 0 || span > 366 * 86400000) {
            setRangeError(true);
            return;
          }
          setRangeError(false);
          setSelected('');
          setRange({ from, through });
        }}
      >
        <TextField
          name="from"
          label="From date (UTC)"
          type="date"
          value={range.from.slice(0, 10)}
        />
        <TextField
          name="through"
          label="Through date, exclusive (UTC)"
          type="date"
          value={range.through.slice(0, 10)}
        />
        <Button type="submit">Apply dates</Button>
      </form>
      {rangeError && (
        <p role="alert">Choose an increasing range of at most 366 days.</p>
      )}
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <DataTable
            label="Market occurrences"
            headings={[
              'Occurrence',
              'Venue',
              'Status',
              'Participation',
              'Actions',
            ]}
          >
            {query.data.map((o) => (
              <tr key={o.id}>
                <th scope="row">
                  {date(o.startsAt, o.timezone)}
                  <small>{o.timezone}</small>
                </th>
                <td>{o.venue}</td>
                <td>{o.status}</td>
                <td>
                  {state.participations.find((p) => p.occurrenceId === o.id)
                    ?.status ?? 'Not configured'}
                </td>
                <td>
                  {can && o.status === 'scheduled' && (
                    <Button onClick={() => setSelected(o.id)}>
                      Configure participation
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          {!query.data.length && <p>No occurrences in this range.</p>}
          <p>
            Occurrence projection is capped at 1,000 rows. Narrow the date range
            to inspect fewer records.
          </p>
        </>
      )}
      {can && occurrence && (
        <CommandForm
          key={selected}
          title="Participation"
          confirm={(data) =>
            text(data, 'attendance-status') === 'cancelled'
              ? 'Cancel participation in this occurrence? The backend controls offering and pickup eligibility. Existing orders remain backend managed.'
              : undefined
          }
          validate={(d) => {
            ruleInput(d);
          }}
          run={(d) => service.attendance(input(d))}
          onDone={refresh}
        >
          <p>
            {date(occurrence.startsAt, occurrence.timezone)} (
            {occurrence.timezone})
          </p>
          <Field id="attendance-status" label="Attendance">
            <Select
              id="attendance-status"
              name="attendance-status"
              defaultValue={participation?.status ?? 'planned'}
            >
              <option value="planned">Planned</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <TextField
            name="pickup-instructions"
            label="Pickup instructions"
            value={participation?.pickupInstructions ?? ''}
            required={false}
            maxLength={2000}
          />
          <RuleFields rule={participation?.preorderOverride ?? null} />
        </CommandForm>
      )}
    </>
  );
}
function ListingRequest({
  service,
  membershipId,
  refresh,
}: {
  service: VendorService;
  membershipId: string;
  refresh: () => void;
}) {
  const [skip, setSkip] = useState(0),
    [search, setSearch] = useState('');
  const read = useCallback(
    () => service.catalog(search, skip),
    [service, search, skip],
  );
  const query = useRead(`listing-selector:${search}:${skip}`, read);
  return (
    <>
      <form
        className="filter-bar"
        onSubmit={(event) => {
          event.preventDefault();
          setSkip(0);
          setSearch(text(new FormData(event.currentTarget), 'listing-search'));
        }}
      >
        <TextField
          name="listing-search"
          label="Search owned products for a listing"
          required={false}
        />
        <Button type="submit">Search variants</Button>
      </form>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <CommandForm
          title="Request listing"
          run={(d) => service.requestListing(membershipId, text(d, 'variant'))}
          onDone={refresh}
        >
          <Field id="listing-variant" label="Owned variant">
            <Select id="listing-variant" name="variant" required>
              <option value="">Choose a variant</option>
              {query.data.items.flatMap((p) =>
                p.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {p.name} · {v.name} · {v.sku}
                  </option>
                )),
              )}
            </Select>
          </Field>
          <p>
            A listing request remains pending until a Market administrator
            approves it.
          </p>
        </CommandForm>
      )}
      {query.data && (
        <Pagination
          hasPrevious={skip > 0}
          hasNext={skip + 20 < query.data.totalItems}
          onPrevious={() => setSkip(skip - 20)}
          onNext={() => setSkip(skip + 20)}
        />
      )}
    </>
  );
}
function PublicationRow({
  service,
  listing,
  refresh,
}: {
  service: VendorService;
  listing: Listing;
  refresh: () => void;
}) {
  const read = useCallback(
    () => service.publication(listing.id),
    [service, listing.id],
  );
  const query = useRead(`publication:${listing.id}`, read);
  const done = () => {
    query.refresh();
    refresh();
  };
  return (
    <tr>
      <th scope="row">Variant reference {listing.variantId}</th>
      <td>{listing.status}</td>
      <td>
        <ReadState {...query} retry={query.refresh} />
        {query.data?.state.replaceAll('_', ' ').toLowerCase()}
      </td>
      <td>
        {mayCommand(service.context, 'ManageCatalogPublication') && (
          <>
            {listing.status === 'approved' && (
              <CommandForm
                title="Publish listing"
                run={() => service.publish(listing.id)}
                onDone={done}
                submitLabel="Publish"
              >
                <p>Publish this approved listing to its Market.</p>
              </CommandForm>
            )}
            <CommandForm
              title="Unpublish listing"
              confirm="Unpublish this listing from its Market? Existing orders remain backend managed."
              run={() => service.unpublish(listing.id)}
              onDone={done}
              submitLabel="Review unpublish"
            >
              <p>Remove publication for this listing.</p>
            </CommandForm>
          </>
        )}
      </td>
    </tr>
  );
}
function OfferingEditor({
  service,
  state,
  refresh,
}: {
  service: VendorService;
  state: MembershipState;
  refresh: () => void;
}) {
  const [attendance, setAttendance] = useState(''),
    [listing, setListing] = useState('');
  const p = state.participations.find((p) => p.id === attendance),
    l = state.listings.find((l) => l.id === listing),
    existing = state.offerings.find(
      (o) => o.participationId === attendance && o.listingId === listing,
    );
  return (
    <section>
      <h2>Configure occurrence offering</h2>
      <Field id="offering-attendance" label="Participation">
        <Select
          id="offering-attendance"
          value={attendance}
          onChange={(e) => setAttendance(e.target.value)}
        >
          <option value="">Choose participation</option>
          {state.participations
            .filter((p) => p.status !== 'cancelled')
            .map((p) => (
              <option key={p.id} value={p.id}>
                {date(
                  state.occurrences.find((o) => o.id === p.occurrenceId)
                    ?.startsAt,
                )}{' '}
                · {p.status}
              </option>
            ))}
        </Select>
      </Field>
      <Field id="offering-listing" label="Approved listing">
        <Select
          id="offering-listing"
          value={listing}
          onChange={(e) => setListing(e.target.value)}
        >
          <option value="">Choose approved listing</option>
          {state.listings
            .filter((l) => l.status === 'approved')
            .map((l) => (
              <option key={l.id} value={l.id}>
                {service.variantName(l.variantId)}
              </option>
            ))}
        </Select>
      </Field>
      {p && l && (
        <CommandForm
          key={`${attendance}:${listing}:${existing?.version}`}
          title="Offering settings"
          validate={(d) => {
            if (text(d, 'sales-cap')) integer(d.get('sales-cap'));
          }}
          run={(d) =>
            service.offering({
              participationId: p.id,
              listingId: l.id,
              variantId: l.variantId,
              expectedVersion: existing?.version ?? null,
              enabled: d.has('offering-enabled'),
              preorderEnabled: d.has('preorder-enabled'),
              salesCap: text(d, 'sales-cap')
                ? integer(d.get('sales-cap'))
                : null,
            })
          }
          onDone={refresh}
        >
          <Field id="offering-enabled" label="Offering enabled">
            <Checkbox
              id="offering-enabled"
              name="offering-enabled"
              defaultChecked={existing?.enabled ?? true}
            />
          </Field>
          <Field id="preorder-enabled" label="Preorder enabled">
            <Checkbox
              id="preorder-enabled"
              name="preorder-enabled"
              defaultChecked={existing?.preorderEnabled ?? false}
            />
          </Field>
          <TextField
            name="sales-cap"
            label="Occurrence sales cap"
            value={existing?.salesCap ?? ''}
            required={false}
          />
          <p>
            Leave blank for uncapped. A cap must be a positive whole number. It
            does not change physical inventory.
          </p>
        </CommandForm>
      )}
    </section>
  );
}
