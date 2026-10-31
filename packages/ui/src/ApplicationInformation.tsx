import { useState } from 'react';
import type {
  ApplicationInformationRequest,
  ApplicationDefinition,
  ApplicantApplicationsApi,
} from '@market/api';
import { ApplicationFields, Badge, Button, Card } from './index';

export function InformationRecord({
  request,
  original,
  children,
}: {
  request: ApplicationInformationRequest;
  original: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  return (
    <Card as="section" id={`information-request-${request.id}`}>
      <h3>Additional information requested</h3>
      <Badge>
        {
          {
            AWAITING_RESPONSE: 'Awaiting response',
            RESPONDED: 'Response submitted',
            RESOLVED: 'Reviewed and resolved',
            CANCELLED: 'Cancelled',
          }[request.status]
        }
      </Badge>
      <p>Requested {new Date(request.createdAt).toLocaleString()}</p>
      {Object.entries(request.references).map(([key, source]) => (
        <div key={key}>
          <strong>
            {request.definition.questions.find((q) => q.id === key)?.label}
          </strong>
          <p>
            Original submitted answer:{' '}
            {Array.isArray(original[source])
              ? (original[source] as unknown[]).join(', ')
              : typeof original[source] === 'boolean'
                ? original[source]
                  ? 'Yes'
                  : 'No'
                : String(original[source] ?? 'No answer')}
          </p>
        </div>
      ))}
      {request.response?.submittedAt && (
        <p>
          Response submitted{' '}
          {new Date(request.response.submittedAt).toLocaleString()}
        </p>
      )}
      {request.response && !request.response.submittedAt && (
        <p>
          Unsubmitted progress, last saved{' '}
          {new Date(request.response.updatedAt).toLocaleString()}
        </p>
      )}
      {request.reviewedAt && (
        <p>Reviewed {new Date(request.reviewedAt).toLocaleString()}</p>
      )}
      {children}
    </Card>
  );
}
/** Feature composition over ApplicationFields, preserving the immutable original renderer. */
export function ApplicationInformationResponse({
  request,
  original,
  api,
  submissionId,
  vendorId,
  documentHref,
  onSubmitted,
  eligible = true,
}: {
  request: ApplicationInformationRequest;
  original: Record<string, unknown>;
  api: ApplicantApplicationsApi;
  submissionId: number;
  vendorId: number;
  documentHref: string;
  onSubmitted: () => void;
  eligible?: boolean;
}) {
  const [answers, setAnswers] = useState(request.response?.answers ?? {}),
    [revision, setRevision] = useState(request.response?.revision ?? 0),
    [saved, setSaved] = useState(request.response?.updatedAt ?? ''),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const editable =
    eligible &&
    request.status === 'AWAITING_RESPONSE' &&
    !request.response?.submittedAt;
  async function save(submit: boolean) {
    setBusy(true);
    setError('');
    try {
      const result = await api.command<{ revision: number; updatedAt: string }>(
        submit ? 'SUBMIT_INFORMATION_RESPONSE' : 'SAVE_INFORMATION_RESPONSE',
        {
          id: submissionId,
          vendorId,
          requestId: request.id,
          revision,
          answers,
        },
      );
      setRevision(result.revision);
      setSaved(result.updatedAt);
      setDirty(false);
      if (submit) onSubmitted();
    } catch {
      setError(
        'Could not save this response. Check the requested fields. If this application changed, reload before trying again.',
      );
    } finally {
      setBusy(false);
    }
  }
  const definition: ApplicationDefinition = request.definition;
  return (
    <InformationRecord request={request} original={original}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <fieldset disabled={busy}>
          <legend>{editable ? 'Your response' : 'Response history'}</legend>
          <ApplicationFields
            definition={definition}
            answers={answers}
            readOnly={!editable}
            onAnswer={(key, value) => {
              setAnswers((a) => ({ ...a, [key]: value }));
              setDirty(true);
            }}
          />
          {request.documents.map((d) => (
            <p key={d.id}>
              {d.title}: {d.status ?? 'Status unavailable'}.{' '}
              <a href={documentHref}>Open requirements and documents</a>
            </p>
          ))}
          {!!request.documents.length && (
            <p>
              Upload and share required documents through the document workflow
              before submitting your response. Documents awaiting review are
              allowed. Submitting these answers does not approve a document.
            </p>
          )}
          {editable && (
            <>
              <p role="status">
                {dirty
                  ? 'Unsaved changes'
                  : saved
                    ? `Progress saved ${new Date(saved).toLocaleString()}`
                    : 'No response saved yet'}
              </p>
              <div className="actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void save(false)}
                >
                  Save progress
                </Button>
                <Button type="submit" disabled={busy}>
                  Submit response
                </Button>
              </div>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </fieldset>
      </form>
    </InformationRecord>
  );
}
