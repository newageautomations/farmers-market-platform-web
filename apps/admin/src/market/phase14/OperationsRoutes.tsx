import { cardClassName } from '@market/ui/presentation';
import { useCallback, useEffect, useState } from 'react';
import type {
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
  OperationsSection,
  NotificationsApi,
} from '@market/api';
import { safeError } from '@market/api';
import { Select, ErrorState, Spinner } from '@market/ui';
import { Applications } from './Applications';
import { Directory, Rentals } from './Directory';
import { Layouts, LayoutScreen } from './Layouts';
import { OccurrenceLayoutScreen } from './OccurrenceLayoutActions';
import { Assignments } from './Assignments';
import { Billing } from './Billing';
import { Control } from './common';
import { date } from '../common';
import { RouteLink } from '../../vendor/common';
const sections: Record<string, OperationsSection> = {
  applications: 'APPLICATIONS',
  'application-submissions': 'APPLICATIONS',
  directory: 'DIRECTORY',
  rentals: 'DIRECTORY',
  layouts: 'LAYOUTS',
  assignments: 'ASSIGNMENTS',
  'booth-billing': 'BILLING',
  day: 'DAY',
};
export function Phase14Routes({
  api,
  path,
  permissions,
  notifications,
}: {
  api: MarketOperationsApi;
  path: string;
  permissions: readonly string[];
  notifications?: NotificationsApi;
}) {
  const segment = path.split('/')[2] ?? '',
    section = sections[segment] ?? 'APPLICATIONS';
  const [occurrenceId, setOccurrenceId] = useState(
      ['ASSIGNMENTS', 'DAY', 'BILLING'].includes(section)
        ? Number(path.split('/')[3]) || 0
        : 0,
    ),
    [error, setError] = useState<ReturnType<typeof safeError> | null>(null),
    [pending, setPending] = useState(false);
  const load = useCallback(async () => {
    let primary = await api.read(section, occurrenceId || undefined);
    if (!occurrenceId && ['ASSIGNMENTS', 'DAY', 'BILLING'].includes(section)) {
      const scheduled = primary.occurrences
        .filter((o) => o.status === 'scheduled')
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
      const active =
        scheduled.find(
          (o) =>
            Date.parse(o.startsAt) <= Date.now() &&
            Date.parse(o.endsAt) >= Date.now(),
        ) ??
        scheduled.find((o) => Date.parse(o.startsAt) > Date.now()) ??
        scheduled[scheduled.length - 1];
      if (active) primary = await api.read(section, active.id);
    }
    if (
      section === 'APPLICATIONS' &&
      permissions.includes('ReadOwnMarketAssignments')
    ) {
      const p = await api.read('ASSIGNMENTS');
      Object.assign(primary, {
        plans: p.plans,
        spaces: p.spaces,
        assignments: p.assignments,
      });
    }
    if (
      section === 'ASSIGNMENTS' &&
      permissions.includes('ReadOwnMarketApplications')
    )
      primary.submissions = (await api.read('APPLICATIONS')).submissions;
    return primary;
  }, [api, section, occurrenceId, permissions]);
  const viewKey = `${section}:${occurrenceId}`;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    revision: number;
    data?: MarketOperationsData;
    error?: ReturnType<typeof safeError>;
  }>({ key: '', revision: -1 });
  useEffect(() => {
    let current = true;
    load()
      .then((data) => {
        if (current) setResult({ key: viewKey, revision, data });
      })
      .catch((e) => {
        if (current) setResult({ key: viewKey, revision, error: safeError(e) });
      });
    return () => {
      current = false;
    };
  }, [load, revision, viewKey]);
  const read = {
    loading: result.key !== viewKey || result.revision !== revision,
    error: result.key === viewKey ? result.error : undefined,
    refresh: () => setRevision((v) => v + 1),
  };
  const data = result.key === viewKey ? result.data : undefined;
  async function run(command: OperationsCommand) {
    setPending(true);
    setError(null);
    try {
      const result = await api.command(command);
      read.refresh();
      return result;
    } catch (e) {
      setError(safeError(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }
  if (read.loading && !data)
    return <Spinner label="Loading Market operations" />;
  if (read.error) return <ErrorState error={read.error} />;
  if (!data) return <p>Market operations connection is unavailable.</p>;
  const can = (name: string) => permissions.includes(name),
    active =
      occurrenceId ||
      data.selectedOccurrenceId ||
      data.occurrences.find(
        (o) => o.status === 'scheduled' && new Date(o.endsAt) > new Date(),
      )?.id ||
      data.occurrences[0]?.id ||
      0;
  return (
    <div className="ops-workspace" aria-busy={pending || read.loading}>
      {error && <ErrorState error={error} />}
      {pending && <Spinner label="Saving changes" />}
      <fieldset className="ops-controls" disabled={pending || read.loading}>
        <legend className="sr-only">Market operation controls</legend>
        {active > 0 && ['DAY', 'ASSIGNMENTS'].includes(section) && (
          <RouteLink to={`/market/documents?view=reports&occurrence=${active}`}>
            Review documentation for this Market date
          </RouteLink>
        )}
        {!path.endsWith('/edit-layout') &&
          ['DAY', 'ASSIGNMENTS', 'BILLING'].includes(section) && (
            <Control
              label="Market occurrence"
              className={cardClassName({ className: 'occurrence-control' })}
            >
              {(id) => (
                <Select
                  id={id}
                  value={active}
                  onChange={(e) => setOccurrenceId(Number(e.target.value))}
                >
                  {data.occurrences.map((o) => (
                    <option key={o.id} value={o.id}>
                      {date(o.startsAt)} · {o.venue}
                    </option>
                  ))}
                </Select>
              )}
            </Control>
          )}
        {section === 'APPLICATIONS' && (
          <Applications
            data={data}
            run={run}
            canManage={can('ManageOwnMarketApplications')}
            canConfirmDates={can('ManageOwnMarketAssignments')}
            canBilling={can('ManageOwnMarketBilling')}
            canRequestDocuments={can('ManageOwnMarketMemberships')}
            view={
              segment === 'application-submissions'
                ? 'submissions'
                : 'templates'
            }
          />
        )}
        {section === 'DIRECTORY' && segment === 'directory' && (
          <Directory
            notifications={notifications}
            data={data}
            run={run}
            canManage={can('ManageOwnMarketApplications')}
            view={path.endsWith('/new') ? 'add' : 'list'}
          />
        )}
        {section === 'DIRECTORY' && segment === 'rentals' && (
          <Rentals
            data={data}
            api={can('ReadOwnMarketAssignments') ? api : undefined}
            run={run}
            canManage={can('ManageOwnMarketApplications')}
            view={path.endsWith('/new') ? 'add' : 'list'}
          />
        )}
        {section === 'LAYOUTS' &&
          (path.endsWith('/edit') ? (
            <LayoutScreen
              layoutId={Number(path.split('/')[3])}
              data={data}
              run={run}
              canManage={can('ManageOwnMarketLayouts')}
            />
          ) : (
            <Layouts
              data={data}
              run={run}
              canManage={can('ManageOwnMarketLayouts')}
            />
          ))}
        {section === 'BILLING' && (
          <Billing
            data={data}
            run={run}
            canManage={can('ManageOwnMarketBilling')}
          />
        )}
        {['DAY', 'ASSIGNMENTS'].includes(section) &&
          (path.endsWith('/edit-layout') ? (
            <OccurrenceLayoutScreen
              data={data}
              occurrenceId={active}
              run={run}
              canEdit={
                can('ManageOwnMarketAssignments') &&
                can('ManageOwnMarketLayouts')
              }
            />
          ) : (
            <Assignments
              data={data}
              run={run}
              occurrenceId={active}
              day={section === 'DAY'}
              canAssign={can('ManageOwnMarketAssignments')}
              canEditLayout={can('ManageOwnMarketLayouts')}
              canDay={can('OperateOwnMarketDay')}
              canBill={can('ManageOwnMarketBilling')}
              commandError={error}
            />
          ))}
      </fieldset>
    </div>
  );
}
