import { describe, expect, it } from 'vitest';
import { marketDayLandingAllowed } from '../apps/storefront/src/lib/market-day-routing';
import {
  marketDayRemaining,
  selectMarketDay,
  type MarketDayOccurrence,
} from '../packages/api/src/market-day-storefront';

const occurrence: MarketDayOccurrence = {
  id: 1,
  startsAt: '2026-11-13T15:00:00Z',
  endsAt: '2026-11-13T19:00:00Z',
  cutoffAt: '2026-11-13T20:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Market',
};
describe('Market Day storefront selection and clock', () => {
  it('keeps regular, editor, shop, account and order routes outside the landing switch', () => {
    const market = { kind: 'MARKET' as const, source: 'backend' as const };
    const url = (path: string) => new URL(path, 'http://market.localhost');
    expect(marketDayLandingAllowed(market, false, url('/'))).toBe(true);
    for (const path of [
      '/?storefront=regular',
      '/shop?occurrence=1',
      '/account',
      '/account/orders/23',
      '/occurrences/1',
    ])
      expect(marketDayLandingAllowed(market, false, url(path))).toBe(false);
    expect(marketDayLandingAllowed(market, true, url('/?marketDay=1'))).toBe(
      false,
    );
    expect(
      marketDayLandingAllowed({ ...market, kind: 'VENDOR' }, false, url('/')),
    ).toBe(false);
  });
  it('requires an explicit selection for overlaps and rejects foreign ids', () => {
    const state = {
      serverNow: occurrence.startsAt,
      occurrences: [occurrence, { ...occurrence, id: 2 }],
    };
    expect(selectMarketDay(state, null)).toBeUndefined();
    expect(selectMarketDay(state, '3')).toBeUndefined();
    expect(selectMarketDay(state, '2')?.id).toBe(2);
    expect(
      selectMarketDay({ ...state, occurrences: [occurrence] }, null)?.id,
    ).toBe(1);
  });
  it('uses server time, catches up after suspension and clamps at scheduled end', () => {
    expect(
      marketDayRemaining(
        occurrence.endsAt,
        '2026-11-13T18:59:00Z',
        1000,
        31000,
      ),
    ).toBe(30000);
    expect(
      marketDayRemaining(
        occurrence.endsAt,
        '2026-11-13T18:59:00Z',
        1000,
        121000,
      ),
    ).toBe(0);
  });
});
