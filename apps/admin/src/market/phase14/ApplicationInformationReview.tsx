import { useEffect, useState } from 'react';
import {
  applicationQuestionTypes,
  type ApplicationSubmission,
  type OperationsCommand,
  type QuestionType,
} from '@market/api';
import { ApplicationFields, Button, Card, Select } from '@market/ui';
import { InformationRecord } from '@market/ui';
import { Entry, Check, Control } from './common';
type RequestedQuestion = {
  originalId?: string;
  label: string;
  help: string;
  type: QuestionType;
  required: boolean;
  options: string[];
};
export function ApplicationInformationReview({
  submission: s,
  run,
  canManage,
  canRequestDocuments,
  onBusy,
  onRefresh,
  onDirty,
}: {
  submission: ApplicationSubmission;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canRequestDocuments: boolean;
  onBusy: (busy: boolean) => void;
  onRefresh?: () => void;
  onDirty?: (dirty: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [questions, setQuestions] = useState<RequestedQuestion[]>([]),
    [documentIds, setDocumentIds] = useState<string[]>([]),
    [preview, setPreview] = useState(false),
    [clientKey, setClientKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    onDirty?.(open);
  }, [open, onDirty]);
  const requests = s.informationRequests ?? [],
    eligible = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'NEEDS_INFO',
      'WAITLISTED',
    ].includes(s.status),
    active = requests.some((r) =>
      ['AWAITING_RESPONSE', 'RESPONDED'].includes(r.status),
    );
  const original = s.definitionSnapshot.questions.filter(
    (q) => !q.hidden && q.type !== 'INFO',
  );
  function change(index: number, patch: Partial<RequestedQuestion>) {
    setQuestions((q) =>
      q.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
    setPreview(false);
  }
  async function command(
    action: OperationsCommand['action'],
    data: Record<string, unknown>,
  ) {
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      const result = await run({
        action,
        id: s.id,
        expectedRevision: s.revision,
        data,
      });
      if (result == null) throw new Error('Unavailable');
      if (action === 'SEND_INFORMATION_REQUEST') {
        setOpen(false);
        setQuestions([]);
        setDocumentIds([]);
        setPreview(false);
        setClientKey(crypto.randomUUID());
      }
    } catch {
      setError(
        'The request could not be saved. Reload if another reviewer changed this application. Resolve or cancel the previous request before sending another.',
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="applicant-application-list"
      aria-label="Additional application information"
    >
      {requests.map((r) => (
        <InformationRecord key={r.id} request={r} original={s.answers}>
          <ApplicationFields
            definition={r.definition}
            answers={r.response?.answers ?? {}}
            readOnly
          />
          {r.status === 'AWAITING_RESPONSE' && (
            <p>
              The Vendor has not submitted a response. Saved progress remains
              private.
            </p>
          )}
          {r.documents.map((d) => (
            <p key={d.id}>
              {d.title}: {d.status ?? 'Status unavailable'}.{' '}
              <a href={`/market/documents?vendor=${s.responseVendorId}`}>
                Review documents
              </a>
            </p>
          ))}
          {canManage &&
            eligible &&
            ['AWAITING_RESPONSE', 'RESPONDED'].includes(r.status) && (
              <div className="actions">
                {r.status === 'RESPONDED' && (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void command('RESOLVE_INFORMATION_REQUEST', {
                        requestId: r.id,
                        revision: r.revision,
                      })
                    }
                  >
                    Mark request resolved
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive-outline"
                  disabled={busy}
                  onClick={() =>
                    void command('CANCEL_INFORMATION_REQUEST', {
                      requestId: r.id,
                      revision: r.revision,
                    })
                  }
                >
                  Cancel request
                </Button>
              </div>
            )}
        </InformationRecord>
      ))}
      {canManage &&
        eligible &&
        !active &&
        (!s.responseVendorId ? (
          <p>
            {s.identityMode === 'ACCOUNT_ONLY'
              ? 'This historical account-only application cannot use in-app responses. The applicant must submit a new application as an authorized Vendor.'
              : 'This application has no authorized Vendor association. In-app responses require the existing secure Vendor claim flow. A missing or expired claim proof cannot be replaced by matching an email address.'}
          </p>
        ) : !open ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(true)}
          >
            Request Additional Information
          </Button>
        ) : (
          <Card as="section" surface="embedded">
            <h3>Request additional information</h3>
            <fieldset disabled={busy}>
              <legend>Questions for the Vendor</legend>
              {questions.map((q, index) => (
                <Card key={index} surface="embedded">
                  {q.originalId !== undefined ? (
                    <Control label="Original question">
                      {(inputId) => (
                        <Select
                          id={inputId}
                          value={q.originalId}
                          onChange={(e) =>
                            change(index, { originalId: e.target.value })
                          }
                        >
                          <option value="">Choose an answer to clarify</option>
                          {original.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Control>
                  ) : (
                    <>
                      <Entry
                        label="Question label"
                        value={q.label}
                        onChange={(label) => change(index, { label })}
                      />
                      <Control label="Question type">
                        {(inputId) => (
                          <Select
                            id={inputId}
                            value={q.type}
                            onChange={(e) =>
                              change(index, {
                                type: e.target.value as QuestionType,
                              })
                            }
                          >
                            {applicationQuestionTypes
                              .filter((t) => t !== 'INFO')
                              .map((t) => (
                                <option key={t} value={t}>
                                  {t === 'BOOLEAN'
                                    ? 'Yes/No'
                                    : t.toLowerCase().replaceAll('_', ' ')}
                                </option>
                              ))}
                          </Select>
                        )}
                      </Control>
                      <Check
                        label="Response required"
                        checked={q.required}
                        onChange={(required) => change(index, { required })}
                      />
                      {['SINGLE_SELECT', 'MULTI_SELECT', 'DROPDOWN'].includes(
                        q.type,
                      ) && (
                        <Entry
                          label="Choices, separated by commas"
                          value={q.options.join(',')}
                          onChange={(value) =>
                            change(index, { options: value.split(',') })
                          }
                        />
                      )}
                    </>
                  )}
                  <Entry
                    label={
                      q.originalId !== undefined
                        ? 'Clarification requested'
                        : 'Help or context (optional)'
                    }
                    value={q.help}
                    maxLength={2000}
                    onChange={(help) => change(index, { help })}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setQuestions((items) =>
                        items.filter((_, i) => i !== index),
                      );
                      setPreview(false);
                    }}
                  >
                    Remove question
                  </Button>
                </Card>
              ))}
              <div className="actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={questions.length >= 20}
                  onClick={() => {
                    setQuestions((items) => [
                      ...items,
                      {
                        originalId: '',
                        label: '',
                        help: '',
                        type: 'SHORT_TEXT',
                        required: true,
                        options: [],
                      },
                    ]);
                    setPreview(false);
                  }}
                >
                  Clarify an answer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={questions.length >= 20}
                  onClick={() => {
                    setQuestions((items) => [
                      ...items,
                      {
                        label: '',
                        help: '',
                        type: 'SHORT_TEXT',
                        required: true,
                        options: [],
                      },
                    ]);
                    setPreview(false);
                  }}
                >
                  Ask a new question
                </Button>
              </div>
              {canRequestDocuments ? (
                <>
                  <p>
                    {!s.applicantVendorId &&
                      'Claiming an application does not create a compliance relationship. Document requests remain unavailable unless the existing compliance workflow authorizes this Vendor. '}
                    <a
                      href={`/market/documents?vendor=${s.responseVendorId}&request=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Request a document (opens in a new tab)
                    </a>{' '}
                    through compliance, then return and select its requirement
                    below. The compliance workflow sends its own document
                    notice.
                  </p>
                  {onRefresh && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onRefresh}
                    >
                      Refresh document requirements
                    </Button>
                  )}
                  {(s.documentOptions ?? []).map((d) => (
                    <Check
                      key={d.id}
                      label={`${d.title} (${d.status})`}
                      checked={documentIds.includes(d.id)}
                      onChange={(checked) => {
                        setDocumentIds((ids) =>
                          checked
                            ? [...ids, d.id]
                            : ids.filter((id) => id !== d.id),
                        );
                        setPreview(false);
                      }}
                    />
                  ))}
                </>
              ) : (
                <p>
                  Document requests require the existing document management
                  permission.
                </p>
              )}
              {preview && (
                <div role="status">
                  <p>
                    Review the request before sending. Original answers will
                    remain unchanged.
                  </p>
                  <ul>
                    {questions.map((q, i) => (
                      <li key={i}>
                        {q.originalId
                          ? original.find((item) => item.id === q.originalId)
                              ?.label
                          : q.label}
                        : {q.help || 'No additional context'} (
                        {q.originalId
                          ? 'original field validation'
                          : q.type === 'BOOLEAN'
                            ? 'Yes/No'
                            : q.type.toLowerCase().replaceAll('_', ' ')}
                        )
                      </li>
                    ))}
                  </ul>
                  <p>{documentIds.length} document requirements selected.</p>
                </div>
              )}
              <div className="actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setOpen(false);
                    setQuestions([]);
                    setDocumentIds([]);
                    setPreview(false);
                    setClientKey(crypto.randomUUID());
                  }}
                >
                  Discard request
                </Button>
                <Button
                  type="button"
                  disabled={
                    (!questions.length && !documentIds.length) ||
                    questions.some((q) =>
                      q.originalId !== undefined
                        ? !q.originalId
                        : !q.label.trim() ||
                          ([
                            'SINGLE_SELECT',
                            'MULTI_SELECT',
                            'DROPDOWN',
                          ].includes(q.type) &&
                            q.options.some((o) => !o.trim())),
                    )
                  }
                  onClick={() =>
                    preview
                      ? void command('SEND_INFORMATION_REQUEST', {
                          clientKey,
                          questions: questions.map((q) => ({
                            ...q,
                            options: q.options.map((o) => o.trim()),
                          })),
                          documentIds,
                        })
                      : setPreview(true)
                  }
                >
                  {preview ? 'Send request' : 'Review request'}
                </Button>
              </div>
            </fieldset>
          </Card>
        ))}
      {active && canManage && (
        <p>
          Resolve or cancel the current request before another round or a final
          application decision.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
