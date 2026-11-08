import { useCallback, useState, type MouseEvent } from 'react';
import { mayMarketCommand } from '@market/admin-core';
import { Alert, Dialog, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
} from '@market/ui/farmstand';
import { Fact, Panel } from '../vendor/application-detail';
import { marketDate, marketTime } from '../vendor/markets-data';
import { OccurrenceMap } from './OccurrenceMap';
import type { MarketService } from './service';
import { date, friendlyLabel, StatusBadge } from './presentation';
import {
  CommandForm,
  go,
  ReadState,
  RuleSummary,
  SessionFields,
  sessionInput,
  useRead,
} from './common';
import '@market/ui/farmstand.css';
import '../vendor/markets-workspace.css';
import './market-occurrences.css';

function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(href);
}

/**
 * One market date in the dashboard detail layout (shared vendor detail
 * panels and facts). Editing and cancellation keep the existing versioned
 * CommandForm commands, now opened in dialogs.
 */
export function MarketOccurrenceDetail({
  service,
  id,
}: {
  service: MarketService;
  id: string;
}) {
  const read = useCallback(() => service.occurrence(id), [service, id]);
  const detail = useRead(`${service.readKey}:occurrence-detail:${id}`, read);
  const [observedAt, setObservedAt] = useState(() => Date.now());
  const [dialog, setDialog] = useState<'edit' | 'cancel'>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const occurrence = detail.data;
  const command = mayMarketCommand(
    service.context,
    'ManageOwnMarketOccurrences',
  );
  const boothsAllowed =
    !!service.phase14 &&
    service.context.permissions.includes('ReadOwnMarketAssignments');
  const refreshDetail = detail.refresh;
  const refresh = useCallback(() => {
    setObservedAt(Date.now());
    refreshDetail();
  }, [refreshDetail]);
  const editable =
    command &&
    occurrence?.status === 'scheduled' &&
    Date.parse(occurrence.startsAt) > observedAt;
  const ended =
    occurrence?.status === 'scheduled' &&
    Date.parse(occurrence.endsAt) < observedAt;
  const back = '/market/occurrences';
  const operations = `/market/operations/${id}`;
  const assignments = `/market/assignments/${id}`;
  function close() {
    if (!busy) setDialog(undefined);
  }

  return (
    <div className="application-detail occurrence-detail farmstand-controls">
      <FarmstandLink
        href={back}
        variant="secondary"
        onClick={(event) => inApp(event, back)}
        className="application-detail-back application-detail-arrow"
      >
        <FarmstandIcon name="arrow-left" />
        Back to occurrences
      </FarmstandLink>
      <ReadState
        loading={!occurrence && detail.loading}
        error={detail.error}
        retry={detail.refresh}
      />
      {occurrence && (
        <>
          <header className="application-detail-heading">
            <div className="application-detail-title">
              <h1>{marketDate(occurrence, true)}</h1>
              <StatusBadge>{ended ? 'past' : occurrence.status}</StatusBadge>
            </div>
            {editable && (
              <div className="occurrence-detail-actions">
                <FarmstandButton
                  variant="destructive-outline"
                  onClick={() => setDialog('cancel')}
                >
                  Cancel occurrence
                </FarmstandButton>
                <FarmstandButton onClick={() => setDialog('edit')}>
                  <UtilityIcon name="edit" />
                  Edit occurrence
                </FarmstandButton>
              </div>
            )}
          </header>
          <p className="occurrence-detail-lead">
            Review this market date, its booth layout and day-of operations.
          </p>
          {notice && (
            <Alert severity="success" role="status">
              {notice}
            </Alert>
          )}
          {occurrence.status === 'cancelled' && (
            <Alert severity="warning">
              This occurrence is cancelled. Existing orders, inventory and
              customer notifications are handled separately.
            </Alert>
          )}
          <FarmstandPanel
            as="section"
            aria-label="Occurrence overview"
            className="application-detail-overview"
          >
            <dl>
              <Fact icon={{ farmstand: 'calendar-days' }} label="Date">
                {marketDate(occurrence, true)}
              </Fact>
              <Fact icon={{ utility: 'clock' }} label="Time">
                {marketTime(occurrence)}
              </Fact>
              <Fact icon={{ farmstand: 'map-pin' }} label="Venue">
                {occurrence.venue || 'Not provided'}
              </Fact>
              <Fact icon={{ farmstand: 'layers' }} label="Source">
                {friendlyLabel(occurrence.source)}
              </Fact>
            </dl>
            <FarmstandLink
              href={operations}
              variant="secondary"
              className="application-detail-arrow"
              onClick={(event) => inApp(event, operations)}
            >
              View occurrence operations
              <FarmstandIcon name="arrow-right" />
            </FarmstandLink>
          </FarmstandPanel>
          <div className="application-detail-columns">
            <div className="application-detail-main">
              <OccurrenceMap service={service} occurrenceId={occurrence.id} />
            </div>
            <aside
              className="application-detail-sidebar"
              aria-label="Occurrence details and actions"
            >
              <Panel icon={{ farmstand: 'info' }} title="Date details">
                <dl className="application-detail-summary">
                  <Fact icon={{ farmstand: 'calendar-days' }} label="Starts">
                    {date(occurrence.startsAt, occurrence.timezone)}
                  </Fact>
                  <Fact icon={{ utility: 'clock' }} label="Ends">
                    {date(occurrence.endsAt, occurrence.timezone)}
                  </Fact>
                  <Fact icon={{ farmstand: 'map-pin' }} label="Time zone">
                    {occurrence.timezone}
                  </Fact>
                  <Fact icon={{ farmstand: 'package' }} label="Pickup">
                    {occurrence.pickupInstructions || 'Not provided'}
                  </Fact>
                  <Fact icon={{ farmstand: 'shopping-cart' }} label="Preorders">
                    {occurrence.preorderOverride ? (
                      <RuleSummary rule={occurrence.preorderOverride} />
                    ) : (
                      'Market default window'
                    )}
                  </Fact>
                </dl>
              </Panel>
              <Panel
                icon={{ farmstand: 'clipboard-list' }}
                title="Quick actions"
              >
                <div className="application-detail-quick-actions">
                  {editable && (
                    <FarmstandButton
                      variant="secondary"
                      onClick={() => setDialog('edit')}
                    >
                      <UtilityIcon name="edit" />
                      Edit occurrence
                    </FarmstandButton>
                  )}
                  {boothsAllowed && (
                    <FarmstandLink
                      href={assignments}
                      variant="secondary"
                      className="application-detail-arrow"
                      onClick={(event) => inApp(event, assignments)}
                    >
                      <FarmstandIcon name="store" />
                      Assign booths
                      <FarmstandIcon name="arrow-right" />
                    </FarmstandLink>
                  )}
                  <FarmstandLink
                    href={operations}
                    variant="secondary"
                    className="application-detail-arrow"
                    onClick={(event) => inApp(event, operations)}
                  >
                    <FarmstandIcon name="clipboard-list" />
                    Operations and readiness
                    <FarmstandIcon name="arrow-right" />
                  </FarmstandLink>
                </div>
                {!editable && command && (
                  <p className="application-detail-note">
                    {occurrence.status === 'scheduled'
                      ? 'Started or past dates can no longer be edited or cancelled.'
                      : 'Cancelled dates can no longer be edited.'}
                  </p>
                )}
              </Panel>
            </aside>
          </div>
          <Dialog
            open={dialog === 'edit' && !!editable}
            size="wide"
            title="Edit occurrence"
            description="Change this date's times, venue, pickup directions or preorder window."
            busy={busy}
            onClose={close}
          >
            <CommandForm
              key={`revise:${occurrence.version}`}
              embedded
              hideTitle
              title="Revise occurrence"
              submitLabel="Save changes"
              onPendingChange={setBusy}
              onDone={() => {
                setBusy(false);
                setDialog(undefined);
                setNotice('Occurrence updated.');
                refresh();
              }}
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
          </Dialog>
          <Dialog
            open={dialog === 'cancel' && !!editable}
            size="standard"
            title="Cancel this occurrence?"
            busy={busy}
            onClose={close}
          >
            <CommandForm
              danger
              embedded
              hideTitle
              title="Cancel occurrence"
              submitLabel="Cancel occurrence"
              onPendingChange={setBusy}
              onDone={() => {
                setBusy(false);
                setDialog(undefined);
                setNotice('Occurrence cancelled.');
                refresh();
              }}
              run={() =>
                service.cancelOccurrence(occurrence.id, occurrence.version)
              }
            >
              <p>
                {marketDate(occurrence, true)} will be cancelled. This does not
                automatically refund purchases, restock inventory or notify
                customers; handle those separately.
              </p>
            </CommandForm>
          </Dialog>
        </>
      )}
    </div>
  );
}
