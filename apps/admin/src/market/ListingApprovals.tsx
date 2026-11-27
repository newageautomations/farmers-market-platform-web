import { useCallback, useId, useMemo, useState } from 'react';
import {
  safeError,
  type AppError,
  type MarketListingApproval,
} from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Alert, EmptyState, ErrorState, Field, UtilityIcon } from '@market/ui';
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
import { MarketsPagination } from '../vendor/MarketsPagination';
import type { MarketService } from './service';
import { StatusBadge } from './presentation';
import { go, ReadState, useRead } from './common';
import { ListingReview } from './ListingReview';
import { plural } from './operations-data';
import '@market/ui/farmstand.css';
import '@market/ui/workspace.css';
import './market-occurrences.css';
// Listing thumbnails reuse the Catalog's product photo cell, as the Vendor
// page's Listing approvals tab does.
import '../vendor/catalog-workspace.css';
import './vendors.css';

const PAGE = 20;
const approvals = [
  ['all', 'All approvals'],
  ['pending', 'Pending review'],
  ['approved', 'Approved'],
  ['withdrawn', 'Denied'],
] as const;
type Approval = (typeof approvals)[number][0];
/** Pending first, as a manager works through them. */
const approvalOrder: Record<string, number> = {
  pending: 0,
  approved: 1,
  withdrawn: 2,
};
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function initialApproval(): Approval {
  const value =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('status');
  return approvals.some(([v]) => v === value) ? (value as Approval) : 'all';
}

/** Every page of the Market-wide listing read, so filters and sorting cover all rows. */
async function readAll(service: MarketService) {
  const items: MarketListingApproval[] = [];
  for (let skip = 0; ; skip += 100) {
    const page = await service.listingApprovals({ take: 100, skip });
    items.push(...page.items);
    if (!page.items.length || items.length >= page.totalItems) return items;
  }
}

/**
 * Products every Vendor wants to sell at this Market, in one table. Approving
 * or denying here uses the same `approveMarketListing` command and Review
 * dialog as a Vendor's Listing approvals tab, which stays in place.
 * Why a new page: the existing listing table lives inside one Vendor's detail
 * and reads one membership at a time; this composes the same shared table,
 * filters, badges and dialog over the Market-wide read.
 */
export function ListingApprovals({ service }: { service: MarketService }) {
  const id = useId();
  const canReview = mayMarketCommand(
    service.context,
    'ManageOwnMarketListings',
  );
  const read = useCallback(() => readAll(service), [service]);
  const listings = useRead(`${service.readKey}:listing-approvals`, read);
  const [search, setSearch] = useState('');
  const [approval, setApproval] = useState<Approval>(initialApproval);
  const [sort, setSort] = useState<'vendor' | 'approval'>('approval');
  const [page, setPage] = useState(0);
  const [reviewing, setReviewing] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<AppError>();

  const rows = listings.data ?? [];
  const pending = rows.filter((r) => r.listing.status === 'pending').length;
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const vendor = (r: MarketListingApproval) => r.membership.vendor.name;
    const product = (r: MarketListingApproval) =>
      `${r.listing.variant.product.name} ${r.listing.variant.name}`;
    return (listings.data ?? [])
      .filter(
        (r) =>
          (approval === 'all' || r.listing.status === approval) &&
          `${vendor(r)} ${product(r)} ${r.listing.variant.sku} ${r.listing.variant.product.category ?? ''}`
            .toLocaleLowerCase()
            .includes(term),
      )
      .sort(
        (a, b) =>
          (sort === 'approval'
            ? (approvalOrder[a.listing.status] ?? 3) -
              (approvalOrder[b.listing.status] ?? 3)
            : 0) ||
          collator.compare(vendor(a), vendor(b)) ||
          collator.compare(product(a), product(b)),
      );
  }, [listings.data, search, approval, sort]);
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / PAGE) - 1),
  );
  const shown = visible.slice(current * PAGE, (current + 1) * PAGE);
  const open = rows.find((r) => r.listing.id === reviewing);

  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }
  async function approve(row: MarketListingApproval) {
    setBusy(row.listing.id);
    setError(undefined);
    try {
      await service.approveListing(
        row.listing.id,
        row.listing.version,
        'approved',
      );
    } catch (cause) {
      setError(safeError(cause));
    } finally {
      setBusy(undefined);
      listings.refresh();
    }
  }

  return (
    <WorkspaceFrame
      icon="circle-check"
      title="Listing approvals"
      description="Products vendors want to sell at your market. Approve them so vendors can list them on your storefront and open them for preorder."
      tabs={[]}
      value="list"
      onChange={() => undefined}
      className="market-occurrences listing-approvals farmstand-controls"
    >
      <FarmstandPanel
        as="section"
        className="markets-list"
        aria-label="Vendor listings"
      >
        <h2>Vendor listings</h2>
        <div className="markets-filters">
          <Field
            id={`${id}-search`}
            label={<span className="sr-only">Search listings</span>}
          >
            <FarmstandSearch
              id={`${id}-search`}
              placeholder="Search vendors or products..."
              value={search}
              onChange={(e) => changeFilter(() => setSearch(e.target.value))}
            />
          </Field>
          <Field
            id={`${id}-approval`}
            label={<span className="sr-only">Approval</span>}
          >
            <FarmstandSelect
              id={`${id}-approval`}
              value={approval}
              onChange={(e) =>
                changeFilter(() => setApproval(e.target.value as Approval))
              }
            >
              {approvals.map(([value, label]) => (
                <option key={value} value={value}>
                  {value === 'pending' && listings.data
                    ? `${label} (${pending})`
                    : label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field
            id={`${id}-sort`}
            label={<span className="sr-only">Sort listings</span>}
          >
            <FarmstandSelect
              id={`${id}-sort`}
              value={sort}
              onChange={(e) =>
                changeFilter(() =>
                  setSort(e.target.value as 'vendor' | 'approval'),
                )
              }
            >
              <option value="approval">Sort by approval</option>
              <option value="vendor">Sort by vendor: A to Z</option>
            </FarmstandSelect>
          </Field>
        </div>
        {error && <ErrorState error={error} />}
        <ReadState
          loading={listings.loading && !listings.data}
          error={listings.error}
          retry={listings.refresh}
        />
        {listings.data &&
          (shown.length ? (
            <div className="vendor-detail-table">
              <FarmstandTable
                label="Vendor listings"
                wide
                headings={[
                  'Product',
                  'Vendor',
                  'Category',
                  'Approval',
                  'Storefront',
                  '',
                ]}
              >
                {shown.map((row) => {
                  const { listing, membership } = row;
                  const name = listing.variant.product.name;
                  const approvable =
                    canReview &&
                    listing.status === 'pending' &&
                    membership.status === 'approved';
                  return (
                    <tr key={listing.id}>
                      <th scope="row">
                        <div className="catalog-product-identity">
                          <div className="catalog-product-photo">
                            {listing.variant.image ? (
                              <img
                                src={listing.variant.image}
                                alt=""
                                width="42"
                                height="42"
                                loading="lazy"
                              />
                            ) : (
                              <UtilityIcon name="store" />
                            )}
                          </div>
                          <div className="vendor-contact-cell">
                            <span>{name}</span>
                            <small>
                              {listing.variant.name} · {listing.variant.sku}
                            </small>
                          </div>
                        </div>
                      </th>
                      <td>
                        <div className="vendor-contact-cell">
                          <span>{membership.vendor.name}</span>
                          {membership.status !== 'approved' && (
                            <small>Membership {membership.status}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        {listing.variant.product.category ?? (
                          <span className="markets-muted">Uncategorized</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge>
                          {listing.status === 'withdrawn'
                            ? 'denied'
                            : listing.status}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge>{listing.publication.state}</StatusBadge>
                      </td>
                      <td>
                        <div className="listing-approvals-actions">
                          {approvable && (
                            <FarmstandButton
                              size="compact"
                              loading={busy === listing.id}
                              disabled={!!busy}
                              aria-label={`Approve ${name} from ${membership.vendor.name}`}
                              onClick={() => void approve(row)}
                            >
                              <FarmstandIcon name="circle-check" />
                              Approve
                            </FarmstandButton>
                          )}
                          <FarmstandButton
                            variant="secondary"
                            size="compact"
                            disabled={!!busy}
                            aria-label={`${canReview && listing.status === 'pending' ? 'Review' : 'View'} ${name} from ${membership.vendor.name}`}
                            onClick={() => setReviewing(listing.id)}
                          >
                            {canReview && listing.status === 'pending'
                              ? 'Review'
                              : 'View'}
                            <FarmstandIcon name="chevron-right" />
                          </FarmstandButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </FarmstandTable>
              <MarketsPagination
                label="Listing pages"
                summary={`${plural(visible.length, 'listing')}. Showing ${current * PAGE + 1} to ${Math.min((current + 1) * PAGE, visible.length)}.`}
                hasPrevious={current > 0}
                hasNext={(current + 1) * PAGE < visible.length}
                onPrevious={() => setPage(current - 1)}
                onNext={() => setPage(current + 1)}
              />
            </div>
          ) : (
            <EmptyState
              title={
                rows.length
                  ? approval === 'pending' && !pending
                    ? 'Nothing waiting for approval'
                    : 'No matching listings'
                  : 'No listings yet'
              }
            >
              <p>
                {rows.length
                  ? approval === 'pending' && !pending
                    ? 'Every product vendors have submitted has a decision.'
                    : 'Try another search or approval filter.'
                  : 'Products vendors submit to your market appear here.'}
              </p>
            </EmptyState>
          ))}
        {canReview &&
          pending > 0 &&
          rows.some(
            (r) =>
              r.listing.status === 'pending' &&
              r.membership.status !== 'approved',
          ) && (
            <Alert severity="info">
              Some vendors' memberships are not approved yet. Approve the vendor
              first, then their products.{' '}
              <FarmstandLink
                appearance="text"
                href="/market/vendors"
                onClick={(event) => {
                  if (event.button || event.metaKey || event.ctrlKey) return;
                  event.preventDefault();
                  go('/market/vendors');
                }}
              >
                <span className="farmstand-text-link">Open vendors</span>
              </FarmstandLink>
            </Alert>
          )}
      </FarmstandPanel>
      {open && (
        <ListingReview
          key={open.listing.id}
          service={service}
          listing={open.listing}
          canReview={canReview}
          membershipApproved={open.membership.status === 'approved'}
          onClose={() => setReviewing(undefined)}
          onSaved={() => {
            setReviewing(undefined);
            listings.refresh();
          }}
        />
      )}
    </WorkspaceFrame>
  );
}
