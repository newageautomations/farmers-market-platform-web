import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  createDocumentsApi,
  type ComplianceData,
  type ComplianceDocument,
  type ComplianceRequest,
  type DocumentsApi,
  type ComplianceAction,
  type ComplianceCatalog,
} from '@market/api';
import {
  Alert,
  Button,
  Card,
  RecordCard,
  IconButton,
  SearchableMultiSelect,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  Input,
  Pagination,
  SelectField,
  Spinner,
  Tabs,
} from '@market/ui';
import type { AdminContext } from '@market/admin-core';
import './documents.css';
import { Agreements } from './Agreements';
import { ComplianceReports } from './ComplianceReports';
import { ComplianceGuidance } from './ComplianceGuidance';
import {
  DocumentFeedback as Feedback,
  DocumentStatus as Status,
  DocumentUploadDialog as UploadDialog,
  DocumentShareDialog as ShareDialog,
  MetadataFields,
  DocumentVersionPicker,
  formMetadata,
} from '@market/ui/documents';
export { DocumentUploadWarning, MetadataFields } from '@market/ui/documents';

function AutomationSettings({
  api,
  data,
  disabled,
  onSaved,
}: {
  api: DocumentsApi;
  data: ComplianceData;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const settings = data.settings ?? { automation_enabled: false, revision: 0 };
  return (
    <Card>
      <p>
        Automatic document requests are{' '}
        {settings.automation_enabled ? 'enabled' : 'off'} for this market. Each
        requirement must also use automatic distribution. Enabling this switch
        does not assign historical vendors or deliver notifications.
      </p>
      <Button
        variant="secondary"
        disabled={disabled || busy}
        onClick={() => {
          setBusy(true);
          void api
            .command(
              'SET_AUTOMATION',
              { enabled: !settings.automation_enabled },
              undefined,
              settings.revision,
            )
            .then(onSaved)
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        {settings.automation_enabled
          ? 'Turn off automatic requests'
          : 'Enable automatic requests'}
      </Button>
      {!!error && <Feedback error={error} />}
    </Card>
  );
}
function DistributionSettings({
  api,
  requirement: r,
  disabled,
  onSaved,
}: {
  api: DocumentsApi;
  requirement: ComplianceData['requirements'][number];
  disabled: boolean;
  onSaved: () => void;
}) {
  const id = useId(),
    [automatic, setAutomatic] = useState(r.automatic ?? false),
    [stage, setStage] = useState(r.stage),
    [blocking, setBlocking] = useState(r.submission_blocking ?? false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <form
      className="ui-control-row"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void api
          .command(
            'CONFIGURE_REQUIREMENT',
            {
              stage,
              automatic,
              submissionBlocking:
                stage === 'Application' && automatic && r.required && blocking,
            },
            r.id,
          )
          .then(onSaved)
          .catch(setError)
          .finally(() => setBusy(false));
      }}
    >
      <SelectField
        id={`${id}-stage`}
        label="Collection stage"
        value={stage}
        disabled={disabled || busy}
        onChange={(e) => {
          setStage(e.target.value);
          if (e.target.value === 'On request') setAutomatic(false);
        }}
      >
        {[
          'Application',
          'After acceptance',
          'Before participation',
          'On request',
        ].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </SelectField>
      <SelectField
        id={`${id}-distribution`}
        label="Distribution"
        value={automatic ? 'automatic' : 'manual'}
        disabled={disabled || busy}
        onChange={(e) => setAutomatic(e.target.value === 'automatic')}
      >
        <option value="manual">Manual requests</option>
        <option
          value="automatic"
          disabled={!r.market_wide || stage === 'On request'}
        >
          Automatic requests
        </option>
      </SelectField>
      {stage === 'Application' && automatic && r.required && (
        <label>
          <input
            type="checkbox"
            checked={blocking}
            disabled={disabled || busy}
            onChange={(e) => setBlocking(e.target.checked)}
          />{' '}
          Must be shared before submission
        </label>
      )}
      <p>
        {automatic
          ? `Automatically requests documents ${stage === 'Application' ? 'when an authorized vendor begins or submits an application' : 'when a vendor is accepted or their membership is approved'}, only while market automation is enabled. Existing assignments keep their reviews.`
          : 'Only an explicit manager request or synchronization creates assignments.'}
      </p>
      {!r.market_wide && (
        <p>
          Automatic distribution is available for market-wide requirements.
          Create a market-wide requirement to apply it to future vendors.
        </p>
      )}
      <Button type="submit" disabled={disabled || busy}>
        Save
      </Button>
      {!!error && <Feedback error={error} />}
    </form>
  );
}

function EditDialog({
  doc,
  categories,
  api,
  onClose,
  onSaved,
}: {
  doc: ComplianceDocument;
  categories: string[];
  api: DocumentsApi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.command(
        'EDIT',
        { ...formMetadata(event.currentTarget) },
        doc.id,
        doc.revision,
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title="Edit document information"
      busy={busy}
      onClose={onClose}
      actions={
        <Button type="submit" form={id} loading={busy}>
          Save
        </Button>
      }
    >
      <p>
        Previously shared submissions keep the file version and dates that were
        submitted. Share again to submit updated information.
      </p>
      {!!error && <Feedback error={error} />}
      <form id={id} onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy}>
          <MetadataFields categories={categories} value={doc.metadata} />
        </fieldset>
      </form>
    </Dialog>
  );
}
function ConfirmAction({
  title,
  children,
  run,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  run: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <Dialog
      open
      title={title}
      busy={busy}
      onClose={onClose}
      actions={
        <Button
          variant="destructive"
          loading={busy}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            void run()
              .then(onClose)
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          Confirm
        </Button>
      }
    >
      {children}
      {!!error && <Feedback error={error} />}
    </Dialog>
  );
}
export function RequirementDialog({
  api,
  data,
  onClose,
  onSaved,
  vendorId,
  initialCategory,
}: {
  initialCategory?: string;
  vendorId?: number;
  api: DocumentsApi;
  data: ComplianceData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [template, setTemplate] = useState(
      initialCategory ?? data.categories[0] ?? '',
    ),
    [wide, setWide] = useState(false),
    [automatic, setAutomatic] = useState(false),
    [stage, setStage] = useState('Before participation'),
    [required, setRequired] = useState(true);
  const [catalog, setCatalog] = useState<ComplianceCatalog>();
  useEffect(() => {
    let active = true;
    void api
      .advanced<ComplianceCatalog>({ view: 'catalog' })
      .then((c) => {
        if (active) setCatalog(c);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);
  const suggestion = catalog?.documentTemplates.find(
    (t) => t.category === template,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      await api.command('CREATE_REQUIREMENT', {
        title: form.get('requirementTitle'),
        category: form.get('category'),
        instructions: form.get('instructions'),
        required: form.has('required'),
        stage: form.get('stage'),
        dueOn: form.get('dueOn'),
        approvalRequired: form.has('approvalRequired'),
        expirationRequired: form.has('expirationRequired'),
        marketWide: automatic || wide,
        automatic,
        submissionBlocking: form.has('submissionBlocking'),
        vendorIds: form.getAll('vendorIds').map(Number),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title="Request documents"
      busy={busy}
      onClose={onClose}
      actions={
        <Button type="submit" form={id} loading={busy}>
          Create requirement
        </Button>
      }
    >
      <Alert severity="warning">
        Request only supported market participation documents. Custom names
        cannot be used to request sensitive personal, tax, identity, banking,
        payment or medical documents.
      </Alert>
      <p>
        Suggested categories are starting points. They do not determine what
        vendors legally need.
      </p>
      {!!error && <Feedback error={error} />}
      <form id={id} onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy}>
          <SelectField
            id={`${id}-template`}
            label="Suggested document type"
            name="category"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            {data.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <Field id={`${id}-title`} label="Requirement name">
            <Input
              key={template}
              id={`${id}-title`}
              name="requirementTitle"
              defaultValue={template}
              required
              maxLength={200}
            />
          </Field>
          <Field id={`${id}-instructions`} label="Instructions">
            <Input
              key={template}
              id={`${id}-instructions`}
              name="instructions"
              maxLength={2000}
              defaultValue={suggestion?.instructions ?? ''}
            />
          </Field>
          <SelectField
            id={`${id}-stage`}
            label="Submission stage"
            name="stage"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              if (e.target.value === 'On request') setAutomatic(false);
            }}
          >
            <option>Before participation</option>
            <option>Application</option>
            <option>After acceptance</option>
            <option>On request</option>
          </SelectField>
          <Field id={`${id}-due`} label="Due date (optional)">
            <Input id={`${id}-due`} name="dueOn" type="date" />
          </Field>
          <label className="document-checkbox">
            <input
              type="checkbox"
              name="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />{' '}
            Required
          </label>
          <label className="document-checkbox">
            <input type="checkbox" name="approvalRequired" defaultChecked />{' '}
            Manager approval required
          </label>
          <label className="document-checkbox">
            <input
              key={template}
              type="checkbox"
              name="expirationRequired"
              defaultChecked={suggestion?.expirationRelevant ?? false}
            />{' '}
            An expiration date is required
          </label>
          <SelectField
            id={`${id}-distribution`}
            label="Distribution"
            value={automatic ? 'automatic' : 'manual'}
            onChange={(e) => setAutomatic(e.target.value === 'automatic')}
          >
            <option value="manual">Manual requests</option>
            <option value="automatic" disabled={stage === 'On request'}>
              Automatic requests for future applicants or acceptances
            </option>
          </SelectField>
          {automatic && (
            <p>
              Requires this market's automation switch. No existing vendors are
              assigned when this requirement is created.
            </p>
          )}
          {automatic && stage === 'Application' && required && (
            <label className="document-checkbox">
              <input name="submissionBlocking" type="checkbox" /> Require a
              valid shared document before application submission
            </label>
          )}
          {stage === 'On request' && automatic && (
            <p>Choose manual distribution for an on-request requirement.</p>
          )}
          {!automatic && (
            <label className="document-checkbox">
              <input
                type="checkbox"
                checked={wide}
                onChange={(e) => setWide(e.target.checked)}
              />{' '}
              Assign to all associated vendors now
            </label>
          )}
          {!wide && !automatic && (
            <SearchableMultiSelect
              id={`${id}-vendors`}
              label="Vendors (select one or more)"
              name="vendorIds"
              defaultValue={vendorId ? [String(vendorId)] : []}
              options={data.vendors.map((v) => ({
                value: String(v.id),
                label: v.name,
              }))}
            />
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
function ReviewDialog({
  api,
  request,
  decision,
  onClose,
  onSaved,
}: {
  api: DocumentsApi;
  request: ComplianceRequest;
  decision: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.command(
        ['Waived', 'Required'].includes(decision) ? 'WAIVE' : 'REVIEW',
        {
          decision,
          reason: new FormData(event.currentTarget).get('reason'),
          submissionId: request.submission?.id,
        },
        request.id,
        request.revision,
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={`${decision === 'Required' ? 'Restore requirement' : decision} document requirement`}
      busy={busy}
      onClose={onClose}
      actions={
        <Button form={id} type="submit" loading={busy}>
          Record decision
        </Button>
      }
    >
      <p>
        {request.vendor_name}: {request.title}. The decision applies to this
        market's submission only.
      </p>
      {request.submission && (
        <p>
          Submitted expiration:{' '}
          {request.submission.metadata.noExpiration
            ? 'No expiration'
            : request.submission.metadata.expiresOn}
          . Verify the actual file before approving.
        </p>
      )}
      {!!error && <Feedback error={error} />}
      <form id={id} onSubmit={(e) => void submit(e)}>
        <Field
          id={`${id}-reason`}
          label={`Reason${decision === 'Approved' ? ' (optional)' : ''}`}
        >
          <Input
            id={`${id}-reason`}
            name="reason"
            required={decision !== 'Approved'}
            maxLength={2000}
            disabled={busy}
          />
        </Field>
      </form>
    </Dialog>
  );
}
export function DocumentsWorkspace({
  context,
  connection,
}: {
  context: AdminContext;
  connection: {
    endpoint: string;
    channelToken: string;
    onAuthorityFailure?: () => void;
  };
}) {
  const { endpoint, channelToken, onAuthorityFailure } = connection;
  const api = useMemo(
    () => createDocumentsApi({ endpoint, channelToken, onAuthorityFailure }),
    [endpoint, channelToken, onAuthorityFailure],
  );
  return (
    <Workspace
      key={`${context.scope}:${channelToken}`}
      api={api}
      manager={context.scope === 'MARKET'}
      canWrite={context.permissions.includes(
        context.scope === 'MARKET'
          ? 'ManageOwnMarketMemberships'
          : 'ManageOwnStorefront',
      )}
    />
  );
}
export function Workspace({
  api,
  manager,
  canWrite,
}: {
  api: DocumentsApi;
  manager: boolean;
  canWrite: boolean;
}) {
  const [skip, setSkip] = useState(0),
    [revision, setRevision] = useState(0),
    [result, setResult] = useState<{
      data?: ComplianceData;
      error?: unknown;
      skip: number;
      revision: number;
    }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const [upload, setUpload] = useState<{
      doc?: ComplianceDocument;
      request?: ComplianceRequest;
    }>(),
    [edit, setEdit] = useState<ComplianceDocument>(),
    [share, setShare] = useState<ComplianceRequest>(),
    [requirement, setRequirement] = useState(
      manager &&
        canWrite &&
        new URLSearchParams(window.location.search).get('request') === '1',
    ),
    [review, setReview] = useState<{
      request: ComplianceRequest;
      decision: string;
    }>(),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      run: () => Promise<unknown>;
    }>();
  useEffect(() => {
    let active = true;
    void api
      .read(skip)
      .then((data) => {
        if (active) setResult({ data, skip, revision });
      })
      .catch((e) => {
        if (active) setResult({ error: e, skip, revision });
      });
    return () => {
      active = false;
    };
  }, [api, skip, revision]);
  const refresh = () => setRevision((r) => r + 1);
  async function command(
    action: ComplianceAction,
    data: Record<string, unknown>,
    id?: string,
    expected?: number,
  ) {
    await api.command(action, data, id, expected);
    refresh();
  }
  async function download(id: string) {
    setBusy(true);
    setError(undefined);
    try {
      const file = await api.download(id),
        binary = atob(file.bytesBase64),
        bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: 'application/octet-stream' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!result || result.skip !== skip)
    return <Spinner label="Loading documents" />;
  if (result.error)
    return (
      <>
        <Feedback error={result.error} />
        <Button onClick={refresh}>Retry</Button>
      </>
    );
  const data = result.data!;
  const requestedVendor = Number(
    new URLSearchParams(window.location.search).get('vendor'),
  );
  const requestedMarket = Number(
    new URLSearchParams(window.location.search).get('market'),
  );
  const visibleVendors =
    manager && requestedVendor
      ? data.vendors.filter((v) => v.id === requestedVendor)
      : data.vendors;
  const library = (
    <>
      <div className="ui-actions">
        <Button onClick={() => setUpload({})} disabled={!canWrite || busy}>
          Upload document
        </Button>
        <IconButton
          icon="refresh"
          label="Refresh documents"
          onClick={refresh}
        />
      </div>
      <p>
        This library is private to the current business or market. Dates use{' '}
        {data.timezone}; expiring soon means within 30 days. Use Delete to
        remove prohibited content and revoke future access.
      </p>
      {!data.documents.length ? (
        <EmptyState title="No documents saved">
          <p>
            Upload a participation document to keep it in your private library.
          </p>
        </EmptyState>
      ) : (
        <div className="documents-grid">
          {data.documents.map((doc) => {
            const current = doc.files.find((f) => f.status === 'Available'),
              latest = doc.files[0];
            return (
              <RecordCard
                key={doc.id}
                title={doc.metadata.title}
                summary={
                  <>
                    {' '}
                    <div
                      className="document-placeholder"
                      aria-label="File type placeholder"
                    >
                      {current?.mime === 'application/pdf'
                        ? 'PDF'
                        : current
                          ? 'Image'
                          : 'File'}
                    </div>
                    <p>{doc.metadata.category}</p>
                    <Status value={latest?.status ?? 'Scanning'} />{' '}
                    <Status value={doc.expiration} />
                    <p>
                      {doc.metadata.noExpiration
                        ? 'No expiration'
                        : `Expires ${doc.metadata.expiresOn}`}
                    </p>
                  </>
                }
              >
                <p>{doc.metadata.category}</p>
                <Status value={latest?.status ?? 'Scanning'} />{' '}
                <Status value={doc.expiration} />
                <p>
                  {doc.metadata.noExpiration
                    ? 'No expiration'
                    : 'Expires ' + doc.metadata.expiresOn}
                </p>
                {!!error && <Feedback error={error} />}
                {doc.metadata.issuedOn && <p>Issued {doc.metadata.issuedOn}</p>}
                {doc.metadata.notes && <p>{doc.metadata.notes}</p>}
                <p>
                  Uploaded {new Date(doc.created_at).toLocaleDateString()}.
                  Updated {new Date(doc.updated_at).toLocaleDateString()}.
                </p>
                {latest?.status !== 'Available' && current && (
                  <p>
                    The replacement is unavailable. The previous scanned version
                    can still be downloaded.
                  </p>
                )}
                <div className="ui-actions">
                  <IconButton
                    icon="edit"
                    label="Edit document information"
                    disabled={!canWrite || busy}
                    onClick={() => setEdit(doc)}
                  />
                  <Button
                    variant="secondary"
                    disabled={!canWrite}
                    onClick={() => setUpload({ doc })}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!canWrite}
                    onClick={() =>
                      setConfirm({
                        title: 'Delete document',
                        message:
                          'This removes every file version from the library and revokes future downloads. Existing external downloads cannot be recalled. Review history is retained.',
                        run: () => command('DELETE', {}, doc.id, doc.revision),
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <DocumentVersionPicker
                  document={doc}
                  busy={busy}
                  onDownload={(id) => void download(id)}
                />
                {doc.shares.length === 0 ? (
                  <p>No markets have been granted access.</p>
                ) : (
                  doc.shares.map((s) => (
                    <div key={s.id}>
                      <p>
                        {s.market_name} ·{' '}
                        {s.revoked_at ? 'Access revoked' : 'Access granted'}
                      </p>
                      {!s.revoked_at && canWrite && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setConfirm({
                              title: 'Revoke market access',
                              message:
                                'This prevents future access to this submission. Previously downloaded copies cannot be recalled. Other submissions retain their individual grants.',
                              run: () =>
                                command('REVOKE', { documentId: doc.id }, s.id),
                            })
                          }
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </RecordCard>
            );
          })}
        </div>
      )}
      <Pagination
        summary={`${data.total} documents`}
        hasPrevious={skip > 0}
        hasNext={skip + 20 < data.total}
        onPrevious={() => setSkip(Math.max(0, skip - 20))}
        onNext={() => setSkip(skip + 20)}
      />
    </>
  );
  const requestCards = (v: { id: number; name: string }) => (
    <div id={`vendor-${v.id}`} key={v.id}>
      {data.requests
        .filter((r) =>
          manager
            ? r.vendor_id === v.id
            : !requestedMarket || r.market_id === requestedMarket,
        )
        .map((request) => (
          <RecordCard
            key={request.id}
            title={request.title}
            summary={
              <>
                <p>{request.category}</p>
                <Status value={request.status} />
                {request.expiration && <Status value={request.expiration} />}
              </>
            }
          >
            {!!error && <Feedback error={error} />}
            <p>
              {manager ? request.vendor_name : request.market_name} ·{' '}
              {request.category} · {request.required ? 'Required' : 'Optional'}
            </p>
            <Status value={request.status} />{' '}
            {request.expiration && <Status value={request.expiration} />}
            <p>{request.instructions}</p>
            {request.source && (
              <p>
                Requested by: {request.source.replaceAll('_', ' ')}
                {request.created_at
                  ? ` on ${new Date(request.created_at).toLocaleDateString()}`
                  : ''}
                .
              </p>
            )}
            <p>
              {request.stage}
              {request.due_on ? ` · Due ${request.due_on}` : ''}
            </p>
            {request.submission && (
              <p>
                Submitted{' '}
                {new Date(request.submission.created_at).toLocaleDateString()}:{' '}
                {request.submission.metadata.title}. Expiration:{' '}
                {request.submission.metadata.noExpiration
                  ? 'No expiration'
                  : request.submission.metadata.expiresOn}
                .
              </p>
            )}
            <div className="ui-actions">
              {manager ? (
                <>
                  {request.submission &&
                    !['Access revoked', 'Missing'].includes(request.status) && (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void download(request.submission!.file_id)
                        }
                      >
                        Download
                      </Button>
                    )}
                  {request.submission && canWrite && !request.waived && (
                    <>
                      <Button
                        disabled={
                          request.status === 'Expired' ||
                          request.status === 'Access revoked'
                        }
                        onClick={() =>
                          setReview({ request, decision: 'Approved' })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={request.status === 'Access revoked'}
                        onClick={() =>
                          setReview({ request, decision: 'Rejected' })
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {canWrite && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setReview({
                          request,
                          decision: request.waived ? 'Required' : 'Waived',
                        })
                      }
                    >
                      {request.waived
                        ? 'Restore requirement'
                        : 'Waive requirement'}
                    </Button>
                  )}
                </>
              ) : (
                canWrite &&
                !request.waived && (
                  <>
                    <Button onClick={() => setShare(request)}>
                      Choose saved document
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setUpload({ request })}
                    >
                      Upload for request
                    </Button>
                  </>
                )
              )}
            </div>
            {request.reviews.length > 0 && (
              <details>
                <summary>Decision history</summary>
                {request.reviews.map((r, i) => (
                  <p key={i}>
                    {r.decision} · {new Date(r.created_at).toLocaleDateString()}{' '}
                    · Manager {r.actor_id}
                    {r.reason ? `: ${r.reason}` : ''}
                  </p>
                ))}
              </details>
            )}
          </RecordCard>
        ))}
    </div>
  );
  const requests = (
    <>
      <p>
        {manager
          ? 'Review the submitted file and manually entered dates. Documentation readiness is separate from vendor acceptance.'
          : 'Share a saved document or upload a new one for a specific market. Each market reviews its own submission.'}
      </p>
      {data.truncated && (
        <Alert severity="warning">
          This view is limited to 500 vendors and assignments. Overall readiness
          cannot be established for omitted records.
        </Alert>
      )}
      {!manager &&
        data.market_readiness
          ?.filter(
            (summary) =>
              !requestedMarket || summary.market_id === requestedMarket,
          )
          .map((summary) => (
            <Card key={summary.market_id} surface="embedded">
              <p>
                {summary.market_name}: <Status value={summary.status} />
              </p>
              <p>
                {summary.complete} of {summary.total} complete. Outstanding
                required: {summary.outstandingRequired}.
              </p>
            </Card>
          ))}
      {manager && (
        <DataTable
          label="Vendor documentation readiness"
          recordDetails={{
            status: 7,
            labels: visibleVendors.map((v) => v.name),
          }}
          headings={[
            'Vendor',
            'Outstanding required',
            'Awaiting review',
            'Complete',
            'Rejected',
            'Expired',
            'Expiring soon',
            'Readiness',
            'Requests',
          ]}
        >
          {visibleVendors.map((v) => {
            const summary = data.readiness?.find((r) => r.vendor_id === v.id);
            return (
              <tr key={v.id}>
                <th scope="row">{v.name}</th>
                <td>{summary?.outstandingRequired ?? 'Unavailable'}</td>
                <td>{summary?.pending ?? 'Unavailable'}</td>
                <td>{summary?.complete ?? 'Unavailable'}</td>
                <td>{summary?.rejected ?? 'Unavailable'}</td>
                <td>{summary?.expired ?? 'Unavailable'}</td>
                <td>{summary?.expiringSoon ?? 'Unavailable'}</td>
                <td>
                  <Status value={summary?.status ?? 'Incomplete view'} />
                </td>
                <td>{requestCards(v)}</td>
              </tr>
            );
          })}
        </DataTable>
      )}
      {!data.requests.length && (
        <EmptyState
          title={manager ? 'No document assignments' : 'No document requests'}
        >
          <p>
            {manager
              ? 'Create a requirement and assign it to associated vendors.'
              : 'Requests from your associated markets will appear here.'}
          </p>
        </EmptyState>
      )}
      {!manager && requestCards({ id: 0, name: '' })}
    </>
  );
  const requirements = (
    <>
      <AutomationSettings
        api={api}
        data={data}
        disabled={!canWrite || busy}
        onSaved={refresh}
      />
      <div className="ui-actions">
        <Button disabled={!canWrite} onClick={() => setRequirement(true)}>
          Request documents
        </Button>
        <Button
          variant="secondary"
          disabled={!canWrite || busy}
          onClick={() => {
            setBusy(true);
            void api
              .command('SYNC_PREVIEW', {})
              .then((result) => {
                const preview = result as {
                  vendorCount: number;
                  assignmentCount: number;
                };
                setConfirm({
                  title: 'Assign existing vendors',
                  message: `Create ${preview.assignmentCount} requests for ${preview.vendorCount} vendors? Existing requests and review decisions are preserved.`,
                  run: () =>
                    command('SYNC', {
                      assignmentCount: preview.assignmentCount,
                    }),
                });
              })
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          Assign market-wide requirements to new vendors
        </Button>
      </div>
      <p>
        Assignments use current vendor relationships. Documentation does not
        change application acceptance or attendance.
      </p>
      {!data.requirements.length && (
        <EmptyState title="No requirements yet">
          <p>
            Use an optional participation template to create your first request.
          </p>
        </EmptyState>
      )}
      {data.requirements.map((r) => (
        <Card key={r.id}>
          <h2>{r.title}</h2>
          <p>{r.instructions}</p>
          <p>
            {r.required ? 'Required' : 'Optional'} ·{' '}
            {r.market_wide ? 'All associated vendors' : 'Selected vendors'}
          </p>
          <DistributionSettings
            key={`${r.id}:${r.stage}:${r.automatic}:${r.submission_blocking}`}
            api={api}
            requirement={r}
            disabled={!canWrite || busy}
            onSaved={refresh}
          />
          <form
            className="ui-control-row"
            onSubmit={(e) => {
              e.preventDefault();
              const vendors = new FormData(e.currentTarget)
                .getAll('vendorIds')
                .map(Number);
              setBusy(true);
              void command('ASSIGN', { vendorIds: vendors }, r.id)
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            <SearchableMultiSelect
              id={`assign-${r.id}`}
              label="Add vendors"
              name="vendorIds"
              required
              disabled={!canWrite || busy}
              options={data.vendors.map((v) => ({
                value: String(v.id),
                label: v.name,
              }))}
            />
            <Button type="submit" disabled={!canWrite || busy}>
              Assign
            </Button>
          </form>
        </Card>
      ))}
    </>
  );
  return (
    <div
      className="documents-workspace"
      aria-busy={result.revision !== revision}
    >
      {!!error && <Feedback error={error} />}
      <fieldset disabled={result.revision !== revision}>
        <legend className="sr-only">Document workspace</legend>
        <Tabs
          initialTab={
            new URLSearchParams(window.location.search).get('view') ===
            'reports'
              ? 'Readiness and reports'
              : new URLSearchParams(window.location.search).get('view') ===
                  'agreements'
                ? 'Agreements'
                : new URLSearchParams(window.location.search).has('vendor') ||
                    new URLSearchParams(window.location.search).get('view') ===
                      'requests'
                  ? manager
                    ? 'Vendor compliance'
                    : 'Market requests'
                  : undefined
          }
          items={[
            { label: 'Library', content: library },
            {
              label: 'Agreements',
              content: (
                <Agreements
                  api={api}
                  manager={manager}
                  canWrite={canWrite}
                  onChanged={refresh}
                />
              ),
            },
            ...(manager
              ? [
                  { label: 'Requirements', content: requirements },
                  { label: 'Vendor compliance', content: requests },
                  {
                    label: 'Readiness and reports',
                    content: (
                      <ComplianceReports
                        api={api}
                        data={data}
                        canWrite={canWrite}
                      />
                    ),
                  },
                  {
                    label: 'Templates and guidance',
                    content: (
                      <ComplianceGuidance
                        api={api}
                        data={data}
                        canWrite={canWrite}
                        onChanged={refresh}
                      />
                    ),
                  },
                ]
              : [{ label: 'Market requests', content: requests }]),
          ]}
        />
      </fieldset>
      {upload && (
        <UploadDialog
          api={api}
          categories={data.categories}
          document={upload.doc}
          assignment={upload.request}
          onClose={() => setUpload(undefined)}
          onSaved={refresh}
        />
      )}
      {edit && (
        <EditDialog
          api={api}
          categories={data.categories}
          doc={edit}
          onClose={() => setEdit(undefined)}
          onSaved={refresh}
        />
      )}
      {share && (
        <ShareDialog
          api={api}
          data={data}
          request={share}
          onClose={() => setShare(undefined)}
          onSaved={refresh}
        />
      )}
      {requirement && (
        <RequirementDialog
          api={api}
          data={data}
          vendorId={
            Number(new URLSearchParams(window.location.search).get('vendor')) ||
            undefined
          }
          onClose={() => setRequirement(false)}
          onSaved={refresh}
        />
      )}
      {review && (
        <ReviewDialog
          api={api}
          {...review}
          onClose={() => setReview(undefined)}
          onSaved={refresh}
        />
      )}
      {confirm && (
        <ConfirmAction
          title={confirm.title}
          run={confirm.run}
          onClose={() => setConfirm(undefined)}
        >
          <p>{confirm.message}</p>
        </ConfirmAction>
      )}
    </div>
  );
}
