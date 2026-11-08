import { useCallback, useId, useMemo, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import type { AttendanceInput, PreorderInput } from '@market/api';
import { Alert, Dialog, EmptyState, Field, Textarea } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { ReadState, useRead } from './common';
import type { VendorService } from './service';
import { Fact, Panel } from './application-detail';
import { navigate } from './MarketApplications';
import { AttendanceBadge } from './UpcomingMarketDates';
import { BoothAssignment, PreorderingPanel } from './MarketDetail';
import {
  dateAttendance,
  dateLocation,
  marketDate,
  marketTime,
  type Participation,
  type UpcomingMarketDate,
} from './markets-data';
import {
  marketPreorderRule,
  readMarketDetail,
  type MarketDetail,
} from './market-detail-data';
import './markets-workspace.css';
import './market-detail.css';

/** One market date: attendance, its preorder window and per-product offerings. */
export function MarketOccurrencePage({
  service,
  membershipId,
  occurrenceId,
}: {
  service: VendorService;
  membershipId: string;
  occurrenceId: string;
}) {
  const read = useCallback(
    () => readMarketDetail(service, membershipId),
    [service, membershipId],
  );
  const query = useRead(`market-detail:${membershipId}`, read, true, {
    retainPreviousData: true,
  });
  const marketHref = `/vendor/markets/${encodeURIComponent(membershipId)}`;
  const detail = query.data;
  const date: UpcomingMarketDate | undefined = useMemo(() => {
    if (!detail) return undefined;
    const upcoming = detail.dates.find((d) => d.occurrence.id === occurrenceId);
    if (upcoming) return upcoming;
    const occurrence = detail.state.occurrences.find(
      (o) => o.id === occurrenceId,
    );
    return (
      occurrence && {
        key: `${membershipId}:${occurrenceId}`,
        membership: detail.state.membership,
        occurrence,
        participation: detail.state.participations.find(
          (p) => p.occurrenceId === occurrenceId,
        ),
        booth: detail.booths?.get(String(occurrenceId))?.space.label,
      }
    );
  }, [detail, membershipId, occurrenceId]);
  return (
    <div className="application-detail market-detail">
      <FarmstandLink
        href={marketHref}
        variant="secondary"
        onClick={navigate}
        className="application-detail-back application-detail-arrow"
      >
        <FarmstandIcon name="arrow-left" />
        Back to {detail?.state.membership.market.name ?? 'market'}
      </FarmstandLink>
      <ReadState
        loading={!detail && query.loading}
        error={query.error}
        retry={query.refresh}
      />
      {detail && !date && (
        <EmptyState title="Market date not found">
          <p>This date is not scheduled for your market membership.</p>
        </EmptyState>
      )}
      {detail && date && (
        <OccurrenceContent
          service={service}
          detail={detail}
          date={date}
          refresh={query.refresh}
        />
      )}
    </div>
  );
}

function OccurrenceContent({
  service,
  detail,
  date,
  refresh,
}: {
  service: VendorService;
  detail: MarketDetail;
  date: UpcomingMarketDate;
  refresh: () => void;
}) {
  const { state } = detail;
  const can =
    mayCommand(service.context, 'ManageOwnMarketParticipation') &&
    date.occurrence.status === 'scheduled';
  const participation = date.participation;
  const attendance = dateAttendance(participation);
  const id = useId();
  const [pickup, setPickup] = useState(participation?.pickupInstructions ?? ''),
    [busy, setBusy] = useState(false),
    [confirming, setConfirming] = useState(false),
    [failed, setFailed] = useState(false),
    // The chosen attendance shows at once and stays until newer data arrives.
    [chosen, setChosen] = useState<{
      value: typeof attendance;
      version: number;
    }>();
  const shown =
    chosen && chosen.version === (participation?.version ?? 0)
      ? chosen.value
      : attendance;
  async function choose(
    value: typeof attendance,
    status: AttendanceInput['status'],
  ) {
    setChosen({ value, version: participation?.version ?? 0 });
    try {
      await save({ status });
    } catch {
      setChosen(undefined);
    }
  }
  async function save(
    patch: Partial<Pick<AttendanceInput, 'status' | 'pickupInstructions'>> & {
      preorderOverride?: PreorderInput;
    },
  ) {
    setBusy(true);
    setFailed(false);
    const p = participation;
    try {
      await service.attendance({
        membershipId: state.membership.id,
        occurrenceId: date.occurrence.id,
        expectedVersion: p?.version ?? null,
        status:
          patch.status ?? (p?.status as AttendanceInput['status']) ?? 'planned',
        pickupInstructions:
          patch.pickupInstructions ?? p?.pickupInstructions ?? '',
        preorderOverride:
          'preorderOverride' in patch ? patch.preorderOverride! : ruleOf(p),
      });
      setConfirming(false);
      refresh();
    } catch {
      setFailed(true);
      refresh();
      throw new Error('save failed');
    } finally {
      setBusy(false);
    }
  }
  const attempt = (...args: Parameters<typeof save>) =>
    save(...args).catch(() => undefined);
  const nextBooth = detail.booths?.get(String(date.occurrence.id));
  // Declined dates have no offerings to configure.
  const active =
    participation && participation.status !== 'cancelled'
      ? participation
      : undefined;
  return (
    <>
      <header className="application-detail-heading">
        <div className="market-detail-title">
          <h1>
            {state.membership.market.name} · {marketDate(date.occurrence, true)}
          </h1>
          <p>
            Manage your attendance, preorder window and products for this market
            date.
          </p>
        </div>
      </header>
      <FarmstandPanel
        as="section"
        aria-label="Market date overview"
        className="application-detail-overview"
      >
        <dl>
          <Fact icon={{ farmstand: 'calendar-days' }} label="Date">
            {marketDate(date.occurrence, true)}
          </Fact>
          <Fact icon={{ utility: 'clock' }} label="Time">
            {marketTime(date.occurrence)}
          </Fact>
          <Fact icon={{ farmstand: 'store' }} label="Your booth">
            {date.booth
              ? `Booth ${date.booth}`
              : detail.boothsAvailable
                ? 'Not assigned'
                : 'Unavailable'}
          </Fact>
          <Fact icon={{ farmstand: 'user-round' }} label="Attendance">
            <AttendanceBadge value={attendance} />
          </Fact>
        </dl>
      </FarmstandPanel>
      {failed && (
        <Alert severity="error" role="alert">
          Your changes could not be saved. The latest status has been reloaded;
          review it and try again.
        </Alert>
      )}
      <div className="application-detail-columns">
        <div className="application-detail-main">
          <Panel icon={{ farmstand: 'circle-check' }} title="Attendance">
            <div className="market-occurrence-attendance">
              {can ? (
                <div
                  className="market-occurrence-choices"
                  role="group"
                  aria-label="Your attendance"
                  aria-busy={busy}
                >
                  {(
                    [
                      ['attending', 'confirmed', 'Attending', 'success'],
                      ['tentative', 'planned', 'Tentative', 'warning'],
                      ['not-attending', 'cancelled', 'Not attending', 'danger'],
                    ] as const
                  ).map(([value, status, label, tone]) => (
                    <FarmstandButton
                      key={value}
                      variant="secondary"
                      aria-pressed={shown === value}
                      className={`button-selection-fill market-occurrence-choice market-occurrence-choice-${tone}`}
                      onClick={() => {
                        // Ignored while saving, without dimming, so the colour change stays smooth.
                        if (busy || shown === value) return;
                        if (status === 'cancelled') setConfirming(true);
                        else void choose(value, status);
                      }}
                    >
                      {label}
                    </FarmstandButton>
                  ))}
                </div>
              ) : (
                <p className="markets-muted">
                  {date.occurrence.status === 'scheduled'
                    ? 'Your account can view this date but not change attendance.'
                    : 'This market date is no longer scheduled.'}
                </p>
              )}
              <Field
                id={id + '-pickup'}
                label="Pickup instructions for customers"
              >
                <Textarea
                  id={id + '-pickup'}
                  value={pickup}
                  maxLength={2000}
                  rows={3}
                  disabled={!can || busy || !participation}
                  placeholder={
                    participation
                      ? 'For example: pick up at the north end of the booth.'
                      : 'Respond to this date first.'
                  }
                  onChange={(e) => setPickup(e.target.value)}
                />
              </Field>
              {can && participation && (
                <div>
                  <FarmstandButton
                    variant="secondary"
                    disabled={
                      busy ||
                      pickup === (participation.pickupInstructions ?? '')
                    }
                    onClick={() => void attempt({ pickupInstructions: pickup })}
                  >
                    Save pickup instructions
                  </FarmstandButton>
                </div>
              )}
            </div>
          </Panel>
        </div>
        <aside
          className="application-detail-sidebar"
          aria-label="Date details and booth"
        >
          <Panel icon={{ farmstand: 'map-pin' }} title="Date details">
            <dl className="application-detail-summary">
              <Fact icon={{ farmstand: 'map-pin' }} label="Location">
                {dateLocation(date)}
              </Fact>
              {date.occurrence.venue &&
                date.occurrence.venue !== dateLocation(date) && (
                  <Fact icon={{ farmstand: 'store' }} label="Venue">
                    {date.occurrence.venue}
                  </Fact>
                )}
              {date.occurrence.pickupInstructions && (
                <Fact icon={{ farmstand: 'info' }} label="Market notes">
                  {date.occurrence.pickupInstructions}
                </Fact>
              )}
            </dl>
          </Panel>
          <BoothAssignment
            marketName={state.membership.market.name}
            assignment={nextBooth}
            available={detail.boothsAvailable}
          />
        </aside>
      </div>
      <PreorderingPanel
        service={service}
        detail={detail}
        refresh={refresh}
        can={can}
        participations={active ? [active] : []}
        scope={{
          lead: active
            ? 'Choose which approved products customers can preorder on this date. These switches change this market date only; your other dates keep their own settings.'
            : 'Mark yourself attending or tentative to choose products for this date.',
          noDates: 'Mark yourself attending or tentative for this date first',
        }}
        settings={
          active
            ? {
                rule: active.preorderOverride,
                fallback:
                  state.membership.preorderDefault ?? marketPreorderRule(state),
                timezone: date.occurrence.timezone,
                notice: {
                  active:
                    'These times replace your market preorder settings for this date only.',
                  inactive:
                    'This date follows your market preorder settings. Saving these times creates a manual override for this date only.',
                },
                onSave: (rule) => save({ preorderOverride: rule }),
              }
            : undefined
        }
      />
      <Dialog
        open={confirming}
        size="standard"
        title="Not attending this date?"
        busy={busy}
        onClose={() => {
          if (!busy) setConfirming(false);
        }}
        actions={
          <FarmstandButton
            variant="destructive"
            loading={busy}
            onClick={() => void choose('not-attending', 'cancelled')}
          >
            Mark not attending
          </FarmstandButton>
        }
      >
        <p>
          {state.membership.market.name} on {marketDate(date.occurrence, true)}.
          The market will see that you are not attending. Existing orders remain
          backend managed.
        </p>
      </Dialog>
    </>
  );
}

function ruleOf(p?: Participation): PreorderInput {
  const r = p?.preorderOverride;
  return r
    ? {
        opensDaysBefore: r.opensDaysBefore,
        opensTime: r.opensTime,
        closesDaysBefore: r.closesDaysBefore,
        closesTime: r.closesTime,
      }
    : null;
}
