import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
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
  Badge,
  IconButton,
  SearchableMultiSelect,
  Dialog,
  EmptyState,
  Field,
  Input,
  SelectField,
  Spinner,
  Tabs,
} from '@market/ui';
import {
  FarmstandButton as Button,
  FarmstandIcon,
  FarmstandPagination as Pagination,
  FarmstandTable as DataTable,
} from '@market/ui/farmstand';
import type { AdminContext } from '@market/admin-core';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { SettingsPanel } from '../settings/SettingsPanel';
import './documents.css';
import { Agreements } from './Agreements';
import { ComplianceReports } from './ComplianceReports';
import { ComplianceGuidance } from './ComplianceGuidance';
import {
  DocumentCard,
  DocumentFacts,
  DocumentSection,
  documentDate,
} from './DocumentCard';
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
    <SettingsPanel
      icon="settings"
      title="Automatic requests"
      description="Each requirement must also use automatic distribution. Enabling this does not assign historical vendors or deliver notifications."
      actions={
        <Badge tone={settings.automation_enabled ? 'success' : 'neutral'}>
          {settings.automation_enabled ? 'Enabled' : 'Off'}
        </Badge>
      }
    >
      <p className="documents-note">
        Automatic document requests are{' '}
        {settings.automation_enabled ? 'enabled' : 'off'} for this market.
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
    </SettingsPanel>
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
      className="documents-requirement-form"
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
        <label className="document-checkbox">
          <input
            type="checkbox"
            checked={blocking}
            disabled={disabled || busy}
            onChange={(e) => setBlocking(e.target.checked)}
          />{' '}
          Must be shared before submission
        </label>
      )}
      <p className="documents-note">
        {automatic
          ? `Automatically requests documents ${stage === 'Application' ? 'when an authorized vendor begins or submits an application' : 'when a vendor is accepted or their membership is approved'}, only while market automation is enabled. Existing assignments keep their reviews.`
          : 'Only an explicit manager request or synchronization creates assignments.'}
      </p>
      {!r.market_wide && (
        <p className="documents-note">
          Automatic distribution is available for market-wide requirements.
          Create a market-wide requirement to apply it to future vendors.
        </p>
      )}
      <div className="documents-form-actions">
        <Button type="submit" variant="secondary" disabled={disabled || busy}>
          Save
        </Button>
      </div>
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
      <p className="documents-note">
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
      <p className="documents-note">
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
            <p className="documents-note">
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
            <p className="documents-note">
              Choose manual distribution for an on-request requirement.
            </p>
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
      <p className="documents-note">
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

function fileKind(doc: ComplianceDocument) {
  const current = doc.files.find((f) => f.status === 'Available');
  return current?.mime === 'application/pdf'
    ? 'PDF'
    : current
      ? 'Image'
      : 'File';
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
  const search = new URLSearchParams(window.location.search);
  const loaded = !!result && result.skip === skip;
  const data = loaded ? result.data : undefined;
  const frame = (content: ReactNode) => (
    <WorkspaceFrame
      className="documents-workspace farmstand-controls"
      icon="file-text"
      title="Documents"
      description={
        manager
          ? 'Requirements, vendor compliance, agreements and reports for your market.'
          : 'Your private document library, market requests and agreements.'
      }
      tabs={[]}
      value=""
      onChange={() => undefined}
      // In-page Tabs take the workspace menu presentation; one column each.
      style={{ ['--workspace-tabs' as string]: manager ? 6 : 3 }}
      actions={
        <Button
          onClick={() => setUpload({})}
          disabled={!canWrite || busy || !data}
        >
          <FarmstandIcon name="upload" />
          Upload document
        </Button>
      }
    >
      {content}
    </WorkspaceFrame>
  );
  if (!loaded) return frame(<Spinner label="Loading documents" />);
  if (result.error)
    return frame(
      <div className="documents-error">
        <Feedback error={result.error} />
        <Button variant="secondary" onClick={refresh}>
          Retry
        </Button>
      </div>,
    );
  const ready = data!;
  const requestedVendor = Number(search.get('vendor'));
  const requestedMarket = Number(search.get('market'));
  const visibleVendors =
    manager && requestedVendor
      ? ready.vendors.filter((v) => v.id === requestedVendor)
      : ready.vendors;
  const library = (
    <SettingsPanel
      icon="folder-open"
      title="Document library"
      description={`Private to this ${manager ? 'market' : 'business'}. Dates use ${ready.timezone}; expiring soon means within 30 days. Use Delete to remove prohibited content and revoke future access.`}
      actions={
        <IconButton
          icon="refresh"
          label="Refresh documents"
          onClick={refresh}
        />
      }
    >
      {!ready.documents.length ? (
        <EmptyState title="No documents saved">
          <p>
            Upload a participation document to keep it in your private library.
          </p>
        </EmptyState>
      ) : (
        <div className="documents-grid">
          {ready.documents.map((doc) => {
            const current = doc.files.find((f) => f.status === 'Available'),
              latest = doc.files[0],
              kind = fileKind(doc);
            return (
              <DocumentCard
                key={doc.id}
                title={doc.metadata.title}
                icon={kind === 'Image' ? 'file-image' : 'file-text'}
                subtitle={`${kind} · ${doc.metadata.category}`}
                statuses={
                  <>
                    <Status value={latest?.status ?? 'Scanning'} />
                    <Status value={doc.expiration} />
                  </>
                }
                meta={
                  doc.metadata.noExpiration
                    ? 'No expiration'
                    : `Expires ${documentDate(doc.metadata.expiresOn)}`
                }
              >
                <div className="documents-dialog-body">
                  {!!error && <Feedback error={error} />}
                  <DocumentFacts
                    items={[
                      ['Type', doc.metadata.category],
                      [
                        'Status',
                        <span className="document-card-statuses">
                          <Status value={latest?.status ?? 'Scanning'} />
                          <Status value={doc.expiration} />
                        </span>,
                      ],
                      [
                        'Expiration',
                        doc.metadata.noExpiration
                          ? 'No expiration'
                          : documentDate(doc.metadata.expiresOn),
                      ],
                      !!doc.metadata.issuedOn && [
                        'Issued',
                        documentDate(doc.metadata.issuedOn),
                      ],
                      ['Uploaded', documentDate(doc.created_at)],
                      ['Updated', documentDate(doc.updated_at)],
                      !!doc.metadata.notes && ['Notes', doc.metadata.notes],
                    ]}
                  />
                  {latest?.status !== 'Available' && current && (
                    <Alert severity="info">
                      The replacement is unavailable. The previous scanned
                      version can still be downloaded.
                    </Alert>
                  )}
                  <div className="documents-actions">
                    <Button
                      variant="secondary"
                      disabled={!canWrite || busy}
                      onClick={() => setEdit(doc)}
                    >
                      Edit information
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!canWrite}
                      onClick={() => setUpload({ doc })}
                    >
                      <FarmstandIcon name="upload" />
                      Replace
                    </Button>
                    <Button
                      variant="destructive-outline"
                      disabled={!canWrite}
                      onClick={() =>
                        setConfirm({
                          title: 'Delete document',
                          message:
                            'This removes every file version from the library and revokes future downloads. Existing external downloads cannot be recalled. Review history is retained.',
                          run: () =>
                            command('DELETE', {}, doc.id, doc.revision),
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                  <DocumentSection title="File versions">
                    <DocumentVersionPicker
                      document={doc}
                      busy={busy}
                      onDownload={(id) => void download(id)}
                    />
                  </DocumentSection>
                  <DocumentSection title="Market access">
                    {doc.shares.length === 0 ? (
                      <p className="documents-note">
                        No markets have been granted access.
                      </p>
                    ) : (
                      <ul className="documents-access">
                        {doc.shares.map((s) => (
                          <li key={s.id}>
                            <span>{s.market_name}</span>
                            <Badge tone={s.revoked_at ? 'neutral' : 'success'}>
                              {s.revoked_at
                                ? 'Access revoked'
                                : 'Access granted'}
                            </Badge>
                            {!s.revoked_at && canWrite && (
                              <Button
                                variant="destructive-outline"
                                size="compact"
                                onClick={() =>
                                  setConfirm({
                                    title: 'Revoke market access',
                                    message:
                                      'This prevents future access to this submission. Previously downloaded copies cannot be recalled. Other submissions retain their individual grants.',
                                    run: () =>
                                      command(
                                        'REVOKE',
                                        { documentId: doc.id },
                                        s.id,
                                      ),
                                  })
                                }
                              >
                                Revoke
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </DocumentSection>
                </div>
              </DocumentCard>
            );
          })}
        </div>
      )}
      <Pagination
        summary={`${ready.total} documents`}
        hasPrevious={skip > 0}
        hasNext={skip + 20 < ready.total}
        onPrevious={() => setSkip(Math.max(0, skip - 20))}
        onNext={() => setSkip(skip + 20)}
      />
    </SettingsPanel>
  );
  const requestCards = (v: { id: number; name: string }) => {
    const items = ready.requests.filter((r) =>
      manager
        ? r.vendor_id === v.id
        : !requestedMarket || r.market_id === requestedMarket,
    );
    return (
      <div id={`vendor-${v.id}`} key={v.id} className="documents-grid">
        {items.map((request) => (
          <DocumentCard
            key={request.id}
            title={request.title}
            icon="clipboard-list"
            subtitle={`${manager ? request.vendor_name : request.market_name} · ${request.category}`}
            statuses={
              <>
                <Status value={request.status} />
                {request.expiration &&
                  request.expiration !== request.status && (
                    <Status value={request.expiration} />
                  )}
              </>
            }
            meta={
              request.due_on
                ? `Due ${documentDate(request.due_on)}`
                : request.stage
            }
          >
            <div className="documents-dialog-body">
              {!!error && <Feedback error={error} />}
              <DocumentFacts
                items={[
                  [
                    manager ? 'Vendor' : 'Market',
                    manager ? request.vendor_name : request.market_name,
                  ],
                  ['Category', request.category],
                  [
                    'Status',
                    <span className="document-card-statuses">
                      <Status value={request.status} />
                      {request.expiration &&
                        request.expiration !== request.status && (
                          <Status value={request.expiration} />
                        )}
                    </span>,
                  ],
                  ['Requirement', request.required ? 'Required' : 'Optional'],
                  ['Stage', request.stage],
                  !!request.due_on && ['Due', documentDate(request.due_on)],
                  !!request.source && [
                    'Requested by',
                    `${request.source.replaceAll('_', ' ')}${
                      request.created_at
                        ? ` on ${documentDate(request.created_at)}`
                        : ''
                    }`,
                  ],
                  !!request.submission && [
                    'Submitted',
                    `${documentDate(request.submission.created_at)}: ${request.submission.metadata.title}. Expiration: ${
                      request.submission.metadata.noExpiration
                        ? 'No expiration'
                        : request.submission.metadata.expiresOn
                    }.`,
                  ],
                ]}
              />
              {request.instructions && (
                <p className="documents-instructions">{request.instructions}</p>
              )}
              <div className="documents-actions">
                {manager ? (
                  <>
                    {request.submission &&
                      !['Access revoked', 'Missing'].includes(
                        request.status,
                      ) && (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void download(request.submission!.file_id)
                          }
                        >
                          <FarmstandIcon name="download" />
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
                          variant="destructive-outline"
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
                        <FarmstandIcon name="upload" />
                        Upload for request
                      </Button>
                    </>
                  )
                )}
              </div>
              {request.reviews.length > 0 && (
                <details className="ui-disclosure documents-history">
                  <summary>Decision history</summary>
                  <ul>
                    {request.reviews.map((r, i) => (
                      <li key={i}>
                        <strong>{r.decision}</strong> ·{' '}
                        {documentDate(r.created_at)} · Manager {r.actor_id}
                        {r.reason ? `: ${r.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </DocumentCard>
        ))}
      </div>
    );
  };
  const readiness = manager
    ? undefined
    : ready.market_readiness?.filter(
        (summary) => !requestedMarket || summary.market_id === requestedMarket,
      );
  const requests = (
    <div className="documents-view">
      {ready.truncated && (
        <Alert severity="warning">
          This view is limited to 500 vendors and assignments. Overall readiness
          cannot be established for omitted records.
        </Alert>
      )}
      {!!readiness?.length && (
        <SettingsPanel
          icon="shield-check"
          title="Market readiness"
          description="Each market reviews its own submission."
        >
          <ul className="documents-readiness">
            {readiness.map((summary) => (
              <li key={summary.market_id}>
                <div className="documents-readiness-top">
                  <strong>{summary.market_name}</strong>
                  <Status value={summary.status} />
                </div>
                <div
                  className="documents-progress"
                  aria-hidden
                  style={{
                    ['--progress' as string]: `${summary.total ? (summary.complete / summary.total) * 100 : 0}%`,
                  }}
                />
                <p>
                  {summary.complete} of {summary.total} complete. Outstanding
                  required: {summary.outstandingRequired}.
                </p>
              </li>
            ))}
          </ul>
        </SettingsPanel>
      )}
      <SettingsPanel
        className={manager ? 'documents-table-panel' : ''}
        icon={manager ? 'shield-check' : 'inbox'}
        title={manager ? 'Vendor compliance' : 'Market requests'}
        description={
          manager
            ? 'Review the submitted file and manually entered dates. Documentation readiness is separate from vendor acceptance.'
            : 'Share a saved document or upload a new one for a specific market. Each market reviews its own submission.'
        }
      >
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
              const summary = ready.readiness?.find(
                (r) => r.vendor_id === v.id,
              );
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
        {!ready.requests.length && (
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
      </SettingsPanel>
    </div>
  );
  const requirements = (
    <div className="documents-view">
      <AutomationSettings
        api={api}
        data={ready}
        disabled={!canWrite || busy}
        onSaved={refresh}
      />
      <SettingsPanel
        icon="clipboard-list"
        title="Document requirements"
        description="Assignments use current vendor relationships. Documentation does not change application acceptance or attendance."
        actions={
          <>
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
            <Button disabled={!canWrite} onClick={() => setRequirement(true)}>
              <FarmstandIcon name="plus" />
              Request documents
            </Button>
          </>
        }
      >
        {!ready.requirements.length && (
          <EmptyState title="No requirements yet">
            <p>
              Use an optional participation template to create your first
              request.
            </p>
          </EmptyState>
        )}
        {!!ready.requirements.length && (
          <ul className="documents-requirements">
            {ready.requirements.map((r) => (
              <li key={r.id} className="documents-requirement">
                <div className="documents-requirement-heading">
                  <span className="markets-stat-icon" aria-hidden>
                    <FarmstandIcon name="file-check" />
                  </span>
                  <div>
                    <h3>{r.title}</h3>
                    {r.instructions && <p>{r.instructions}</p>}
                  </div>
                  <span className="document-card-statuses">
                    <Badge tone={r.required ? 'warning' : 'neutral'}>
                      {r.required ? 'Required' : 'Optional'}
                    </Badge>
                    <Badge tone="neutral">
                      {r.market_wide
                        ? 'All associated vendors'
                        : 'Selected vendors'}
                    </Badge>
                  </span>
                </div>
                <DistributionSettings
                  key={`${r.id}:${r.stage}:${r.automatic}:${r.submission_blocking}`}
                  api={api}
                  requirement={r}
                  disabled={!canWrite || busy}
                  onSaved={refresh}
                />
                <form
                  className="documents-assign-form"
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
                    options={ready.vendors.map((v) => ({
                      value: String(v.id),
                      label: v.name,
                    }))}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!canWrite || busy}
                  >
                    Assign
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SettingsPanel>
    </div>
  );
  const view = search.get('view');
  return frame(
    <div className="documents-body" aria-busy={result.revision !== revision}>
      {!!error && <Feedback error={error} />}
      <fieldset disabled={result.revision !== revision}>
        <legend className="sr-only">Document workspace</legend>
        <Tabs
          className={`workspace-menu documents-menu${manager ? ' documents-menu-six' : ''}`}
          initialTab={
            view === 'reports'
              ? 'Readiness and reports'
              : view === 'agreements'
                ? 'Agreements'
                : search.has('vendor') || view === 'requests'
                  ? manager
                    ? 'Vendor compliance'
                    : 'Market requests'
                  : undefined
          }
          items={[
            {
              label: 'Library',
              icon: <FarmstandIcon name="folder-open" />,
              content: library,
            },
            {
              label: 'Agreements',
              icon: <FarmstandIcon name="file-check" />,
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
                  {
                    label: 'Requirements',
                    icon: <FarmstandIcon name="clipboard-list" />,
                    content: requirements,
                  },
                  {
                    label: 'Vendor compliance',
                    icon: <FarmstandIcon name="shield-check" />,
                    content: requests,
                  },
                  {
                    label: 'Readiness and reports',
                    icon: <FarmstandIcon name="chart-column" />,
                    content: (
                      <ComplianceReports
                        api={api}
                        data={ready}
                        canWrite={canWrite}
                      />
                    ),
                  },
                  {
                    label: 'Templates and guidance',
                    icon: <FarmstandIcon name="book-open" />,
                    content: (
                      <ComplianceGuidance
                        api={api}
                        data={ready}
                        canWrite={canWrite}
                        onChanged={refresh}
                      />
                    ),
                  },
                ]
              : [
                  {
                    label: 'Market requests',
                    icon: <FarmstandIcon name="inbox" />,
                    content: requests,
                  },
                ]),
          ]}
        />
      </fieldset>
      {upload && (
        <UploadDialog
          api={api}
          categories={ready.categories}
          document={upload.doc}
          assignment={upload.request}
          onClose={() => setUpload(undefined)}
          onSaved={refresh}
        />
      )}
      {edit && (
        <EditDialog
          api={api}
          categories={ready.categories}
          doc={edit}
          onClose={() => setEdit(undefined)}
          onSaved={refresh}
        />
      )}
      {share && (
        <ShareDialog
          api={api}
          data={ready}
          request={share}
          onClose={() => setShare(undefined)}
          onSaved={refresh}
        />
      )}
      {requirement && (
        <RequirementDialog
          api={api}
          data={ready}
          vendorId={Number(search.get('vendor')) || undefined}
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
    </div>,
  );
}
