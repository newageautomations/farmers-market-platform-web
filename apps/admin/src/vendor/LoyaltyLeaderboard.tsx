import { MarketsPagination as Pagination } from './MarketsPagination';
import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { EmptyState, Field, UtilityIcon } from '@market/ui';
import {
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { go, ReadState, useRead } from './common';
import { customerSpend } from './customers-data';
import {
  filterLeaderboard,
  readLoyaltyLeaderboard,
} from './loyalty-leaderboard-data';
import type { VendorService } from './service';
import './loyalty-leaderboard.css';
import { LoyaltyIcon } from './LoyaltyIcon';

function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(event.currentTarget.getAttribute('href')!);
}

/** Feature composition: shared tables and controls do not supply a ranked podium or selection preview. */
export function LoyaltyLeaderboard({ service }: { service: VendorService }) {
  const load = useCallback(() => readLoyaltyLeaderboard(service), [service]);
  const query = useRead(`loyalty-leaderboard:${service.vendorId}`, load);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('highest');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number>();
  const visible = useMemo(
    () => filterLeaderboard(query.data ?? [], search, sort),
    [query.data, search, sort],
  );
  const shown = visible.slice(page * 20, (page + 1) * 20);
  const customer =
    query.data?.find((row) => row.id === selected) ??
    shown[0] ??
    query.data?.[0];
  const top = query.data?.slice(0, 3) ?? [];
  function select(id: number) {
    setSelected(id);
  }
  return (
    <section className="loyalty-leaderboard" aria-label="Rewards leaderboard">
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          {!!top.length && (
            <ol className="leaderboard-podium" aria-label="Top three customers">
              {top.map((row) => (
                <FarmstandPanel
                  as="li"
                  key={row.id}
                  className="leaderboard-place"
                  data-place={row.rank}
                >
                  <span
                    className="leaderboard-medal"
                    aria-label={`Rank ${row.rank}`}
                  >
                    <LoyaltyIcon name={row.rank === 1 ? 'crown' : 'award'} />
                    <strong>{row.rank}</strong>
                  </span>
                  <span className="leaderboard-avatar">
                    <FarmstandIcon name="user-round" />
                  </span>
                  <span className="leaderboard-podium-name">
                    {row.customer}
                  </span>
                  {row.relationship && (
                    <FarmstandLink
                      appearance="text"
                      className="leaderboard-podium-link"
                      aria-label={`View ${row.customer}'s profile`}
                      href={`/vendor/customers/${encodeURIComponent(row.relationship.id)}`}
                      onClick={navigate}
                    >
                      <span className="sr-only">View customer profile</span>
                    </FarmstandLink>
                  )}
                  <div className="leaderboard-podium-facts">
                    <span>
                      <LoyaltyIcon name="coins" />{' '}
                      <strong>{Number(row.earned).toLocaleString()}</strong> pts
                    </span>
                    <span>
                      <FarmstandIcon name="shopping-cart" /> {row.orders} orders
                    </span>
                  </div>
                </FarmstandPanel>
              ))}
            </ol>
          )}
          <div
            className={`leaderboard-columns${customer ? '' : ' leaderboard-columns-full'}`}
          >
            <FarmstandPanel className="leaderboard-table-panel">
              <div className="leaderboard-controls">
                <Field
                  id="leaderboard-search"
                  label="Search customer name or email"
                >
                  <FarmstandSearch
                    id="leaderboard-search"
                    placeholder="Search customer name or email"
                    maxLength={200}
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(0);
                      setSelected(undefined);
                    }}
                  />
                </Field>
                <Field id="leaderboard-sort" label="Sort by">
                  <FarmstandSelect
                    id="leaderboard-sort"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(0);
                      setSelected(undefined);
                    }}
                  >
                    <option value="highest">Highest points</option>
                    <option value="lowest">Lowest points</option>
                    <option value="orders">Most completed orders</option>
                    <option value="name">Name (A to Z)</option>
                  </FarmstandSelect>
                </Field>
              </div>
              <FarmstandTable
                label="Customer points ranking"
                headings={[
                  'Rank',
                  'Customer',
                  'Contact',
                  'Net lifetime points',
                  'Completed orders',
                  'Total spent',
                ]}
              >
                {shown.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    aria-label={`View ${row.customer}`}
                    aria-selected={row.id === customer?.id}
                    onClick={() => select(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        select(row.id);
                      }
                    }}
                    className={
                      row.id === customer?.id
                        ? 'leaderboard-selected'
                        : undefined
                    }
                  >
                    <td>
                      <span className="leaderboard-rank" data-place={row.rank}>
                        #{row.rank}
                      </span>
                    </td>
                    <th scope="row">
                      <strong className="farmstand-text-link">
                        {row.customer}
                      </strong>
                    </th>
                    <td>{row.relationship?.emailAddress || 'Unavailable'}</td>
                    <td>{Number(row.earned).toLocaleString()}</td>
                    <td>{row.orders}</td>
                    <td>
                      <span className="leaderboard-spend">
                        {row.relationship
                          ? customerSpend(row.relationship)
                          : 'Unavailable'}
                        <FarmstandIcon name="chevron-right" />
                      </span>
                    </td>
                  </tr>
                ))}
              </FarmstandTable>
              {!shown.length && (
                <EmptyState
                  title={
                    query.data.length
                      ? 'No matching customers'
                      : 'No qualifying customers yet'
                  }
                >
                  <p>
                    {query.data.length
                      ? 'Try another customer name or email.'
                      : 'Customers will appear here as they earn loyalty points.'}
                  </p>
                </EmptyState>
              )}
              <Pagination
                label="Leaderboard pages"
                summary={`Showing ${shown.length ? page * 20 + 1 : 0} to ${page * 20 + shown.length} of ${visible.length}`}
                hasPrevious={page > 0}
                hasNext={(page + 1) * 20 < visible.length}
                onPrevious={() => {
                  setPage(page - 1);
                  setSelected(undefined);
                }}
                onNext={() => {
                  setPage(page + 1);
                  setSelected(undefined);
                }}
              />
            </FarmstandPanel>
            {customer && (
              <FarmstandPanel
                as="section"
                className="leaderboard-preview"
                aria-label={`${customer.customer} details`}
              >
                <div className="leaderboard-identity">
                  <span className="leaderboard-avatar">
                    <FarmstandIcon name="user-round" />
                  </span>
                  <div>
                    <h2>{customer.customer}</h2>
                    <p>
                      {customer.relationship?.emailAddress ||
                        'Email unavailable'}
                    </p>
                  </div>
                </div>
                <dl className="leaderboard-facts">
                  <div>
                    <dt>
                      <UtilityIcon name="trophy" /> Rank
                    </dt>
                    <dd>
                      <span
                        className="leaderboard-rank"
                        data-place={customer.rank}
                      >
                        #{customer.rank}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <LoyaltyIcon name="coins" /> Net lifetime points
                    </dt>
                    <dd>{Number(customer.earned).toLocaleString()} pts</dd>
                  </div>
                  <div>
                    <dt>
                      <FarmstandIcon name="credit-card" /> Total spent
                    </dt>
                    <dd>
                      {customer.relationship
                        ? customerSpend(customer.relationship)
                        : 'Unavailable'}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <FarmstandIcon name="shopping-cart" /> Completed orders
                    </dt>
                    <dd>{customer.orders}</dd>
                  </div>
                </dl>
                {customer.relationship && (
                  <FarmstandLink
                    className="leaderboard-customer-link"
                    variant="primary"
                    href={`/vendor/customers/${encodeURIComponent(customer.relationship.id)}`}
                    onClick={navigate}
                  >
                    <UtilityIcon name="external" /> View Customer Page
                  </FarmstandLink>
                )}
              </FarmstandPanel>
            )}
          </div>
        </>
      )}
    </section>
  );
}
