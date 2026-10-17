import { useCallback, useId, useState, type FormEvent } from 'react';
import type {
  AgreementDetail,
  AgreementListItem,
  AgreementPolicy,
  ComplianceCatalog,
  DocumentsApi,
} from '@market/api';
import {
  Alert,
  Button,
  Card,
  RecordCard,
  SearchSelect,
  SearchableMultiSelect,
  IconButton,
  Checkbox,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  Input,
  Pagination,
  SelectField,
  Textarea,
} from '@market/ui';
import { DocumentFeedback, DocumentStatus } from '@market/ui/documents';
import { ReadState, useRead } from '../vendor/common';

export function Agreements({
  api,
  manager,
  canWrite,
  onChanged,
}: {
  api: DocumentsApi;
  manager: boolean;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [skip, setSkip] = useState(0),
    [selected, setSelected] = useState<string>(),
    [editing, setEditing] = useState<AgreementPolicy | null>(),
    [generation, setGeneration] = useState(0);
  const read = useCallback(
    () =>
      api.advanced<{ items: AgreementListItem[]; hasMore: boolean }>({
        view: 'agreements',
        skip,
      }),
    [api, skip],
  );
  const state = useRead(`agreements:${skip}:${generation}`, read);
  const refresh = () => {
    setGeneration((n) => n + 1);
    onChanged();
  };
  return (
    <>
      <p>
        Read and acknowledge Market policies here. An acknowledgment is not a
        formal electronic signature.
      </p>
      {manager && (
        <Button disabled={!canWrite} onClick={() => setEditing(null)}>
          Create agreement
        </Button>
      )}
      <ReadState {...state} retry={state.refresh} />
      {state.data && (
        <>
          {!state.data.items.length && (
            <EmptyState title="No agreements">
              {manager
                ? 'Create a draft from an editable starting template.'
                : 'No policies have been assigned to this business.'}
            </EmptyState>
          )}
          <div className="documents-grid">
            {state.data.items.map((p) => (
              <RecordCard
                key={p.id}
                title={p.title}
                onOpen={() => setSelected(p.id)}
                summary={
                  <>
                    <p>
                      {p.market_name} ·{' '}
                      {p.current_version
                        ? `Published version ${p.current_version}`
                        : 'Draft'}
                    </p>
                    <DocumentStatus
                      value={
                        p.archived
                          ? 'Archived'
                          : manager
                            ? p.current_version
                              ? 'Published'
                              : 'Draft'
                            : p.acknowledged_at
                              ? 'Complete'
                              : p.required
                                ? 'Outstanding'
                                : 'Optional'
                      }
                    />
                  </>
                }
              />
            ))}
          </div>
          <Pagination
            summary={`Agreements ${skip + 1} to ${skip + state.data.items.length}`}
            hasPrevious={skip > 0}
            hasNext={state.data.hasMore}
            onPrevious={() => setSkip((n) => Math.max(0, n - 20))}
            onNext={() => setSkip((n) => n + 20)}
          />
        </>
      )}
      {selected && (
        <AgreementReader
          key={`${selected}:${generation}`}
          id={selected}
          api={api}
          manager={manager}
          canWrite={canWrite}
          onClose={() => setSelected(undefined)}
          onChanged={refresh}
          onEdit={setEditing}
        />
      )}
      {editing !== undefined && (
        <AgreementEditor
          api={api}
          policy={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}

export function AgreementEditor({
  api,
  policy,
  onClose,
  onSaved,
}: {
  api: DocumentsApi;
  policy: AgreementPolicy | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [content, setContent] = useState(policy?.draft ?? ''),
    [title, setTitle] = useState(policy?.title ?? ''),
    [kind, setKind] = useState(policy?.kind ?? 'Market policy');
  const read = useCallback(
    () => api.advanced<ComplianceCatalog>({ view: 'catalog' }),
    [api],
  );
  const catalog = useRead('agreement-templates', read);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      await api.command(
        'SAVE_AGREEMENT',
        {
          title,
          kind,
          content,
          stage: form.get('stage'),
          required: form.has('required'),
          affectsReadiness: form.has('affectsReadiness'),
          automatic: form.has('automatic'),
          dueOn: form.get('dueOn'),
        },
        policy?.id,
        policy?.revision,
      );
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={policy ? 'Edit agreement draft' : 'Create agreement draft'}
      onClose={onClose}
      busy={busy}
      actions={
        <Button form={id} type="submit" loading={busy}>
          Save draft
        </Button>
      }
    >
      <p>
        Publishing creates an immutable version. Saving a draft does not
        distribute requests. Use appropriate legal advice for contracts, waivers
        or formal signatures.
      </p>
      {policy && (
        <p>
          Saved collection settings apply to existing requests immediately.
          Edited agreement text and titles remain private until published.
        </p>
      )}
      <ReadState {...catalog} retry={catalog.refresh} />
      {!!error && <DocumentFeedback error={error} />}
      <form id={id} onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy}>
          <SelectField
            id={`${id}-template`}
            label="Starting template"
            defaultValue=""
            onChange={(e) => {
              const t = catalog.data?.agreementTemplates.find(
                (t) => t.title === e.target.value,
              );
              if (t) {
                setTitle(t.title);
                setKind(t.kind);
                setContent(t.content);
              }
            }}
          >
            <option value="">Write your own policy</option>
            {catalog.data?.agreementTemplates.map((t) => (
              <option key={t.title}>{t.title}</option>
            ))}
          </SelectField>
          <Field id={`${id}-title`} label="Agreement title">
            <Input
              id={`${id}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </Field>
          <Field id={`${id}-kind`} label="Policy type">
            <Input
              id={`${id}-kind`}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              required
              maxLength={100}
            />
          </Field>
          <Field id={`${id}-content`} label="Agreement contents">
            <Textarea
              id={`${id}-content`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={14}
              maxLength={30000}
            />
          </Field>
          <p>Plain text only. HTML and Markdown are displayed as text.</p>
          <SelectField
            id={`${id}-stage`}
            label="Collection stage"
            name="stage"
            defaultValue={policy?.stage ?? 'On request'}
          >
            {[
              'On request',
              'Application',
              'After acceptance',
              'Before participation',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>
          <Field id={`${id}-due`} label="Due date (optional)">
            <Input
              id={`${id}-due`}
              type="date"
              name="dueOn"
              defaultValue={policy?.due_on ?? ''}
            />
          </Field>
          <label className="document-checkbox" htmlFor={`${id}-required`}>
            <Checkbox
              id={`${id}-required`}
              name="required"
              defaultChecked={policy?.required}
            />{' '}
            Required acknowledgment
          </label>
          <label
            className="document-checkbox"
            htmlFor={`${id}-affectsReadiness`}
          >
            <Checkbox
              id={`${id}-affectsReadiness`}
              name="affectsReadiness"
              defaultChecked={policy?.affects_readiness}
            />{' '}
            Count required outstanding acknowledgments in readiness
          </label>
          <label className="document-checkbox" htmlFor={`${id}-automatic`}>
            <Checkbox
              id={`${id}-automatic`}
              name="automatic"
              defaultChecked={policy?.automatic}
            />{' '}
            Automatically assign at the collection stage for future eligible
            vendors
          </label>
          <p>
            Automatic distribution requires the existing Market automation
            setting. On request policies remain manual. No historical vendors
            are assigned automatically.
          </p>
        </fieldset>
      </form>
    </Dialog>
  );
}

export function AgreementReader({
  api,
  id,
  manager,
  canWrite,
  onClose,
  onChanged,
  onEdit,
}: {
  api: DocumentsApi;
  id: string;
  manager: boolean;
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (p: AgreementPolicy) => void;
}) {
  const [versionId, setVersionId] = useState(''),
    [skip, setSkip] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [confirmed, setConfirmed] = useState(false),
    [preview, setPreview] = useState<{
      assigned: number;
      acknowledged: number;
      nextVersion: number;
    }>(),
    [again, setAgain] = useState(false),
    [archiving, setArchiving] = useState(false);
  const read = useCallback(
    () =>
      api.advanced<AgreementDetail>({
        view: 'agreement',
        id,
        versionId: versionId || undefined,
        skip,
      }),
    [api, id, versionId, skip],
  );
  const state = useRead(`agreement:${id}:${versionId}:${skip}`, read),
    data = state.data,
    uid = useId();
  async function act(
    action: Parameters<DocumentsApi['command']>[0],
    values: Record<string, unknown>,
    target = id,
  ) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.command(
        action,
        values,
        target,
        data?.policy.revision,
      );
      if (action === 'PUBLISH_PREVIEW') setPreview(result as typeof preview);
      else {
        setPreview(undefined);
        onChanged();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const own = data?.assignments[0];
  return (
    <Dialog
      open
      title={data?.policy.title ?? 'Read agreement'}
      onClose={onClose}
      busy={busy}
    >
      <ReadState {...state} retry={state.refresh} />
      {!!error && <DocumentFeedback error={error} />}
      {data && (
        <>
          <p>
            {data.policy.market_name} ·{' '}
            {data.policy.archived
              ? 'Archived agreement'
              : data.policy.required
                ? 'Required acknowledgment'
                : 'Optional acknowledgment'}
          </p>
          <SearchSelect
            id={`${uid}-version`}
            label="Published version"
            value={versionId || data.version?.id || ''}
            onChange={(value) => {
              setVersionId(value);
              setConfirmed(false);
            }}
            options={data.versions.map((v) => ({
              value: v.id,
              label: 'Version ' + v.number,
            }))}
            placeholder="Choose a version"
          />
          {data.version ? (
            <>
              <p>
                Version {data.version.number} · Published{' '}
                {new Date(data.version.published_at).toLocaleString()}
              </p>
              <article
                className="agreement-content"
                aria-label={`Agreement version ${data.version.number}`}
              >
                {data.version.content}
              </article>
            </>
          ) : (
            <Alert severity="neutral">
              This draft has no published version.
            </Alert>
          )}
          {!manager &&
            own &&
            !own.acknowledged_at &&
            own.version_id === data.version?.id &&
            !data.policy.archived && (
              <>
                <label className="document-checkbox" htmlFor={`${uid}-confirm`}>
                  <Checkbox
                    id={`${uid}-confirm`}
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    disabled={!canWrite || busy}
                  />{' '}
                  I have read and acknowledge {data.version.title}, Version{' '}
                  {data.version.number}.
                </label>
                <Button
                  disabled={!canWrite || !confirmed || busy}
                  onClick={() =>
                    void act(
                      'ACKNOWLEDGE',
                      { confirm: true, versionId: own.version_id },
                      own.id,
                    )
                  }
                >
                  Acknowledge agreement
                </Button>
              </>
            )}
          <p>
            This records a simple electronic acknowledgment. It does not verify
            a legal signature or determine whether a contract or waiver is
            enforceable.
          </p>
          {manager && !data.policy.archived && (
            <>
              <div className="ui-control-row">
                <IconButton
                  icon="edit"
                  label="Edit agreement draft"
                  disabled={!canWrite || busy}
                  onClick={() => onEdit(data.policy)}
                />
                <Button
                  disabled={!canWrite || busy}
                  onClick={() => void act('PUBLISH_PREVIEW', {})}
                >
                  Preview publication
                </Button>
                <Button
                  variant="destructive"
                  disabled={!canWrite || busy}
                  onClick={() => setArchiving(true)}
                >
                  Archive agreement
                </Button>
              </div>
              {archiving && (
                <Alert severity="warning">
                  <p>
                    Archive this policy and retire its outstanding requests?
                    Acknowledgment history will remain available.
                  </p>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void act('ARCHIVE_AGREEMENT', {})}
                  >
                    Confirm archive
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setArchiving(false)}
                  >
                    Keep policy
                  </Button>
                </Alert>
              )}
              {preview && (
                <Card>
                  <p>
                    Publish version {preview.nextVersion}. There are{' '}
                    {preview.assigned} existing assignments, including{' '}
                    {preview.acknowledged} acknowledged requests.
                  </p>
                  <label className="document-checkbox" htmlFor={`${uid}-again`}>
                    <Checkbox
                      id={`${uid}-again`}
                      checked={again}
                      onChange={(e) => setAgain(e.target.checked)}
                    />{' '}
                    Request this version again from existing assigned vendors
                  </label>
                  <p>
                    {again
                      ? `${preview.assigned} requests will target the new version. Previous acknowledgments remain in history.`
                      : 'Existing requests and acknowledgments keep their current version.'}{' '}
                    No additional historical vendors will receive requests.
                  </p>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act('PUBLISH_AGREEMENT', {
                        requestAgain: again,
                        affectedCount: preview.assigned,
                      })
                    }
                  >
                    Publish version {preview.nextVersion}
                  </Button>
                </Card>
              )}
              {data.policy.current_version && (
                <AssignAgreement
                  api={api}
                  policy={data.policy}
                  disabled={!canWrite || busy}
                  onChanged={onChanged}
                />
              )}
            </>
          )}
          <DataTable
            label="Agreement assignments"
            headings={['Vendor', 'Requested version', 'Acknowledgment']}
          >
            {data.assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.vendor_name}</td>
                <td>{a.version}</td>
                <td>
                  {a.acknowledged_at
                    ? new Date(a.acknowledged_at).toLocaleString()
                    : 'Outstanding'}
                </td>
              </tr>
            ))}
          </DataTable>
          <DataTable
            label="Acknowledgment history"
            headings={['Vendor', 'Version', 'Acknowledged at', 'User']}
          >
            {data.history.map((h) => (
              <tr key={h.id}>
                <td>{h.vendor_name}</td>
                <td>{h.version}</td>
                <td>{new Date(h.acknowledged_at).toLocaleString()}</td>
                <td>{h.actor_id}</td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            summary={`Assignments and history, page ${Math.floor(skip / 20) + 1}`}
            hasPrevious={skip > 0}
            hasNext={data.hasMore}
            onPrevious={() => setSkip((n) => Math.max(0, n - 20))}
            onNext={() => setSkip((n) => n + 20)}
          />
        </>
      )}
    </Dialog>
  );
}

function AssignAgreement({
  api,
  policy,
  disabled,
  onChanged,
}: {
  api: DocumentsApi;
  policy: AgreementPolicy;
  disabled: boolean;
  onChanged: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const read = useCallback(() => api.read(), [api]);
  const state = useRead('agreement-eligible-vendors', read);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        void api
          .command(
            'ASSIGN_AGREEMENT',
            { vendorIds: form.getAll('vendorIds').map(Number) },
            policy.id,
            policy.revision,
          )
          .then(onChanged)
          .catch(setError)
          .finally(() => setBusy(false));
      }}
    >
      <ReadState {...state} retry={state.refresh} />
      <SearchableMultiSelect
        id={id}
        name="vendorIds"
        label="Vendors to request acknowledgment"
        required
        disabled={disabled || busy}
        options={(state.data?.vendors ?? []).map((v) => ({
          value: String(v.id),
          label: v.name,
        }))}
      />
      {state.data?.truncated && (
        <Alert severity="warning">
          This eligible Vendor list is limited. Narrow the existing Vendor
          compliance workspace for larger Markets.
        </Alert>
      )}
      <Button type="submit" disabled={disabled || busy}>
        Request acknowledgment
      </Button>
      {!!error && <DocumentFeedback error={error} />}
    </form>
  );
}
