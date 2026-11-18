import { useCallback, useEffect, useState } from 'react';
import type { MarketService } from '../market/service';
import type { VendorService } from '../vendor/service';
import {
  readOccurrencesInRange,
  addDays,
  today,
} from '../market/occurrences-data';
import { ReadState, useRead, go } from '../vendor/common';
import { Field } from '@market/ui';
import { FarmstandSelect } from '@market/ui/farmstand';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { PreparationPage } from './PreparationPage';

export interface PreparationDate {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  href: string;
}
/** Calendar-day comparison uses the market's timezone, including DST changes. */
export function preparationIsDue(date: PreparationDate, now = Date.now()) {
  const day = (value: number) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: date.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  const startDay = day(Date.parse(date.startsAt));
  const currentDay = day(now);
  const next = new Date(`${currentDay}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return (
    Date.parse(date.endsAt) > now &&
    (startDay === currentDay || startDay === next.toISOString().slice(0, 10))
  );
}
export function usePreparationDates(
  vendor?: VendorService,
  market?: MarketService,
) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const allowed = market
    ? !!market.preparation &&
      market.context.permissions.includes('ReadOwnMarketAssignments')
    : !!vendor?.preparation &&
      vendor.context.permissions.includes('ReadOwnVendorIdentity');
  const load = useCallback(async (): Promise<PreparationDate[]> => {
    if (market) {
      const [configuration, dates] = await Promise.all([
        market.configuration(market.marketId),
        readOccurrencesInRange(market, {
          from: addDays(today(), -1),
          through: addDays(today(), 91),
        }),
      ]);
      return dates.items
        .filter(
          (d) => d.status === 'scheduled' && Date.parse(d.endsAt) > Date.now(),
        )
        .map((d) => ({
          ...d,
          id: Number(d.id),
          name: configuration?.name ?? 'Market',
          href: `/market/preparation/${d.id}`,
        }));
    }
    if (!vendor) return [];
    const memberships = (await vendor.memberships()).filter(
      (m) => m.status === 'approved',
    );
    const result: PreparationDate[] = [];
    for (const membership of memberships) {
      const [state, occurrences] = await Promise.all([
        vendor.membership(membership.id),
        vendor.occurrences(
          membership.id,
          new Date(Date.now() - 86400000).toISOString(),
          new Date(Date.now() + 90 * 86400000).toISOString(),
        ),
      ]);
      for (const occurrence of occurrences) {
        if (
          occurrence.status !== 'scheduled' ||
          state.participations.some(
            (p) => p.occurrenceId === occurrence.id && p.status === 'cancelled',
          )
        )
          continue;
        result.push({
          ...occurrence,
          id: Number(occurrence.id),
          name: membership.market.name,
          href: `/vendor/markets/${membership.id}/dates/${occurrence.id}/preparation`,
        });
      }
    }
    return result
      .filter((d) => Date.parse(d.endsAt) > Date.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [vendor, market]);
  const query = useRead(
    `preparation-dates:${market?.readKey ?? vendor?.vendorId}`,
    load,
    allowed,
  );
  return {
    ...query,
    due: query.data?.some((d) => preparationIsDue(d, now)) ?? false,
  };
}
export type PreparationDates = ReturnType<typeof usePreparationDates>;

/** Date selection composes existing fields, selector, frame and preparation controller. */
export function PreparationWorkspace({
  dates,
  vendor,
  market,
  occurrenceId,
}: {
  dates?: PreparationDates;
  vendor?: VendorService;
  market?: MarketService;
  occurrenceId?: number;
}) {
  const selector = (
    <div className="preparation-selector">
      <Field id="preparation-date" label="Market date">
        <FarmstandSelect
          id="preparation-date"
          value={String(occurrenceId ?? '')}
          onChange={(event) => {
            const date = dates?.data?.find(
              (d) => String(d.id) === event.target.value,
            );
            if (date) go(date.href);
          }}
        >
          <option value="" disabled>
            Choose a market date
          </option>
          {occurrenceId && !dates?.data?.some((d) => d.id === occurrenceId) && (
            <option value={occurrenceId}>Current market date</option>
          )}
          {dates?.data?.map((d) => (
            <option key={d.href} value={d.id}>
              {d.name} ·{' '}
              {new Date(d.startsAt).toLocaleString(undefined, {
                timeZone: d.timezone,
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </option>
          ))}
        </FarmstandSelect>
      </Field>
      <ReadState
        loading={!!dates?.loading}
        error={dates?.error}
        retry={dates?.refresh ?? (() => {})}
      />
    </div>
  );
  if (occurrenceId)
    return (
      <PreparationPage
        key={occurrenceId}
        occurrenceId={occurrenceId}
        api={market?.preparation ?? vendor?.preparation}
        scope={market ? 'MANAGER' : 'VENDOR'}
        canManage={
          !!(market
            ? market.context.permissions.includes('OperateOwnMarketDay')
            : vendor?.context.permissions.includes(
                'ManageOwnMarketParticipation',
              ))
        }
        packing={
          vendor?.context.permissions.includes('ReadOwnOrders')
            ? vendor.packing
            : undefined
        }
        selector={selector}
      />
    );
  return (
    <WorkspaceFrame
      icon="calendar-days"
      title="Market preparation"
      description="Choose a market date to start preparing."
      tabs={[]}
      value="preparation"
      onChange={() => {}}
      className="preparation-page"
    >
      {selector}
      {dates?.data && !dates.data.length && (
        <p>No upcoming market dates to prepare for.</p>
      )}
    </WorkspaceFrame>
  );
}
