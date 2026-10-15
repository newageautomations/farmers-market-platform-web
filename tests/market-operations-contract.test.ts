import { readFileSync } from 'node:fs';
import { buildSchema, graphql } from 'graphql';
import { expect, it } from 'vitest';
import { createMarketApi } from '@market/api';
import { createMarketFixtureData } from '../apps/admin/src/market/fixture';

it('executes Operations paging variables against the backend schema', async () => {
  const schema = buildSchema(
    readFileSync('packages/api/schema/admin.graphql', 'utf8'),
  );
  const purchases = createMarketFixtureData('1').operations.items;
  const api = createMarketApi({
    endpoint: 'http://localhost/admin-api',
    channelToken: 'market-test',
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const result = await graphql({
        schema,
        source: request.query,
        variableValues: request.variables,
        rootValue: {
          ownOccurrenceCustomerOperations: ({
            occurrenceId,
            options,
          }: {
            occurrenceId: string;
            options: { skip: number; take: number };
          }) => {
            expect(occurrenceId).toBe('101');
            return {
              totalItems: purchases.length,
              items: purchases.slice(options.skip, options.skip + options.take),
            };
          },
        },
      });
      expect(result.errors).toBeUndefined();
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  const first = await api.operations('101', 0);
  const second = await api.operations('101', 20);
  expect(first.totalItems).toBe(23);
  expect(first.items).toHaveLength(20);
  expect(second.items).toHaveLength(3);
  expect(second.items[0]?.customerOrderId).not.toBe(
    first.items[0]?.customerOrderId,
  );
});
