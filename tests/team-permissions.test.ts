import { describe, expect, it } from 'vitest';
import {
  mayCommand,
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';

const employee = (
  permissions: AdminContext['permissions'],
  membershipRole: AdminContext['membershipRole'] = 'staff',
): AdminContext => ({
  scope: 'VENDOR',
  name: 'Scoped employee',
  source: 'backend',
  subject: { vendorId: '10' },
  membershipRole,
  permissions,
});

describe('Phase A employee compatibility', () => {
  it('permits ordinary commands by explicit capability for all employee labels', () => {
    for (const role of ['administrator', 'lead', 'staff'] as const) {
      expect(
        mayCommand(employee(['ManageOwnCatalog'], role), 'ManageOwnCatalog'),
      ).toBe(true);
      expect(mayCommand(employee([], role), 'ManageOwnCatalog')).toBe(false);
    }
  });
  it('keeps protected provider operations behind Owner presentation checks', () => {
    expect(
      mayCommand(
        employee(['ManageOwnPosIntegrations']),
        'ManageOwnPosIntegrations',
      ),
    ).toBe(false);
    expect(
      mayCommand(
        employee(['ManageOwnPosIntegrations'], 'owner'),
        'ManageOwnPosIntegrations',
      ),
    ).toBe(true);
  });
  it('does not expose orders and inventory from the workspace read capability', () => {
    const paths = visibleNavigation(employee(['ReadOwnVendorIdentity'])).map(
      (item) => item.path,
    );
    expect(paths).not.toContain('/vendor/orders');
    expect(paths).not.toContain('/vendor/inventory');
    expect(
      routeAllowed(
        employee(['ReadOwnVendorIdentity', 'ReadOwnOrders']),
        '/vendor/orders',
      ),
    ).toBe(true);
  });
  it('permits delegated financial reads and applications independently of the Owner label', () => {
    expect(
      routeAllowed(employee(['ReadOwnVendorFinance']), '/vendor/finances'),
    ).toBe(true);
    expect(
      routeAllowed(
        employee(['ManageOwnMarketParticipation']),
        '/vendor/applications',
      ),
    ).toBe(true);
    expect(
      routeAllowed(employee(['ReadOwnVendorIdentity']), '/vendor/applications'),
    ).toBe(false);
  });
});
