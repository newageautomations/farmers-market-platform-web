import { EmptyState } from '@market/ui';
import { Button } from '@market/ui';
import { useState } from 'react';
import {
  type MarketOperationsData,
  type OperationsCommand,
  type ApplicationVersion,
} from '@market/api';
import { ApplicationReview } from './ApplicationReview';
import { DataTable } from '../common';
import {
  MarketDialog as Dialog,
  StatusBadge,
  friendlyLabel,
} from '../presentation';

import { ApplicationBuilder } from './ApplicationBuilder';
export function Applications({
  data,
  run,
  canManage,
  canConfirmDates = false,
  canBilling = false,
  view = 'templates',
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates?: boolean;
  canBilling?: boolean;
  view?: 'templates' | 'submissions';
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const version = data.versions?.find((v) => v.id === selected);
  const submission = data.submissions?.find((s) => s.id === review);
  return (
    <div>
      {view === 'templates' ? (
        <>
          {canManage && (
            <div className="ops-toolbar">
              <Button
                variant="secondary"
                size="compact"
                type="button"
                onClick={async () => {
                  const row = (await run({
                    action: 'CREATE_APPLICATION',
                    data: { name: 'Untitled application' },
                  })) as ApplicationVersion;
                  if (row) setSelected(row.id);
                }}
              >
                Create application
              </Button>
            </div>
          )}
          {version ? (
            <>
              <Button
                variant="secondary"
                size="compact"
                type="button"
                onClick={() => setSelected(null)}
              >
                Back to applications
              </Button>
              <ApplicationBuilder
                key={`${version.id}:${version.revision}`}
                version={version}
                data={data}
                run={run}
                canManage={canManage}
                onSelect={setSelected}
              />
            </>
          ) : (
            <DataTable
              label="Applications"
              headings={['Application', 'Visibility', 'Status', 'Edit']}
            >
              {data.templates?.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    {friendlyLabel(t.visibility)}
                    {t.advertised && <small>Advertised on storefront</small>}
                  </td>
                  <td>
                    {data.versions
                      ?.filter((v) => v.templateId === t.id)
                      .map((v) => (
                        <div key={v.id}>
                          <StatusBadge>{v.status}</StatusBadge>
                        </div>
                      ))}
                  </td>
                  <td>
                    <div className="ops-toolbar">
                      {data.versions
                        ?.filter((v) => v.templateId === t.id)
                        .map((v) => (
                          <Button
                            variant="secondary"
                            size="compact"
                            key={v.id}
                            type="button"
                            onClick={() => setSelected(v.id)}
                          >
                            Open {friendlyLabel(v.status)}
                          </Button>
                        ))}
                      {canManage && (
                        <Button
                          variant="destructive"
                          size="compact"
                          type="button"
                          onClick={() =>
                            run({
                              action: 'RETIRE_APPLICATION',
                              id: t.id,
                              expectedRevision: t.revision,
                              data: {},
                            })
                          }
                        >
                          Retire Application
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data.templates?.length && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No applications yet">
                      <p>No applications yet.</p>
                    </EmptyState>
                  </td>
                </tr>
              )}
            </DataTable>
          )}
        </>
      ) : (
        <>
          <p>
            Open a submission to review the applicant's answers, requested
            dates, and rentals.
          </p>
          <DataTable
            label="Application submissions"
            headings={['Business', 'Email', 'Status', 'Review']}
          >
            {data.submissions?.map((s) => (
              <tr key={s.id}>
                <td>{s.applicant.businessName}</td>
                <td>{s.applicant.email}</td>
                <td>
                  <StatusBadge>{s.status}</StatusBadge>
                </td>
                <td>
                  <Button
                    variant="secondary"
                    size="compact"
                    type="button"
                    onClick={() => setReview(s.id)}
                  >
                    Review {s.applicant.businessName}
                  </Button>
                </td>
              </tr>
            ))}
            {!data.submissions?.length && (
              <tr>
                <td colSpan={4}>
                  <EmptyState title="No submissions yet">
                    <p>No submissions yet.</p>
                  </EmptyState>
                </td>
              </tr>
            )}
          </DataTable>
          <Dialog
            open={!!submission}
            busy={reviewBusy}
            focusTitle
            onClose={() => setReview(null)}
            title={
              submission
                ? `Application from ${submission.applicant.businessName}`
                : 'Application review'
            }
            showClose={false}
          >
            {(dismiss) =>
              submission && (
                <ApplicationReview
                  key={submission.id}
                  submission={submission}
                  onSaved={() => setReview(null)}
                  onBusy={setReviewBusy}
                  onClose={dismiss}
                  data={data}
                  run={run}
                  canManage={canManage}
                  canConfirmDates={canConfirmDates}
                  canBilling={canBilling}
                />
              )
            }
          </Dialog>
        </>
      )}
    </div>
  );
}
