import { useCallback, useEffect, useState } from 'react';
import type { MarketOperationsApi, OperationsCommand } from '@market/api';
import { EmptyState } from '@market/ui';
import {
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
} from '@market/ui/farmstand';
import { Fact } from '../../vendor/application-detail';
import { navigateApplication } from './application-navigation';
import { ReadState, useRead } from '../../vendor/common';
import { date, StatusBadge } from '../presentation';
import { ApplicationReview } from './ApplicationReview';
import '../../vendor/application-detail.css';
import './application-review.css';
import './applications.css';

/** Route-owned detail composition. Reuses the existing review controller and
 * approved detail panels; no shared primitive combines these manager reads. */
export function ApplicationSubmissionDetail({
  api,
  id,
  run,
  canManage,
  canConfirmDates,
  canBilling,
  canRequestDocuments,
}: {
  api: MarketOperationsApi;
  id: number;
  run: (command: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates: boolean;
  canBilling: boolean;
  canRequestDocuments: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api.read('APPLICATIONS', undefined, { mode: 'DETAIL', submissionId: id }),
    [api, id],
  );
  // Keep the page mounted while it refreshes after an action, so results
  // such as date decisions stay on screen.
  const query = useRead(`submission-page:${id}`, load, true, {
    retainPreviousData: true,
  });
  const detail = query.data;
  const submission = detail?.submissionDetail;
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const navigation = (event: Event) => {
      if (
        busy ||
        !window.confirm('Leave this application and discard unsaved changes?')
      )
        event.preventDefault();
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('vendor:before-navigate', navigation);
    return () => {
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('vendor:before-navigate', navigation);
    };
  }, [dirty, busy]);
  async function command(input: OperationsCommand) {
    const result = await run(input);
    if (result != null) {
      setDirty(false);
      query.refresh();
    }
    return result;
  }
  /** Date decisions: one command per date, then a single refresh. */
  async function batch(inputs: OperationsCommand[]) {
    const results: boolean[] = [];
    try {
      for (const input of inputs) {
        try {
          results.push((await run(input)) != null);
        } catch {
          results.push(false);
        }
      }
    } finally {
      query.refresh();
    }
    return results;
  }
  const pendingDates = submission
    ? submission.requestedOccurrenceIds.filter(
        (occurrenceId) =>
          (detail?.approvals?.find(
            (a) =>
              a.submissionId === submission.id &&
              a.occurrenceId === occurrenceId,
          )?.decision ?? 'PENDING') === 'PENDING',
      ).length
    : 0;
  return (
    <div className="application-detail submission-detail farmstand-controls">
      <FarmstandLink
        href="/market/application-submissions"
        variant="secondary"
        className="application-detail-back application-detail-arrow"
        onClick={navigateApplication}
      >
        <FarmstandIcon name="arrow-left" />
        Back to submitted applications
      </FarmstandLink>
      <ReadState
        skeleton="detail"
        loading={query.loading && !submission}
        error={query.error}
        retry={query.refresh}
      />
      {submission && detail ? (
        <>
          <header className="application-detail-heading">
            <div className="application-detail-title">
              <h1>{submission.applicant.businessName}</h1>
              <StatusBadge>{submission.status}</StatusBadge>
            </div>
          </header>
          <FarmstandPanel
            as="section"
            className="application-detail-overview"
            aria-label="Submission overview"
          >
            <dl>
              <Fact icon={{ farmstand: 'file-text' }} label="Application">
                {submission.templateName || 'Original application'}
              </Fact>
              <Fact icon={{ farmstand: 'calendar-days' }} label="Submitted">
                {date(submission.createdAt, detail.timeZone)}
              </Fact>
              <Fact icon={{ utility: 'user' }} label="Contact">
                {[submission.applicant.firstName, submission.applicant.lastName]
                  .filter(Boolean)
                  .join(' ') || 'Not provided'}
              </Fact>
              <Fact
                icon={{ farmstand: 'calendar-days' }}
                label="Requested dates"
              >
                {submission.requestedOccurrenceIds.length}
                {pendingDates > 0 &&
                  pendingDates < submission.requestedOccurrenceIds.length &&
                  ` (${pendingDates} pending)`}
              </Fact>
            </dl>
          </FarmstandPanel>
          <ApplicationReview
            key={`${submission.id}:${submission.revision}`}
            page
            submission={submission}
            data={detail}
            run={command}
            canManage={canManage}
            canConfirmDates={canConfirmDates}
            canBilling={canBilling}
            canRequestDocuments={canRequestDocuments}
            runBatch={batch}
            onBusy={setBusy}
            onDirty={setDirty}
            onSaved={query.refresh}
            onRefresh={query.refresh}
          />
        </>
      ) : (
        !query.loading &&
        !query.error && (
          <EmptyState title="Application unavailable">
            <p>This submission could not be found.</p>
          </EmptyState>
        )
      )}
    </div>
  );
}
