import { useCallback, useState } from 'react';
import { type MarketOccurrence } from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Card, EmptyState, Pagination } from '@market/ui';
import { MarketGenerationStatus } from './generation-status';
import type { MarketService } from './service';
import { ScheduleForm } from './schedule';
import { localParts } from './timezones';
import { OccurrenceMap } from './OccurrenceMap';
import { StatusBadge } from './presentation';
import {
  calendarDate,
  Choice,
  CommandForm,
  DataTable,
  date,
  dateBounds,
  initialRange,
  RangeForm,
  ReadState,
  RouteLink,
  RuleSummary,
  SessionFields,
  sessionInput,
  text,
  TextField,
  useRead,
} from './common';

export function OccurrenceFacts({
  occurrence,
}: {
  occurrence: MarketOccurrence;
}) {
  return (
    <Card as="div" className="dashboard-card">
      <dl className="facts">
        <div>
          <dt>Starts</dt>
          <dd>{date(occurrence.startsAt, occurrence.timezone)}</dd>
        </div>
        <div>
          <dt>Ends</dt>
          <dd>{date(occurrence.endsAt, occurrence.timezone)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge>{occurrence.status}</StatusBadge>
          </dd>
        </div>
        <div>
          <dt>Venue</dt>
          <dd>{occurrence.venue || 'Not provided'}</dd>
        </div>
        <div>
          <dt>Pickup Instructions</dt>
          <dd>{occurrence.pickupInstructions || 'Not provided'}</dd>
        </div>
      </dl>
      <RuleSummary rule={occurrence.preorderOverride} />
    </Card>
  );
}

export function MarketOccurrences({
  service,
  id,
  view = 'list',
}: {
  service: MarketService;
  id?: string;
  view?: 'list' | 'generate' | 'manual';
}) {
  const [range, setRange] = useState(initialRange);
  const [job, setJob] = useState<{ scope: string; id: string } | null>(null);
  const [skip, setSkip] = useState(0);
  const [observedAt, setObservedAt] = useState(() => Date.now());
  const bounds = dateBounds(range.from, range.through);
  const read = useCallback(
    () =>
      service.occurrencePage({
        take: 20,
        skip,
        from: bounds.from,
        through: bounds.through,
      }),
    [service, bounds.from, bounds.through, skip],
  );
  const state = useRead(
    `${service.readKey}:occurrences:${bounds.from}:${bounds.through}:${skip}`,
    read,
    !id && view === 'list',
  );
  const configRead = useCallback(
    () => service.configuration(service.marketId),
    [service],
  );
  const config = useRead(`${service.readKey}:occurrence-config`, configRead);
  const detailRead = useCallback(() => service.occurrence(id!), [service, id]);
  const detail = useRead(
    `${service.readKey}:occurrence-detail:${id}`,
    detailRead,
    !!id,
  );
  const occurrence = detail.data;
  const active = id ? detail : state;
  const command = mayMarketCommand(
    service.context,
    'ManageOwnMarketOccurrences',
  );
  const schedule = mayMarketCommand(service.context, 'ManageOwnMarketSchedule');
  const refreshPage = state.refresh,
    refreshDetail = detail.refresh,
    refreshConfig = config.refresh;
  const refresh = useCallback(() => {
    setObservedAt(Date.now());
    refreshPage();
    refreshDetail();
    refreshConfig();
  }, [refreshPage, refreshDetail, refreshConfig]);
  return (
    <>
      {!id && view === 'list' && (
        <>
          <RangeForm
            range={range}
            onChange={(value) => {
              setRange(value);
              setSkip(0);
            }}
          />
          <p>
            Browse market dates in the selected range, with the earliest dates
            first.
          </p>
        </>
      )}
      <ReadState {...active} retry={active.refresh} />
      <div className="ops-toolbar">
        {!id && view === 'list' && (
          <>
            {schedule && (
              <RouteLink to="/market/occurrences/generate">
                Generate occurrences
              </RouteLink>
            )}
            {command && (
              <RouteLink to="/market/occurrences/new">
                Create manual occurrence
              </RouteLink>
            )}
          </>
        )}
        {view !== 'list' && (
          <RouteLink to="/market/occurrences">Back to occurrences</RouteLink>
        )}
      </div>
      {id ? (
        <>
          <RouteLink to="/market/occurrences">Back to occurrences</RouteLink>
          {occurrence && (
            <>
              <OccurrenceFacts occurrence={occurrence} />
              <OccurrenceMap service={service} occurrenceId={occurrence.id} />
              <RouteLink to={`/market/operations/${occurrence.id}`}>
                View occurrence operations
              </RouteLink>
              {command &&
                occurrence.status === 'scheduled' &&
                Date.parse(occurrence.startsAt) > observedAt && (
                  <>
                    <CommandForm
                      key={`revise:${occurrence.version}`}
                      title="Revise occurrence"
                      onDone={refresh}
                      validate={(data) => {
                        sessionInput(data);
                      }}
                      run={(data) =>
                        service.reviseOccurrence(
                          occurrence.id,
                          occurrence.version,
                          sessionInput(data),
                        )
                      }
                    >
                      <SessionFields
                        value={occurrence}
                        timezone={occurrence.timezone}
                      />
                    </CommandForm>
                    <CommandForm
                      danger
                      title="Cancel Occurrence"
                      onDone={refresh}
                      run={() =>
                        service.cancelOccurrence(
                          occurrence.id,
                          occurrence.version,
                        )
                      }
                      submitLabel="Cancel occurrence"
                      confirm="Cancel this occurrence? This does not automatically refund purchases, restock inventory or notify customers."
                    >
                      <p>
                        Existing orders, inventory, and customer notifications
                        will need to be handled separately.
                      </p>
                    </CommandForm>
                  </>
                )}
            </>
          )}
        </>
      ) : (
        <>
          {state.data &&
            (state.data.items.length ? (
              <DataTable
                label="Market occurrences"
                recordDetails={{ status: 1 }}
                headings={['Start', 'Status', 'Venue']}
                sort={{ heading: 'Start', direction: 'ascending' }}
              >
                {state.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <RouteLink to={`/market/occurrences/${row.id}`}>
                        {date(row.startsAt, row.timezone)}
                      </RouteLink>
                      <small>
                        {row.localStartsAt} · {row.timezone}
                      </small>
                    </td>
                    <td>
                      <StatusBadge>{row.status}</StatusBadge>
                    </td>
                    <td>{row.venue || 'Not provided'}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState title="No occurrences in this date view" />
            ))}
          {state.data && (
            <>
              <p>
                {state.data.totalItems} occurrences in this date range. Showing{' '}
                {state.data.items.length ? skip + 1 : 0} to{' '}
                {state.data.items.length ? skip + state.data.items.length : 0}.
              </p>
              <Pagination
                hasPrevious={skip > 0}
                hasNext={skip + 20 < state.data.totalItems}
                onPrevious={() => setSkip((v) => Math.max(0, v - 20))}
                onNext={() => setSkip((v) => v + 20)}
              />
            </>
          )}
          {schedule && view === 'generate' && config.data && (
            <ScheduleForm
              service={service}
              market={config.data}
              refresh={refresh}
            />
          )}
          {schedule && view === 'generate' && config.data?.recurrence && (
            <CommandForm
              title="Generate occurrences"
              onDone={refresh}
              submitLabel="Generate occurrences"
              validate={(data) => {
                calendarDate(text(data, 'localFrom'));
                calendarDate(text(data, 'localThrough'));
                if (text(data, 'localThrough') < text(data, 'localFrom'))
                  throw new Error('Invalid range');
              }}
              run={async (data) => {
                if (text(data, 'generationMode') === 'queued') {
                  const receipt = await service.enqueue(
                    service.marketId,
                    text(data, 'localFrom'),
                    text(data, 'localThrough'),
                  );
                  setJob({ scope: service.readKey, id: receipt.id });
                } else {
                  await service.generate(
                    service.marketId,
                    text(data, 'localFrom'),
                    text(data, 'localThrough'),
                  );
                  setJob(null);
                }
              }}
            >
              <p>
                Create market dates using the saved repeating schedule above.
                Both dates are included, and existing dates are kept.
              </p>
              <TextField
                name="localFrom"
                label="Create dates starting on"
                type="date"
                value={range.from}
              />
              <TextField
                name="localThrough"
                label="Create dates through"
                type="date"
                value={range.through}
              />
              <Choice
                name="generationMode"
                label="Generation execution"
                info="Create now waits for your dates to be ready, while background generation lets a worker finish and reports progress below."
                labels={{
                  synchronous: 'Create now',
                  queued: 'Run in background',
                }}
                choices={['synchronous', 'queued']}
                value="synchronous"
              />
            </CommandForm>
          )}
          {job?.scope === service.readKey && (
            <MarketGenerationStatus
              key={`${service.readKey}:${job.id}`}
              service={service}
              jobId={job.id}
              onCompleted={refresh}
            />
          )}
          {view === 'generate' && (
            <ReadState {...config} retry={config.refresh} />
          )}
          {command && view === 'manual' && (
            <>
              <ReadState {...config} retry={config.refresh} />
              {config.data && (
                <CommandForm
                  title="Create manual occurrence"
                  onDone={refresh}
                  submitLabel="Create manual occurrence"
                  validate={(data) => {
                    calendarDate(text(data, 'startDate'));
                    sessionInput(data);
                  }}
                  run={async (data, key) => {
                    await service.manual(
                      service.marketId,
                      localParts(
                        sessionInput(data).startsAt,
                        config.data!.timezone,
                      ).date,
                      `manual:${key}`,
                      sessionInput(data),
                    );
                  }}
                >
                  <p>
                    Create a single future market date using the start and end
                    times below.
                  </p>
                  <SessionFields
                    timezone={config.data.timezone}
                    value={{
                      startsAt: '',
                      endsAt: '',
                      venue: config.data.venue,
                      pickupInstructions: config.data.pickupInstructions,
                      preorderOverride: null,
                    }}
                  />
                </CommandForm>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
