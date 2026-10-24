import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export interface PosAccessFacts {
  user: {
    id: number;
    identifier: string;
    deletedAt: unknown;
    verified: boolean;
  };
  vendor: {
    id: number;
    slug: string;
    provisioningKey: string;
    status: string;
    primaryChannelId: number;
  };
  memberships: {
    principalId: number;
    vendorId: number | null;
    marketId: number | null;
    role: string;
    status: string;
  }[];
  role: {
    id: number;
    code: string;
    permissions: string;
    userIds: number[];
    channelIds: number[];
  };
}

/** A fixture-only opt-in. Never used by production authorization or general seeding. */
export function mannaPosPlan(facts: PosAccessFacts) {
  const { user, vendor, role, memberships } = facts;
  assert.equal(user.identifier, 'manna-roots@example.test');
  assert.equal(user.deletedAt, null);
  assert.equal(user.verified, true);
  assert.equal(vendor.slug, 'manna-roots');
  assert.equal(vendor.provisioningKey, 'requested-vendors:manna-roots');
  assert.equal(vendor.status, 'active');
  assert.equal(role.code, 'testing-vendor:manna-roots');
  assert.deepEqual(
    role.userIds,
    [user.id],
    'Role must belong exclusively to the existing Manna Roots user',
  );
  assert.deepEqual(
    role.channelIds,
    [vendor.primaryChannelId],
    'Role must be scoped exclusively to the existing vendor channel',
  );
  assert.ok(
    memberships.some(
      (m) =>
        m.principalId === user.id &&
        m.vendorId === vendor.id &&
        m.marketId === null &&
        m.role === 'owner' &&
        m.status === 'active',
    ),
    'Existing active owner membership required; no membership is created or repaired',
  );
  const before = role.permissions.split(',');
  assert.ok(before.includes('ReadOwnVendorIdentity'));
  assert.ok(before.includes('ManageOwnCatalog'));
  assert.ok(before.includes('ReadOwnVendorFinance'));
  for (const permission of [
    'SuperAdmin',
    'ManageVendorIdentity',
    'ManageMarketIdentity',
    'CreateRole',
    'UpdateRole',
  ])
    assert.ok(
      !before.includes(permission),
      `Unexpected privileged grant: ${permission}`,
    );
  const after = before.includes('OperateOwnPos')
    ? before
    : [...before, 'OperateOwnPos'];
  const change = {
    roleId: role.id,
    code: role.code,
    userId: user.id,
    vendorId: vendor.id,
    channelId: vendor.primaryChannelId,
    before,
    after,
    added: after.filter((p) => !before.includes(p)),
  };
  return {
    ...change,
    approval: createHash('sha256')
      .update(JSON.stringify({ facts, change }))
      .digest('hex'),
  };
}
