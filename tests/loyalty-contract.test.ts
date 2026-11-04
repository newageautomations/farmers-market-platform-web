import { describe, it, expect, vi } from 'vitest';
import { createLoyaltyApi, type LoyaltyTerms } from '@market/api';

const terms: LoyaltyTerms = {
  name: 'Honey',
  kind: 'FREE_PRODUCT',
  points: 500,
  value: 0,
  maximum: 0,
  minimum: 0,
  variantIds: ['1'],
  quantity: 1,
  startsAt: null,
  endsAt: null,
  limit: null,
};
describe('reward save contract', () => {
  it.each([
    'INVALID_REWARD_FIELD',
    'INVALID_REWARD_CONFIGURATION',
    'REWARD_PRODUCT_UNAVAILABLE',
  ])(
    'recognizes %s as a correctable rejection under BAD_USER_INPUT',
    async (code) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: [{ message: code, extensions: { code: 'BAD_USER_INPUT' } }],
          }),
        ),
      );
      await expect(
        createLoyaltyApi(
          { endpoint: 'http://localhost/admin-api', fetch: fetcher },
          'admin',
        ).save(terms, 'ACTIVE'),
      ).rejects.toMatchObject({ kind: 'validation', code });
    },
  );
  it('submits only editable supported reward fields and omits canonical previews', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { saveOwnLoyaltyReward: { id: 1 } } }),
        ),
      );
    await createLoyaltyApi(
      { endpoint: 'http://localhost/admin-api', fetch: fetcher },
      'admin',
    ).save(
      {
        ...terms,
        image: '/preview.png',
        unexpectedField: true,
      } as LoyaltyTerms,
      'ACTIVE',
    );
    expect(
      JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).variables.terms,
    ).toEqual(terms);
  });
});
