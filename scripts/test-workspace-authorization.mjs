// Uses the existing backend fixture and real cookie HTTP transport. All writes
// are confined to the guarded disposable database owned by that fixture.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = fileURLToPath(
  new URL('../../farmers-market-platform/', import.meta.url),
);
const backendRequire = createRequire(resolve(backend, 'package.json'));
process.env.FRONTEND_NO_EVIDENCE = 'true';
process.env.FRONTEND_INTEGRATION_RUNTIME ??= fileURLToPath(
  new URL(
    '../test-results/repository-baseline-cleanup/backend-vendor/',
    import.meta.url,
  ),
);
process.chdir(backend);
backendRequire('./test/no-evidence.cjs');
backendRequire('ts-node').register({
  project: resolve(backend, 'test/market-operations/tsconfig.json'),
});
const { startOperationsHarness } = backendRequire(
  './test/market-operations/harness',
);
const { CookieClient } = backendRequire(
  './test/frontend-integration/cookie-client',
);
const { testPassword } = backendRequire('./test/platform-identity/fixture');
const { RoleService, TransactionalConnection, User } =
  backendRequire('@vendure/core');
const { CustomerAccountService } = backendRequire(
  './src/plugins/marketplace-commerce/customer-account/service',
);

async function main() {
  const h = await startOperationsHarness(true, true);
  let success = false;
  let passed = 0;
  async function check(name, run) {
    await run();
    passed++;
    console.log('PASS Market revocation: ' + name);
  }
  try {
    const db = h.app.get(TransactionalConnection);
    const roles = h.app.get(RoleService);
    const accounts = h.app.get(CustomerAccountService);
    const [marketA, marketB] = h.f.markets;
    const [channelA, channelB] = h.f.marketChannels;
    const principalId = h.f.marketPrincipals[0];
    const principal = await db.getRepository(h.f.ctx, User).findOneOrFail({
      where: { id: principalId },
      relations: ['roles', 'roles.channels'],
    });
    const roleA = principal.roles.find((role) => role.code === 'market-a');
    assert.ok(roleA);
    const originalPermissions = [...roleA.permissions];
    // Separate grants make it possible to revoke A while retaining B.
    const roleB = await roles.create(h.f.ctx, {
      code: 'cleanup-regression-market-b',
      description: 'Disposable cross-Market isolation regression',
      channelIds: [channelB.id],
      permissions: originalPermissions,
    });
    principal.roles.push(roleB);
    await db.getRepository(h.f.ctx, User).save(principal);
    await h.f.marketService.setAdminMembership(
      h.f.ctx,
      marketB.id,
      principalId,
      'active',
    );

    const market = new CookieClient(h.endpoint, channelA.token);
    const vendor = new CookieClient(h.endpoint, h.f.commerceChannels[0].token);
    await market.login('market-a@test.invalid');
    await vendor.login('identity-owner-0@test.invalid');
    const { central } = await accounts.unifiedLogin(
      'market-a@test.invalid',
      testPassword,
      'cleanup-market-revocation',
    );
    const configuration = 'query($id:ID!){ownMarket(id:$id){id name}}';
    const marketAInput = { id: String(marketA.id) };
    const protectedReads = [
      { query: configuration, variables: marketAInput },
      { query: 'query{ownMarketIdentity{id}}', variables: {} },
    ];
    const contexts = 'query{ownPlatformAccountContexts}';
    async function assertPersonal() {
      const profile = await accounts.centralProfile(central);
      assert.equal(profile.profile.emailAddress, 'market-a@test.invalid');
      assert.equal(profile.contexts.customer, true);
      assert.ok(
        !profile.contexts.affiliations.some(
          (a) => a.channelId === String(channelA.id),
        ),
      );
    }
    await check(
      'authorized Market and Vendor reads succeed before revocation',
      async () => {
        for (const { query, variables } of protectedReads)
          await market.ok(query, variables);
        await vendor.ok('query{ownVendorIdentity{id}}');
        assert.equal(
          (await accounts.centralProfile(central)).contexts.affiliations.length,
          2,
        );
      },
    );

    for (const kind of ['membership', 'grant']) {
      if (kind === 'membership')
        await h.f.marketService.setAdminMembership(
          h.f.ctx,
          marketA.id,
          principalId,
          'revoked',
        );
      else
        await roles.update(h.f.ctx, {
          id: roleA.id,
          permissions: originalPermissions.filter((p) => p !== 'ReadOwnMarket'),
        });

      await check(
        `${kind}: existing-cookie protected APIs deny access and affiliation disappears`,
        async () => {
          for (const { query, variables } of protectedReads)
            await market.denied(query, variables);
          const account = (await market.ok(contexts))
            .ownPlatformAccountContexts;
          assert.ok(
            !account.affiliations.some(
              (a) => a.channelId === String(channelA.id),
            ),
          );
          assert.ok(
            account.affiliations.some(
              (a) => a.channelId === String(channelB.id),
            ),
          );
        },
      );
      await check(
        `${kind}: switching through B cannot restore A and Vendor remains isolated`,
        async () => {
          market.selectChannel(channelB.token);
          const current = (
            await market.ok(configuration, { id: String(marketB.id) })
          ).ownMarket;
          assert.equal(current.id, String(marketB.id));
          assert.notEqual(current.name, marketA.name);
          market.selectChannel(channelA.token);
          for (const { query, variables } of protectedReads)
            await market.denied(query, variables);
          await vendor.ok('query{ownVendorIdentity{id}}');
          for (const { query, variables } of protectedReads)
            await vendor.denied(query, variables);
        },
      );
      await check(
        `${kind}: fresh native login with the revoked Channel still denies access`,
        async () => {
          const refreshed = new CookieClient(h.endpoint, channelA.token);
          await refreshed.login('market-a@test.invalid');
          for (const { query, variables } of protectedReads)
            await refreshed.denied(query, variables);
        },
      );
      await check(
        `${kind}: existing personal capability still reads its own profile`,
        assertPersonal,
      );

      if (kind === 'membership')
        await h.f.marketService.setAdminMembership(
          h.f.ctx,
          marketA.id,
          principalId,
          'active',
        );
      else
        await roles.update(h.f.ctx, {
          id: roleA.id,
          permissions: originalPermissions,
        });
      await market.ok(configuration, marketAInput);
    }
    await check(
      'loss of all Market memberships preserves only authorized personal access',
      async () => {
        for (const row of [marketA, marketB])
          await h.f.marketService.setAdminMembership(
            h.f.ctx,
            row.id,
            principalId,
            'revoked',
          );
        assert.deepEqual(
          (await accounts.centralProfile(central)).contexts.affiliations,
          [],
        );
        await assertPersonal();
        for (const channel of [channelA, channelB]) {
          market.selectChannel(channel.token);
          await market.denied(configuration, {
            id:
              String(channel.id) === String(channelA.id)
                ? String(marketA.id)
                : String(marketB.id),
          });
          await market.denied('query{ownMarketIdentity{id}}');
        }
      },
    );
    success = true;
    console.log(`Market permission revocation groups passed: ${passed}`);
  } finally {
    await h.close(success);
  }
}
if (process.argv.includes('--vendor-regression')) {
  // The legacy harness creates its read-only staff actor after the shared
  // phone fixture has run. Complete that existing fixture, then execute every
  // original HTTP assertion unchanged. This grants no roles or memberships.
  const fixture = backendRequire('./test/frontend-integration/harness');
  const start = fixture.startFrontendHarness;
  const { verifiedFixturePhones } = backendRequire(
    './test/platform-identity/verified-phone-fixture',
  );
  fixture.startFrontendHarness = async (...args) => {
    const owned = await start(...args);
    try {
      await verifiedFixturePhones(owned.app.get(TransactionalConnection));
      return owned;
    } catch (error) {
      await owned.close(false);
      throw error;
    }
  };
  backendRequire('./test/frontend-integration/run');
} else {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
