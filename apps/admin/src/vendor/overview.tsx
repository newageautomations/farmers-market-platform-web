import { useCallback } from 'react';
import { hasPermission } from '@market/auth';
import type { VendorService } from './service';
import { ReadState, RouteLink, useRead } from './common';
import { AvailabilityNotice, TotalsTable, defaultRange } from './analytics';
import { ComplianceOverview } from '../documents/ComplianceOverview';

export function Overview({ service }: { service: VendorService }) {
  const catalogRead = useCallback(
    () =>
      service.catalogRead({ take: 1, skip: 0, search: null, sort: 'NAME_ASC' }),
    [service],
  );
  const catalog = useRead('overview-catalog', catalogRead);
  const ordersRead = useCallback(
    () => service.orderList({ take: 1, skip: 0, kind: null }),
    [service],
  );
  const orders = useRead('overview-orders', ordersRead);
  const customerRead = useCallback(
    () => service.customers({ skip: 0, take: 1, search: null }),
    [service],
  );
  const customers = useRead(
    'overview-customers',
    customerRead,
    hasPermission(service.context.permissions, 'ReadOwnCRM'),
  );
  const membershipRead = useCallback(() => service.memberships(), [service]);
  const memberships = useRead('overview-memberships', membershipRead);
  const availabilityRead = useCallback(() => service.availability(), [service]);
  const availability = useRead('overview-availability', availabilityRead);
  const totalsRead = useCallback(
    () => service.totals(service.vendorId, defaultRange()),
    [service],
  );
  const totals = useRead(
    'overview-totals',
    totalsRead,
    availability.data === 'allowed',
  );
  return (
    <>
      {service.notifications && (
        <ComplianceOverview api={service.notifications} />
      )}
      <p>
        Manage your Vendor catalog, physical inventory, operational orders and
        customer relationships.
      </p>
      <div className="overview-links">
        {hasPermission(service.context.permissions, 'ManageOwnCatalog') && (
          <RouteLink to="/vendor/products">Manage products</RouteLink>
        )}
        {hasPermission(service.context.permissions, 'ManageOwnInventory') && (
          <RouteLink to="/vendor/inventory">Manage inventory</RouteLink>
        )}
        <RouteLink to="/vendor/orders">Find an order</RouteLink>
        <RouteLink to="/vendor/markets">Manage Market relationships</RouteLink>
      </div>
      <h2 className="ui-section-title-dashboard">Current workspace</h2>
      <ReadState {...customers} retry={customers.refresh} />
      {customers.data && (
        <dl className="ui-kpi-grid">
          <div>
            <dt>Vendor customer relationships</dt>
            <dd>{customers.data.totalItems}</dd>
            <dd className="ops-day-summary-detail">
              <RouteLink to="/vendor/customers">View customers</RouteLink>
            </dd>
          </div>
        </dl>
      )}
      <ReadState {...memberships} retry={memberships.refresh} />
      {memberships.data && (
        <p>
          Market relationships are available.{' '}
          <RouteLink to="/vendor/markets">View relationships</RouteLink>
        </p>
      )}
      <ReadState {...catalog} retry={catalog.refresh} />
      {catalog.data && (
        <dl className="ui-kpi-grid">
          <div>
            <dt>Owned products</dt>
            <dd>{catalog.data.totalItems}</dd>
          </div>
        </dl>
      )}
      <ReadState {...orders} retry={orders.refresh} />
      {orders.data && (
        <dl className="ui-kpi-grid">
          <div>
            <dt>Operational orders</dt>
            <dd>{orders.data.totalItems}</dd>
          </div>
        </dl>
      )}
      <h2 className="ui-section-title-dashboard">
        Optional analytics snapshot
      </h2>
      <ReadState {...availability} retry={availability.refresh} />
      {availability.data && (
        <AvailabilityNotice availability={availability.data} />
      )}
      <ReadState {...totals} retry={totals.refresh} />
      {totals.data && (
        <>
          <p>Past 30 UTC days, excluding today.</p>
          <TotalsTable data={totals.data} />
        </>
      )}
    </>
  );
}
