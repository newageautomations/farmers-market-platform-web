import { useState } from 'react';
import {
  type MarketOperationsData,
  type OperationsCommand,
  type ApplicationVersion,
  type ApplicationSubmission,
} from '@market/api';
import { ApplicationFields, Dialog } from '@market/ui';
import { Check, Control, Entry, moneyLabel } from './common';
import { ApplicationBuilder } from './ApplicationBuilder';
export function Applications({
  data,
  run,
  canManage,
  view = 'templates',
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  view?: 'templates' | 'submissions';
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const version = data.versions?.find((v) => v.id === selected);
  const submission = data.submissions?.find((s) => s.id === review);
  return (
    <div>
      {view === 'templates' ? (
        <>
          {canManage && (
            <div className="ops-toolbar">
              <button
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
              </button>
            </div>
          )}
          {version ? (
            <>
              <button type="button" onClick={() => setSelected(null)}>
                Back to applications
              </button>
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
            <ul className="ops-record-list">
              {data.templates?.map((t) => (
                <li key={t.id}>
                  <h2>{t.name}</h2>
                  <p>
                    {t.visibility.toLowerCase()}
                    {t.advertised ? ' · Advertised on storefront' : ''}
                  </p>
                  <div className="ops-toolbar">
                    {data.versions
                      ?.filter((v) => v.templateId === t.id)
                      .map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelected(v.id)}
                        >
                          Version {v.versionNumber} · {v.status.toLowerCase()}
                        </button>
                      ))}
                  </div>
                  <p>
                    Application path: <code>/apply/{t.slug}</code>
                  </p>
                  {canManage && (
                    <button
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
                      Retire application
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p>
            Open a submission to review the applicant's answers, requested
            dates, and rentals.
          </p>
          <ul className="ops-record-list">
            {data.submissions?.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setReview(s.id)}>
                  {s.applicant.businessName}
                </button>
                <p>
                  {s.status.toLowerCase()} · {s.applicant.email}
                </p>
              </li>
            ))}
          </ul>
          <Dialog
            open={!!submission}
            focusTitle
            onClose={() => setReview(null)}
            title={
              submission
                ? `Application from ${submission.applicant.businessName}`
                : 'Application review'
            }
          >
            {submission && (
              <ApplicationReview
                key={`${submission.id}:${submission.revision}`}
                submission={submission}
                data={data}
                run={run}
                canManage={canManage}
              />
            )}
          </Dialog>
        </>
      )}
    </div>
  );
}
function ApplicationReview({
  submission: s,
  data,
  run,
  canManage,
}: {
  submission: ApplicationSubmission;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const [dates, setDates] = useState<number[]>(s.requestedOccurrenceIds),
    [notes, setNotes] = useState(s.managerNotes),
    [vendor, setVendor] = useState(''),
    [directory, setDirectory] = useState(''),
    [occurrence, setOccurrence] = useState(
      String(s.requestedOccurrenceIds[0] ?? ''),
    ),
    [space, setSpace] = useState(''),
    [rentals, setRentals] = useState(s.rentalRequests);
  const plan = data.plans?.find((p) => p.occurrenceId === Number(occurrence));
  const command = (status: string, assign = false) =>
    run({
      action: assign ? 'ACCEPT_ASSIGN' : 'REVIEW_APPLICATION',
      id: s.id,
      expectedRevision: s.revision,
      data: {
        status,
        approvedOccurrenceIds: dates,
        managerNotes: notes,
        linkedVendorId: vendor ? Number(vendor) : null,
        confirmLink: !!vendor,
        directoryId: directory ? Number(directory) : null,
        occurrenceId: Number(occurrence),
        spaceId: Number(space),
        rentals,
      },
    });
  return (
    <section className="ops-editor" aria-label="Application review">
      <h2>{s.applicant.businessName}</h2>
      <p>
        {s.applicant.firstName} {s.applicant.lastName} · {s.applicant.email}
        {s.applicant.phone ? ` · ${s.applicant.phone}` : ''}
      </p>
      {(s.requirements.widthFeet > 0 ||
        s.requirements.depthFeet > 0 ||
        s.requirements.electricity ||
        s.requirements.vehicle ||
        s.requirements.foodTruck) && (
        <p>
          {s.requirements.widthFeet > 0 && s.requirements.depthFeet > 0
            ? `Booth requirement: ${s.requirements.widthFeet} × ${s.requirements.depthFeet} ft. `
            : ''}
          {s.requirements.electricity ? 'Electricity required.' : ''}{' '}
          {s.requirements.vehicle ? 'Vehicle access required.' : ''}
          {s.requirements.foodTruck ? ' Food truck space required.' : ''}
        </p>
      )}
      <ApplicationFields
        definition={s.definitionSnapshot}
        answers={s.answers}
        readOnly
      />
      <fieldset disabled={!canManage || s.status === 'ACCEPTED'}>
        <legend>Review requested dates and rentals</legend>
        {s.requestedOccurrenceIds.map((id) => (
          <Check
            key={id}
            label={new Date(
              data.occurrences.find((o) => o.id === id)?.startsAt ?? '',
            ).toLocaleString()}
            checked={dates.includes(id)}
            onChange={(v) =>
              setDates((d) => (v ? [...d, id] : d.filter((x) => x !== id)))
            }
          />
        ))}
        {rentals.map((r, i) => (
          <Entry
            key={r.optionId}
            label={`${r.name} quantity · ${moneyLabel(r.unitMinor, r.currency)} each`}
            type="number"
            min={0}
            max={1000}
            value={r.quantity}
            onChange={(v) =>
              setRentals((rows) =>
                rows.map((row, index) =>
                  index === i ? { ...row, quantity: Number(v) } : row,
                ),
              )
            }
          />
        ))}
        <Control label="Link to an existing directory business">
          {(id) => (
            <select
              id={id}
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
            >
              <option value="">Create external directory business</option>
              {data.directory?.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.contact.businessName}
                </option>
              ))}
            </select>
          )}
        </Control>
        <Control label="Deliberately link to platform Vendor">
          {(id) => (
            <select
              id={id}
              value={vendor}
              disabled={!!directory}
              onChange={(e) => setVendor(e.target.value)}
            >
              <option value="">Keep as external business</option>
              {data.eligibleVendors?.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </Control>
        <Entry
          label="Private manager notes"
          value={notes}
          onChange={setNotes}
        />
        <div className="ops-toolbar">
          {[
            'UNDER_REVIEW',
            'NEEDS_INFO',
            'WAITLISTED',
            'DECLINED',
            'WITHDRAWN',
            'ACCEPTED',
          ].map((status) => (
            <button type="button" key={status} onClick={() => command(status)}>
              {status === 'ACCEPTED'
                ? 'Accept selected dates'
                : status.toLowerCase().replaceAll('_', ' ')}
            </button>
          ))}
        </div>
        {data.spaces && (
          <>
            <Control label="Occurrence for Accept and Assign">
              {(id) => (
                <select
                  id={id}
                  value={occurrence}
                  onChange={(e) => setOccurrence(e.target.value)}
                >
                  {dates.map((id) => (
                    <option value={id} key={id}>
                      {new Date(
                        data.occurrences.find((o) => o.id === id)!.startsAt,
                      ).toLocaleString()}
                    </option>
                  ))}
                </select>
              )}
            </Control>
            <Control label="Compatible booth">
              {(id) => (
                <select
                  id={id}
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                >
                  <option value="">Choose a booth</option>
                  {data.spaces
                    ?.filter((s) => s.layoutVersionId === plan?.layoutVersionId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.details.label}
                      </option>
                    ))}
                </select>
              )}
            </Control>
            <button
              type="button"
              disabled={!space || !dates.includes(Number(occurrence))}
              onClick={() => command('ACCEPTED', true)}
            >
              Accept and assign
            </button>
          </>
        )}
      </fieldset>
      {s.status === 'ACCEPTED' && (
        <a
          className="button secondary"
          href={`/market/assignments?directory=${s.directoryId}`}
        >
          Assign approved dates
        </a>
      )}
    </section>
  );
}
