import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createStorefrontAppearanceApi,
  createWebsiteLibraryApi,
  safeError,
  safeStorefrontUrl,
  type StorefrontAppearanceApi,
  type StorefrontLink,
  type StorefrontWebsitePage,
  type StorefrontWebsiteRecord,
  type WebsiteLibraryApi,
} from '@market/api';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Pagination,
  SelectField,
  Spinner,
  UtilityIcon,
} from '@market/ui';
import { buttonClassName } from '@market/ui/presentation';
import { storefrontThemes } from '@market/theme/storefront';
import { VisualStorefrontEditor } from './VisualStorefrontEditor';
import type { StorefrontConnection } from './StorefrontAppearance';
import './website-library.css';

export function websiteEditorHref(
  storefrontId: string,
  websiteId?: string,
  preview = false,
) {
  const url = new URL(window.location.href);
  url.searchParams.set('storefront', storefrontId);
  url.searchParams.delete('website');
  url.searchParams.delete('preview');
  if (websiteId) url.searchParams.set('website', websiteId);
  if (preview) url.searchParams.set('preview', '1');
  return url.pathname + url.search;
}

/** Feature composition over shared cards/dialogs; no independent UI primitives. */
export function WebsiteLibrary({
  connection,
  library: suppliedLibrary,
  appearance: suppliedAppearance,
}: {
  connection: StorefrontConnection;
  library?: WebsiteLibraryApi;
  appearance?: StorefrontAppearanceApi;
}) {
  const library = useMemo(
    () => suppliedLibrary ?? createWebsiteLibraryApi(connection),
    [suppliedLibrary, connection],
  );
  const appearance = useMemo(
    () => suppliedAppearance ?? createStorefrontAppearanceApi(connection),
    [suppliedAppearance, connection],
  );
  const params = new URLSearchParams(window.location.search);
  const [storefrontId, setStorefrontId] = useState(
    params.get('storefront') ?? '',
  );
  const websiteId = params.get('website');
  const [links, setLinks] = useState<StorefrontLink[]>();
  const [savedPage, setPage] = useState<StorefrontWebsitePage>();
  const [savedSelected, setSelected] = useState<StorefrontWebsiteRecord>();
  const [loadedKey, setLoadedKey] = useState('');
  const [skip, setSkip] = useState(0);
  const [generation, setGeneration] = useState(0);
  const requestKey = `${storefrontId}:${websiteId ?? ''}:${skip}:${generation}`;
  const page = loadedKey === requestKey ? savedPage : undefined;
  const selected = loadedKey === requestKey ? savedSelected : undefined;
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [dialog, setDialog] = useState<{
    action: 'create' | 'rename' | 'delete' | 'publish';
    record?: StorefrontWebsiteRecord;
  }>();
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('harvest');
  useEffect(() => {
    let active = true;
    void appearance
      .links()
      .then((value) => {
        if (active) {
          setLinks(value);
          setStorefrontId((id) => id || value[0]?.id || '');
        }
      })
      .catch((value) => {
        if (active) setError(value);
      });
    return () => {
      active = false;
    };
  }, [appearance, generation]);
  useEffect(() => {
    let active = true;
    if (!storefrontId) return;
    void (
      websiteId
        ? library.read(storefrontId, websiteId).then((value) => {
            if (active) {
              setSelected(value);
              setLoadedKey(requestKey);
              setError(undefined);
            }
          })
        : library.list(storefrontId, skip, 20).then((value) => {
            if (active) {
              setPage(value);
              setLoadedKey(requestKey);
              setError(undefined);
            }
          })
    ).catch((value) => {
      if (active) setError(value);
    });
    return () => {
      active = false;
    };
  }, [library, storefrontId, websiteId, skip, generation, requestKey]);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await work();
    } catch (value) {
      setError(value);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const url = safeStorefrontUrl(
    links?.find((link) => link.id === storefrontId)?.url ?? null,
  );
  function open(
    action: NonNullable<typeof dialog>['action'],
    record?: StorefrontWebsiteRecord,
  ) {
    setName(record?.name ?? 'New website');
    setDialog({ action, record });
  }
  const feedback = error ? <ErrorState error={safeError(error)} /> : null;
  if (websiteId) {
    if (!selected)
      return (
        <>
          {feedback}
          {!error && <Spinner label="Loading website" />}
          <a
            className={buttonClassName({ variant: 'secondary' })}
            href={websiteEditorHref(storefrontId)}
          >
            Back to Website Library
          </a>
        </>
      );
    const instanceApi: StorefrontAppearanceApi = {
      ...appearance,
      save: async (_id, version, config) =>
        library.change({ ...selected, version }, 'save', config),
      publish: async (_id, version) =>
        library.change({ ...selected, version }, 'publish'),
      preview: () => library.preview(storefrontId, selected.id),
    };
    return (
      <VisualStorefrontEditor
        key={`${connection.channelToken}:${selected.id}`}
        record={selected}
        api={instanceApi}
        dashboardHref={websiteEditorHref(storefrontId)}
        backLabel="Back to Website Library"
        initialMode={params.get('preview') === '1' ? 'browse' : 'inspect'}
        onSaved={(value) => setSelected(value as StorefrontWebsiteRecord)}
      />
    );
  }
  const card = (record: StorefrontWebsiteRecord) => (
    <Card key={record.id}>
      <div className="website-library-card-title">
        <h3>{record.name}</h3>
        <Badge tone={record.isLive ? 'success' : 'neutral'}>
          {record.isLive ? 'Live' : 'Draft'}
        </Badge>
      </div>
      <p>
        {storefrontThemes[record.draft.theme].label}
        {record.templateId === 'modern-farmhouse' &&
        record.templateVersion === 1
          ? ' · Legacy compatibility'
          : storefrontThemes[record.draft.theme].premium
            ? ' · Premium'
            : ''}
      </p>
      <p>
        {record.isLive && record.publishedAt
          ? `Published ${new Date(record.publishedAt).toLocaleString()}`
          : `Edited ${new Date(record.updatedAt).toLocaleString()}`}
      </p>
      <div className="ui-actions">
        <a
          className={buttonClassName()}
          href={websiteEditorHref(storefrontId, record.id)}
        >
          <UtilityIcon name="edit" /> Edit
        </a>
        {record.isLive && url && (
          <a
            className={buttonClassName({ variant: 'secondary' })}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Website <UtilityIcon name="external" />
          </a>
        )}

        <Button
          variant="tertiary"
          disabled={
            busy ||
            (record.templateId !== 'harvest' &&
              !(
                record.templateId === 'modern-farmhouse' &&
                record.templateVersion === 2
              ) &&
              !(
                record.templateId === 'editorial-market' &&
                record.templateVersion === 1
              ))
          }
          onClick={() =>
            void run(async () => {
              const copy = await library.create(
                storefrontId,
                `${record.name.slice(0, 193)} (copy)`,
                record.templateId,
                record.id,
              );
              window.location.assign(websiteEditorHref(storefrontId, copy.id));
            })
          }
        >
          Duplicate
        </Button>
        <Button
          variant="tertiary"
          disabled={busy}
          onClick={() => open('rename', record)}
        >
          Rename
        </Button>
        {!record.isLive && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => open('publish', record)}
          >
            Publish
          </Button>
        )}
        {!record.isLive && (
          <Button
            variant="destructive-outline"
            disabled={busy}
            onClick={() => open('delete', record)}
          >
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
  return (
    <div className="website-library">
      <div className="ui-actions">
        <Button disabled={busy || !storefrontId} onClick={() => open('create')}>
          New Website <UtilityIcon name="plus" />
        </Button>
        {links && links.length > 1 && (
          <SelectField
            id="library-storefront"
            label="Storefront"
            value={storefrontId}
            onChange={(event) => {
              setStorefrontId(event.target.value);
              setSkip(0);
            }}
          >
            {links.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      {!dialog && feedback}
      {links?.length === 0 && (
        <EmptyState title="No storefront is configured" />
      )}
      {!page && storefrontId && !error && (
        <Spinner label="Loading Website Library" />
      )}
      {page && (
        <>
          {page.live && (
            <section aria-label="Live Website">{card(page.live)}</section>
          )}
          <section aria-label="Draft Websites" className="website-library-grid">
            {page.items.filter((record) => !record.isLive).map(card)}
            {!page.items.some((record) => !record.isLive) && (
              <EmptyState
                title={
                  page.totalItems <= 1
                    ? 'Create your next website'
                    : 'No drafts on this page'
                }
              >
                <p>
                  Start from a theme template or duplicate an existing website.
                </p>
              </EmptyState>
            )}
          </section>
          <Pagination
            hasPrevious={skip > 0}
            hasNext={skip + 20 < page.totalItems}
            onPrevious={() => setSkip(Math.max(0, skip - 20))}
            onNext={() => setSkip(skip + 20)}
            summary={`${page.totalItems} websites`}
          />
        </>
      )}
      {dialog && (
        <Dialog
          open
          busy={busy}
          title={
            dialog.action === 'create'
              ? 'Add Website'
              : `${dialog.action === 'rename' ? 'Rename' : dialog.action === 'publish' ? 'Publish' : 'Delete'} ${dialog.record?.name}`
          }
          onClose={() => {
            if (!busy) setDialog(undefined);
          }}
        >
          {feedback}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                if (dialog.action === 'create') {
                  const created = await library.create(
                    storefrontId,
                    name,
                    template,
                  );
                  window.location.assign(
                    websiteEditorHref(storefrontId, created.id),
                  );
                } else {
                  await library.change(
                    dialog.record!,
                    dialog.action,
                    dialog.action === 'rename' ? name : undefined,
                  );
                  setDialog(undefined);
                  setGeneration((value) => value + 1);
                }
              });
            }}
          >
            {(dialog.action === 'create' || dialog.action === 'rename') && (
              <Field label="Website name" id="website-name">
                <Input
                  id="website-name"
                  value={name}
                  maxLength={200}
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
            )}
            {dialog.action === 'create' && (
              <SelectField
                id="website-template"
                label="Theme template"
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              >
                {Object.entries(storefrontThemes)
                  .filter(([, theme]) => theme.available)
                  .map(([id, theme]) => (
                    <option key={id} value={id}>
                      {theme.label}
                      {theme.premium ? ' · Premium' : ' · Free'}
                    </option>
                  ))}
              </SelectField>
            )}
            {dialog.action === 'create' && (
              <p>
                Your new website starts with its template's starter content.
              </p>
            )}
            {dialog.action === 'delete' && (
              <p>
                Delete “{dialog.record?.name}”? Products, media and orders are
                preserved.
              </p>
            )}
            {dialog.action === 'publish' && (
              <p>
                Publish the saved draft of “{dialog.record?.name}” to your
                existing storefront address? Your current website will remain in
                the library.
              </p>
            )}
            <div className="ui-actions ui-modal-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setDialog(undefined)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={
                  dialog.action === 'delete' ? 'destructive-outline' : 'primary'
                }
                loading={busy}
                disabled={
                  busy ||
                  ((dialog.action === 'create' || dialog.action === 'rename') &&
                    !name.trim())
                }
              >
                {dialog.action === 'create'
                  ? 'Create Website'
                  : dialog.action === 'rename'
                    ? 'Save name'
                    : dialog.action === 'delete'
                      ? 'Delete Website'
                      : 'Publish Website'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
