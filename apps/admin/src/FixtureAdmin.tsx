import { useMemo, useState } from 'react';
import type { AdminContext, AdminScope } from '@market/admin-core';
import { AdminShell } from './AdminShell';
import { Button } from '@market/ui';
import {
  createFixtureVendorService,
  type FixtureFault,
} from './vendor/fixture';
import type { Availability } from './vendor/service';
import {
  createFixtureMarketService,
  marketFixtureContext,
  type MarketFault,
  marketGrantPresets,
} from './market/fixture';
import type { MarketAvailability } from './market/service';
export const fixtureContexts: Record<AdminScope, AdminContext> = {
  MARKET: marketFixtureContext(),
  VENDOR: {
    scope: 'VENDOR',
    name: 'Synthetic Vendor Fixture',
    branding: { logo: null, accent: '#244967' },
    source: 'fixture',
    subject: { vendorId: '1' },
    membershipRole: 'owner',
    permissions: [
      'ReadOwnVendorIdentity',
      'ManageOwnCatalog',
      'ManageOwnInventory',
      'ReadOwnCRM',
      'ManageOwnMarketParticipation',
      'ManageCatalogPublication',
      'ReadOwnVendorAnalytics',
      'ReadOwnBilling',
    ],
  },
  PLATFORM: {
    scope: 'PLATFORM',
    name: 'Platform fixture',
    source: 'fixture',
    permissions: ['SuperAdmin'],
  },
};
export default function FixtureAdmin() {
  const [scope, setScope] = useState<AdminScope>('MARKET'),
    [signedOut, setSignedOut] = useState(false);
  const [vendor, setVendor] = useState('1'),
    [grants, setGrants] = useState('owner'),
    [availability, setAvailability] = useState<Availability>('allowed'),
    [fault, setFault] = useState<FixtureFault>('none'),
    [projection, setProjection] = useState('ACTIVE');
  const [market, setMarket] = useState('1'),
    [marketGrants, setMarketGrants] =
      useState<keyof typeof marketGrantPresets>('full'),
    [marketAvailability, setMarketAvailability] =
      useState<MarketAvailability>('ALLOWED'),
    [marketFault, setMarketFault] = useState<MarketFault>('none'),
    [marketRevoked, setMarketRevoked] = useState(false);
  const context = useMemo<AdminContext>(
    () =>
      scope === 'VENDOR'
        ? {
            ...fixtureContexts.VENDOR,
            name: vendor === '1' ? 'Synthetic Vendor A' : 'Synthetic Vendor B',
            subject: { vendorId: vendor },
            membershipRole: grants === 'staff' ? 'staff' : 'owner',
            permissions:
              grants === 'operations'
                ? [
                    'ReadOwnVendorIdentity',
                    'ManageOwnInventory',
                    'ReadOwnCRM',
                    'ReadOwnVendorAnalytics',
                    'ReadOwnBilling',
                  ]
                : grants === 'catalog'
                  ? [
                      'ReadOwnVendorIdentity',
                      'ManageOwnCatalog',
                      'ManageCatalogPublication',
                    ]
                  : fixtureContexts.VENDOR.permissions,
          }
        : scope === 'MARKET'
          ? marketFixtureContext(market, marketGrants)
          : fixtureContexts[scope],
    [scope, vendor, grants, market, marketGrants],
  );
  const marketService = useMemo(
    () =>
      scope === 'MARKET'
        ? createFixtureMarketService(
            context,
            marketAvailability,
            marketFault,
            projection,
            () => setMarketRevoked(true),
          )
        : undefined,
    [scope, context, marketAvailability, marketFault, projection],
  );
  const service = useMemo(
    () =>
      scope === 'VENDOR'
        ? createFixtureVendorService(context, availability, fault, projection)
        : undefined,
    [scope, context, availability, fault, projection],
  );
  if (scope === 'MARKET' && marketRevoked)
    return (
      <main className="login">
        <h1>Workspace unavailable</h1>
        <p>
          Fixture Market authority was revoked. Protected content has been
          cleared.
        </p>
        <Button
          onClick={() => {
            setMarketFault('none');
            setMarketRevoked(false);
          }}
        >
          Restore fixture grants
        </Button>
      </main>
    );
  if (signedOut)
    return (
      <main className="login">
        <h1>Fixture signed out</h1>
        <p>This preview uses no real account or backend session.</p>
        <Button onClick={() => setSignedOut(false)}>Return to preview</Button>
      </main>
    );
  return (
    <AdminShell
      key={`${scope}:${vendor}:${grants}:${availability}:${fault}:${projection}:${market}:${marketGrants}:${marketAvailability}:${marketFault}`}
      context={context}
      vendorService={service}
      marketService={marketService}
      onLogout={() => setSignedOut(true)}
      controls={
        <div className="fixture-controls">
          <label htmlFor="fixture-scope">Preview scope</label>
          <select
            id="fixture-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as AdminScope)}
          >
            <option value="MARKET">Market</option>
            <option value="VENDOR">Vendor</option>
            <option value="PLATFORM">Platform</option>
          </select>
          {scope === 'MARKET' && (
            <>
              <label htmlFor="fixture-market">Market preview</label>
              <select
                id="fixture-market"
                value={market}
                onChange={(event) => setMarket(event.target.value)}
              >
                <option value="1">Market A</option>
                <option value="2">Market B</option>
              </select>
              <label htmlFor="fixture-market-grants">
                Market permission preset
              </label>
              <select
                id="fixture-market-grants"
                value={marketGrants}
                onChange={(event) =>
                  setMarketGrants(
                    event.target.value as keyof typeof marketGrantPresets,
                  )
                }
              >
                <option value="full">Full Market Admin</option>
                <option value="schedule">Schedule Manager</option>
                <option value="relationships">
                  Vendor Relationship Manager
                </option>
                <option value="operations">Operations Viewer</option>
                <option value="analytics">Analytics Viewer</option>
              </select>
              <label htmlFor="fixture-market-analytics">
                Market analytics availability
              </label>
              <select
                id="fixture-market-analytics"
                value={marketAvailability}
                onChange={(event) =>
                  setMarketAvailability(
                    event.target.value as MarketAvailability,
                  )
                }
              >
                {['ALLOWED', 'DENIED', 'UNKNOWN', 'UNCONFIGURED'].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
              <label htmlFor="fixture-market-fault">
                Market response preview
              </label>
              <select
                id="fixture-market-fault"
                value={marketFault}
                onChange={(event) =>
                  setMarketFault(event.target.value as MarketFault)
                }
              >
                <option value="none">Success</option>
                <option value="unavailable">Unavailable</option>
                <option value="conflict">Conflict</option>
                <option value="forbidden">Forbidden</option>
                <option value="validation">Validation</option>
              </select>
              <label htmlFor="fixture-market-projection">
                Market projection preview
              </label>
              <select
                id="fixture-market-projection"
                value={projection}
                onChange={(event) => setProjection(event.target.value)}
              >
                {[
                  'ACTIVE',
                  'STALE',
                  'BUILDING',
                  'RECONCILIATION_REQUIRED',
                  'FAILED',
                  'UNBUILT',
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </>
          )}
          {scope === 'VENDOR' && (
            <>
              <label htmlFor="fixture-vendor">Vendor preview</label>
              <select
                id="fixture-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              >
                <option value="1">Vendor A</option>
                <option value="2">Vendor B</option>
              </select>
              <label htmlFor="fixture-grants">Permission preset</label>
              <select
                id="fixture-grants"
                value={grants}
                onChange={(e) => setGrants(e.target.value)}
              >
                <option value="owner">Owner grants</option>
                <option value="operations">
                  Operations grants (owner membership)
                </option>
                <option value="catalog">
                  Catalog grants (owner membership)
                </option>
                <option value="staff">
                  Staff membership, read only commands
                </option>
              </select>
              <label htmlFor="fixture-analytics">Analytics availability</label>
              <select
                id="fixture-analytics"
                value={availability}
                onChange={(e) =>
                  setAvailability(e.target.value as Availability)
                }
              >
                <option value="allowed">Allowed</option>
                <option value="denied">Denied</option>
                <option value="unknown">Unknown</option>
                <option value="unconfigured">Unconfigured</option>
              </select>
              <label htmlFor="fixture-fault">Response preview</label>
              <select
                id="fixture-fault"
                value={fault}
                onChange={(e) => setFault(e.target.value as FixtureFault)}
              >
                <option value="none">Success</option>
                <option value="unavailable">Unavailable</option>
                <option value="conflict">Conflict</option>
                <option value="forbidden">Forbidden</option>
                <option value="validation">Validation</option>
              </select>
              <label htmlFor="fixture-projection">Projection preview</label>
              <select
                id="fixture-projection"
                value={projection}
                onChange={(e) => setProjection(e.target.value)}
              >
                {[
                  'ACTIVE',
                  'STALE',
                  'BUILDING',
                  'RECONCILIATION_REQUIRED',
                  'FAILED',
                  'UNBUILT',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      }
    />
  );
}
