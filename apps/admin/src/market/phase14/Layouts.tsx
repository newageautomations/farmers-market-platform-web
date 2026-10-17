import { EmptyState } from '@market/ui';
import { AnimatedDisclosure, StatusBadge, MarketDialog } from '../presentation';
import { go, RouteLink } from '../../vendor/common';
import { useEffect, useReducer, useRef, useState } from 'react';
import type {
  LayoutVersion,
  MapElement,
  MarketOperationsData,
  OperationsCommand,
  SpaceDetails,
} from '@market/api';
import {
  Select,
  Button,
  MarketMap,
  MapCanvas,
  align,
  baseSpace,
  copies,
  drawingHistory,
  geometry,
  group,
  nudge,
  patchFlags,
  remove,
  reorder,
  selectIds,
  syncBooths,
  uniqueLabel,
  type Drawing,
  type MapCanvasHandle,
  type MapTool,
  type SyncCategory,
} from '@market/ui';
import { LayoutInspector } from './LayoutInspector';
import { LayoutLayers } from './LayoutLayers';
import './designer.css';
export { drawingHistory } from '@market/ui';
export function currentLayoutVersion(
  data: MarketOperationsData,
  layoutId: number,
) {
  return data.layoutVersions
    ?.filter(
      (v) =>
        v.layoutId === layoutId && !v.occurrenceId && v.status !== 'RETIRED',
    )
    .sort((a, b) => b.versionNumber - a.versionNumber)[0];
}
export function LayoutPreview({
  data,
  version,
}: {
  data: MarketOperationsData;
  version: LayoutVersion;
}) {
  return (
    <MarketMap
      showBoothList={false}
      definition={version.definition}
      spaces={(data.spaces ?? [])
        .filter((s) => s.layoutVersionId === version.id)
        .map((s) => ({ elementId: s.elementId, ...s.details, vendor: null }))}
    />
  );
}
export function Layouts({
  data,
  run,
  canManage,
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const [archive, setArchive] = useState<
    NonNullable<MarketOperationsData['layouts']>[number] | null
  >(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const archiving = useRef(false);
  const savedLayouts = (data.layouts ?? []).filter(
    (layout) => !layout.deletedAt,
  );
  const archivedLayouts =
    data.archivedLayouts ??
    (data.layouts ?? []).filter((layout) => !!layout.deletedAt);
  return (
    <div className="layout-library">
      <AnimatedDisclosure
        title="Saved layouts"
        defaultOpen
        className="saved-layouts-card"
        action={
          canManage && (
            <Button
              onClick={async () => {
                const v = (await run({
                  action: 'CREATE_LAYOUT',
                  data: { name: 'Untitled layout' },
                })) as LayoutVersion;
                if (v) go(`/market/layouts/${v.layoutId}/edit`);
              }}
            >
              Create layout
            </Button>
          )
        }
      >
        <div className="layout-card-grid">
          {!savedLayouts.length && (
            <EmptyState title="No saved layouts">
              <p>No saved layouts yet.</p>
            </EmptyState>
          )}
          {savedLayouts.map((layout) => {
            const version = currentLayoutVersion(data, layout.id);
            if (!version) return null;
            return (
              <article
                className="layout-card"
                key={layout.id}
                aria-label={layout.name}
              >
                <div className="layout-card-preview" aria-hidden="true" inert>
                  <LayoutPreview data={data} version={version} />
                </div>
                <div className="layout-card-info">
                  <span className="layout-card-name">{layout.name}</span>
                  <StatusBadge>{version.status}</StatusBadge>
                </div>
                <div className="layout-card-actions">
                  <Button
                    size="compact"
                    aria-label={`${canManage ? 'Edit' : 'View'} ${layout.name}`}
                    onClick={() => go(`/market/layouts/${layout.id}/edit`)}
                  >
                    {canManage ? 'Edit' : 'View'}
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        size="compact"
                        aria-label={`Copy ${layout.name}`}
                        className="secondary"
                        onClick={async () => {
                          const copy = (await run({
                            action: 'CLONE_LAYOUT',
                            id: version.id,
                            expectedRevision: version.revision,
                            data: {},
                          })) as LayoutVersion;
                          if (copy) go(`/market/layouts/${copy.layoutId}/edit`);
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        size="compact"
                        aria-label={`Archive ${layout.name}`}
                        className="secondary"
                        onClick={() => setArchive(layout)}
                      >
                        Archive
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </AnimatedDisclosure>
      <MarketDialog
        open={archive !== null}
        title={archive ? `Archive ${archive.name}?` : 'Archive layout'}
        busy={archiveBusy}
        onClose={() => setArchive(null)}
        actions={
          <Button
            variant="destructive"
            disabled={archiveBusy}
            onClick={async () => {
              if (!archive || archiving.current) return;
              archiving.current = true;
              setArchiveBusy(true);
              try {
                await run({
                  action: 'ARCHIVE_LAYOUT',
                  id: archive.id,
                  expectedRevision: archive.revision,
                  data: {},
                });
              } finally {
                archiving.current = false;
                setArchiveBusy(false);
                setArchive(null);
              }
            }}
          >
            {archiveBusy ? 'Archiving' : 'Archive layout'}
          </Button>
        }
      >
        <p>Existing occurrences and their data will be kept.</p>
      </MarketDialog>
      <AnimatedDisclosure
        title="Archived layouts"
        className="saved-layouts-card"
      >
        <div className="layout-card-grid">
          {!archivedLayouts.length && (
            <EmptyState title="No archived layouts">
              <p>No archived layouts.</p>
            </EmptyState>
          )}
          {archivedLayouts.map((layout) => {
            const version = currentLayoutVersion(data, layout.id);
            return (
              <article
                className="layout-card"
                key={layout.id}
                aria-label={layout.name}
              >
                {version && (
                  <div className="layout-card-preview" aria-hidden="true" inert>
                    <LayoutPreview data={data} version={version} />
                  </div>
                )}
                <div className="layout-card-info">
                  <span className="layout-card-name">{layout.name}</span>
                  <StatusBadge>Archived</StatusBadge>
                </div>
                {canManage && (
                  <div className="layout-card-actions">
                    <Button
                      onClick={() =>
                        run({
                          action: 'UNARCHIVE_LAYOUT',
                          id: layout.id,
                          expectedRevision: layout.revision,
                          data: {},
                        })
                      }
                    >
                      Unarchive layout
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </AnimatedDisclosure>
    </div>
  );
}
export function LayoutScreen({
  data,
  layoutId,
  run,
  canManage,
}: {
  data: MarketOperationsData;
  layoutId: number;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const version = data.layouts?.some(
    (layout) => layout.id === layoutId && !layout.deletedAt,
  )
    ? currentLayoutVersion(data, layoutId)
    : undefined;
  return (
    <div className="layout-editor-screen">
      <div className="layout-screen-navigation">
        <RouteLink to="/market/layouts">Back to layouts</RouteLink>
      </div>
      {version ? (
        <LayoutEditor
          key={`${version.id}:${version.revision}`}
          version={version}
          data={data}
          run={run}
          canManage={canManage}
          editablePublished
          onClone={(v) => go(`/market/layouts/${v.layoutId}/edit`)}
        />
      ) : (
        <p>This layout is unavailable or archived.</p>
      )}
    </div>
  );
}
export function LayoutEditor({
  version,
  data,
  run,
  canManage,
  onDirtyChange,
  onClone,
  occurrenceId,
  onSave,
  editablePublished = false,
}: {
  version: LayoutVersion;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onClone?: (v: LayoutVersion) => void;
  occurrenceId?: number;
  onSave?: (drawing: Drawing) => Promise<void>;
  editablePublished?: boolean;
}) {
  const initial: Drawing = {
    definition: version.definition,
    spaces: Object.fromEntries(
      data.spaces
        ?.filter((s) => s.layoutVersionId === version.id)
        .map((s) => [s.elementId, s.details]) ?? [],
    ),
  };
  const [history, dispatch] = useReducer(drawingHistory, {
      past: [],
      future: [],
      present: initial,
    }),
    [selected, setSelected] = useState<string[]>([]),
    [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true),
    [spacing, setSpacing] = useState(version.definition.pixelsPerFoot),
    [area, setArea] = useState(
      version.definition.elements[0]?.areaId ??
        version.definition.areas[0]?.id ??
        '',
    ),
    [tool, setTool] = useState<MapTool>('select'),
    [clipboard, setClipboard] = useState<{
      drawing: Drawing;
      ids: string[];
    } | null>(null),
    [name, setName] = useState(
      data.layouts?.find((l) => l.id === version.layoutId)?.name ??
        'Market layout',
    ),
    [panel, setPanel] = useState<'inspector' | 'layers'>('inspector'),
    [saving, setSaving] = useState(false);
  const canvas = useRef<MapCanvasHandle>(null),
    typing = useRef(''),
    pasteOffset = useRef(20);
  const drawing = history.present,
    definition = drawing.definition,
    editable =
      canManage &&
      (version.status === 'DRAFT' ||
        !!onSave ||
        (editablePublished && version.status === 'PUBLISHED')),
    activeArea = definition.areas.some((a) => a.id === area)
      ? area
      : (definition.areas[0]?.id ?? ''),
    ids = selected.filter((id) => definition.elements.some((e) => e.id === id)),
    items = definition.elements.filter((e) => ids.includes(e.id)),
    mutable =
      items.length > 0 && items.every((e) => !e.locked && !e.editorHidden);
  const dirty =
    JSON.stringify(initial) !== JSON.stringify(drawing) ||
    name !==
      (data.layouts?.find((l) => l.id === version.layoutId)?.name ??
        'Market layout');
  const assignments =
    data.assignments?.filter((a) => a.occurrenceId === occurrenceId) ?? [];
  const protectedIds =
    data.spaces
      ?.filter((s) => assignments.some((a) => a.spaceId === s.id))
      .map((s) => s.elementId) ?? [];
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    let linkApproved = false;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const navigate = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href]',
      );
      if (
        link &&
        !link.getAttribute('href')?.startsWith('#') &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        linkApproved = window.confirm('Discard unsaved layout changes?');
        if (!linkApproved) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    const currentUrl = window.location.href;
    const back = (e: PopStateEvent) => {
      if (linkApproved) {
        linkApproved = false;
        return;
      }
      if (!window.confirm('Discard unsaved layout changes?')) {
        e.stopImmediatePropagation();
        window.history.pushState(null, '', currentUrl);
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    window.addEventListener('popstate', back, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
      window.removeEventListener('popstate', back, true);
    };
  }, [dirty]);
  function update(value: Drawing, merge = false) {
    if (
      protectedIds.some(
        (id) =>
          !value.spaces[id] ||
          !value.definition.elements.some(
            (e) => e.id === id && e.type === 'SPACE',
          ),
      )
    )
      return;
    if (editable) dispatch({ type: 'EDIT', value, merge });
  }
  function change(elements: MapElement[]) {
    update(geometry(drawing, elements));
  }
  function changeBooth(id: string, patch: Partial<SpaceDetails>) {
    const s = drawing.spaces[id];
    if (!s) return;
    const next = { ...s, ...patch };
    if (
      next.widthFeet < 1 ||
      next.widthFeet > 1000 ||
      next.depthFeet < 1 ||
      next.depthFeet > 1000
    )
      return;
    const d = geometry(
      drawing,
      definition.elements
        .filter((e) => e.id === id)
        .map((e) => ({
          ...e,
          text: next.label,
          width: next.widthFeet * definition.pixelsPerFoot,
          height: next.depthFeet * definition.pixelsPerFoot,
        })),
    );
    update(
      { ...d, spaces: { ...d.spaces, [id]: next } },
      typing.current === id,
    );
    typing.current = id;
  }
  function inspectorGeometry(e: MapElement) {
    update(geometry(drawing, [e]), typing.current === e.id);
    typing.current = e.id;
  }
  function add(
    type: MapElement['type'],
    path?: Pick<MapElement, 'x' | 'y' | 'width' | 'height' | 'points'>,
  ) {
    if (!editable || definition.elements.length >= 1000) return;
    const id = crypto.randomUUID(),
      center = canvas.current?.center() ?? { x: 100, y: 100 },
      label =
        type === 'SPACE'
          ? uniqueLabel(
              new Set(Object.values(drawing.spaces).map((s) => s.label)),
            )
          : type === 'TEXT'
            ? 'Venue label'
            : '';
    const size = type === 'SPACE' ? 10 * definition.pixelsPerFoot : 120;
    const e: MapElement = {
      id,
      areaId: activeArea,
      type,
      x: center.x - size / 2,
      y: center.y - size / 2,
      width: type === 'TEXT' ? 200 : size,
      height: type === 'TEXT' ? 40 : type === 'LINE' ? 60 : size,
      rotation: 0,
      zIndex: Math.max(-1, ...definition.elements.map((e) => e.zIndex)) + 1,
      text: label,
      fill:
        type === 'SPACE' ? '#e0ebd9' : type === 'TEXT' ? '#173925' : '#d4dccf',
      ...path,
    };
    update({
      definition: { ...definition, elements: [...definition.elements, e] },
      spaces:
        type === 'SPACE'
          ? { ...drawing.spaces, [id]: baseSpace(label) }
          : drawing.spaces,
    });
    setSelected([id]);
    if (!path) setTool('select');
    setPanel('inspector');
  }
  function copy() {
    setClipboard({ drawing: structuredClone(drawing), ids: [...ids] });
    pasteOffset.current = 20;
  }
  function paste(source = clipboard) {
    if (
      !source ||
      !editable ||
      definition.elements.length + source.ids.length > 1000
    )
      return;
    const result = copies(
      source.drawing,
      drawing,
      source.ids,
      activeArea,
      () => crypto.randomUUID(),
      pasteOffset.current,
    );
    update(result.drawing);
    setSelected(result.ids);
    pasteOffset.current += 20;
  }
  function duplicate() {
    paste({ drawing, ids });
  }
  function flags(
    targets: string[],
    patch: Pick<MapElement, 'locked' | 'editorHidden'>,
  ) {
    const expanded = [
      ...new Set(
        targets.flatMap((id) => selectIds(definition.elements, [], id)),
      ),
    ];
    update(patchFlags(drawing, expanded, patch));
  }
  function sync(source: string, targets: string[], categories: SyncCategory[]) {
    update(syncBooths(drawing, source, targets, categories));
  }
  const commands = useRef({
    drawing,
    ids,
    editable,
    clipboard,
    activeArea,
    protectedIds,
  });
  useEffect(() => {
    commands.current = {
      drawing,
      ids,
      editable,
      clipboard,
      activeArea,
      protectedIds,
    };
  });
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const dialog = target?.closest('dialog');
      if (
        target?.closest('input,textarea,select,[contenteditable="true"]') ||
        (dialog && !dialog.querySelector('[data-testid="layout-editor"]'))
      )
        return;
      const {
        drawing: d,
        ids,
        editable,
        clipboard,
        activeArea,
        protectedIds,
      } = commands.current;
      if (!editable) return;
      const mod = event.ctrlKey || event.metaKey,
        k = event.key.toLowerCase();
      let handled = true;
      if (mod && k === 'z')
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' });
      else if (mod && k === 'y') dispatch({ type: 'REDO' });
      else if (mod && k === 'c') {
        setClipboard({ drawing: structuredClone(d), ids: [...ids] });
        pasteOffset.current = 20;
      } else if (mod && (k === 'v' || k === 'd')) {
        const source = k === 'd' ? { drawing: d, ids } : clipboard;
        if (
          source &&
          d.definition.elements.length + source.ids.length <= 1000
        ) {
          const result = copies(
            source.drawing,
            d,
            source.ids,
            activeArea,
            () => crypto.randomUUID(),
            pasteOffset.current,
          );
          dispatch({ type: 'EDIT', value: result.drawing });
          setSelected(result.ids);
          pasteOffset.current += 20;
        }
      } else if (k === 'delete' || k === 'backspace') {
        if (!ids.some((id) => protectedIds.includes(id)))
          dispatch({ type: 'EDIT', value: remove(d, ids) });
      } else if (k === 'escape') {
        if (dialog && !ids.length) return;
        setSelected([]);
        setTool('select');
      } else if (
        ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)
      ) {
        const step = event.shiftKey ? 10 : 1;
        dispatch({
          type: 'EDIT',
          value: nudge(d, ids, {
            x: k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0,
            y: k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0,
          }),
        });
      } else handled = false;
      if (handled) event.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const publicSpaces = Object.entries(drawing.spaces).map(([elementId, s]) => ({
    elementId,
    label: s.label,
    widthFeet: s.widthFeet,
    depthFeet: s.depthFeet,
    amenities: s.amenities,
    vendor:
      assignments.find((a) =>
        data.spaces?.some(
          (space) => space.id === a.spaceId && space.elementId === elementId,
        ),
      )?.businessSnapshot ?? null,
  }));
  async function save(publish = false) {
    if (saving) return;
    setSaving(true);
    try {
      if (onSave) {
        await onSave(drawing);
        return;
      }
      const saved = (await run({
        action: 'SAVE_LAYOUT',
        id: version.id,
        expectedRevision: version.revision,
        data: { ...drawing, name },
      })) as LayoutVersion;
      if (saved && publish)
        await run({
          action: 'PUBLISH_LAYOUT',
          id: saved.id,
          expectedRevision: saved.revision,
          data: {},
        });
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="designer"
      aria-label="Market layout editor"
      data-testid="layout-editor"
      onBlurCapture={() => {
        typing.current = '';
      }}
    >
      <header className="designer-header">
        <div>
          <h1>{name}</h1>
          <StatusBadge>{version.status}</StatusBadge>
          <span className={dirty ? 'designer-dirty' : ''} role="status">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>
        <label>
          Area{' '}
          <Select
            aria-label="Area"
            value={activeArea}
            onChange={(e) => {
              setArea(e.target.value);
              setSelected([]);
            }}
          >
            {definition.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="designer-save">
          <Button
            variant="secondary"
            size="compact"
            type="button"
            disabled={!editable || !history.past.length}
            onClick={() => dispatch({ type: 'UNDO' })}
          >
            Undo
          </Button>
          <Button
            variant="secondary"
            size="compact"
            type="button"
            disabled={!editable || !history.future.length}
            onClick={() => dispatch({ type: 'REDO' })}
          >
            Redo
          </Button>
          {editable && (
            <>
              <Button
                variant="secondary"
                size="compact"
                type="button"
                disabled={!dirty || saving}
                onClick={() => save()}
              >
                Save layout
              </Button>
              {!onSave && version.status === 'DRAFT' && (
                <Button
                  variant="primary"
                  size="compact"
                  type="button"
                  disabled={saving}
                  onClick={() => save(true)}
                >
                  Save and publish layout
                </Button>
              )}
            </>
          )}
          {canManage && !onSave && (
            <Button
              variant="secondary"
              size="compact"
              type="button"
              disabled={dirty || saving}
              onClick={async () => {
                const v = (await run({
                  action: 'CLONE_LAYOUT',
                  id: version.id,
                  expectedRevision: version.revision,
                  data: {},
                })) as LayoutVersion;
                if (v) onClone?.(v);
              }}
            >
              Copy Layout
            </Button>
          )}
        </div>
      </header>
      <div className="designer-commands" aria-label="Selection commands">
        <span>
          {ids.length ? `${ids.length} selected` : 'Select an object to edit'}
        </span>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={!editable || !ids.length}
          onClick={copy}
        >
          Copy
        </Button>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={!editable || !clipboard}
          onClick={() => paste()}
        >
          Paste
        </Button>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={!editable || !ids.length}
          onClick={duplicate}
        >
          Duplicate
        </Button>
        <Button
          variant="destructive"
          size="compact"
          type="button"
          disabled={
            !editable || !mutable || ids.some((id) => protectedIds.includes(id))
          }
          onClick={() => update(remove(drawing, ids))}
        >
          Delete
        </Button>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={!editable || !ids.length}
          onClick={() => flags(ids, { locked: !items.every((e) => e.locked) })}
        >
          {items.length && items.every((e) => e.locked) ? 'Unlock' : 'Lock'}
        </Button>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={!editable || !ids.length}
          onClick={() =>
            flags(ids, { editorHidden: !items.every((e) => e.editorHidden) })
          }
        >
          {items.length && items.every((e) => e.editorHidden) ? 'Show' : 'Hide'}
        </Button>
        <label className="sr-only" htmlFor="designer-arrange">
          Arrange selection
        </label>
        <Select
          id="designer-arrange"
          value=""
          disabled={!editable || !mutable}
          onChange={(e) =>
            update(
              reorder(
                drawing,
                ids,
                e.target.value as 'front' | 'forward' | 'backward' | 'back',
              ),
            )
          }
        >
          <option value="">Arrange…</option>
          <option value="front">Bring to front</option>
          <option value="forward">Bring forward</option>
          <option value="backward">Send backward</option>
          <option value="back">Send to back</option>
        </Select>
        <label className="sr-only" htmlFor="designer-align">
          Align selection
        </label>
        <Select
          id="designer-align"
          value=""
          disabled={!editable || !mutable || ids.length < 2}
          onChange={(e) => update(align(drawing, ids, e.target.value))}
        >
          <option value="">Align…</option>
          {[
            ['left', 'Align left'],
            ['center', 'Align center horizontally'],
            ['right', 'Align right'],
            ['top', 'Align top'],
            ['middle', 'Align center vertically'],
            ['bottom', 'Align bottom'],
            ['horizontal', 'Distribute horizontally'],
            ['vertical', 'Distribute vertically'],
          ].map(([v, label]) => (
            <option
              key={v}
              value={v}
              disabled={
                ['horizontal', 'vertical'].includes(v!) && ids.length < 3
              }
            >
              {label}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={
            !editable ||
            !mutable ||
            ids.length < 2 ||
            items.some((e) => e.type === 'SPACE')
          }
          onClick={() => update(group(drawing, ids, crypto.randomUUID()))}
        >
          Group
        </Button>
        <Button
          variant="secondary"
          size="compact"
          type="button"
          disabled={!editable || !mutable || !items.some((e) => e.groupId)}
          onClick={() => update(group(drawing, ids))}
        >
          Ungroup
        </Button>
      </div>
      <div className="designer-body">
        <div className="designer-tools" aria-label="Design tools">
          <Button
            variant={tool === 'select' ? 'primary' : 'secondary'}
            size="compact"
            type="button"
            aria-pressed={tool === 'select'}
            onClick={() => setTool('select')}
          >
            ↖ Select
          </Button>
          <Button
            variant={tool === 'pan' ? 'primary' : 'secondary'}
            size="compact"
            type="button"
            aria-pressed={tool === 'pan'}
            onClick={() => setTool('pan')}
          >
            ✥ Pan
          </Button>
          {editable && (
            <>
              {(
                [
                  'SPACE',
                  'RECTANGLE',
                  'CIRCLE',
                  'TRIANGLE',
                  'LINE',
                  'TEXT',
                  'IMAGE',
                ] as const
              ).map((type) => (
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  key={type}
                  aria-label={`Add ${type === 'SPACE' ? 'booth' : type.toLowerCase()}`}
                  title={`Add ${type === 'SPACE' ? 'booth' : type.toLowerCase()}`}
                  onClick={() => add(type)}
                >
                  <span aria-hidden="true">
                    {
                      {
                        SPACE: '▦',
                        RECTANGLE: '□',
                        CIRCLE: '○',
                        TRIANGLE: '△',
                        LINE: '╱',
                        TEXT: 'T',
                        IMAGE: '▧',
                      }[type]
                    }
                  </span>
                  {type === 'SPACE'
                    ? 'Booth'
                    : type.charAt(0) + type.slice(1).toLowerCase()}
                </Button>
              ))}
              <Button
                variant={tool === 'draw' ? 'primary' : 'secondary'}
                size="compact"
                type="button"
                aria-pressed={tool === 'draw'}
                onClick={() => setTool('draw')}
              >
                ✎ Draw path
              </Button>
            </>
          )}
        </div>
        <MapCanvas
          ref={canvas}
          definition={definition}
          areaId={activeArea}
          spaces={publicSpaces}
          selectedIds={ids}
          onSelection={setSelected}
          editable={editable}
          onChange={change}
          onPath={(path) => add('LINE', path)}
          tool={tool}
          grid={grid}
          snap={snap}
          spacing={spacing}
        />
        <aside className="designer-sidebar" aria-label="Layout properties">
          <div className="designer-tabs">
            <Button
              variant="tertiary"
              type="button"
              aria-pressed={panel === 'inspector'}
              onClick={() => setPanel('inspector')}
            >
              Inspector
            </Button>
            <Button
              variant="tertiary"
              type="button"
              aria-pressed={panel === 'layers'}
              onClick={() => setPanel('layers')}
            >
              Layers
            </Button>
          </div>
          {panel === 'inspector' ? (
            <LayoutInspector
              drawing={drawing}
              selected={ids}
              editable={editable}
              version={version}
              data={data}
              area={activeArea}
              name={name}
              setName={setName}
              canRename={!onSave}
              update={update}
              geometry={inspectorGeometry}
              booth={changeBooth}
              grid={grid}
              setGrid={setGrid}
              snap={snap}
              setSnap={setSnap}
              spacing={spacing}
              setSpacing={setSpacing}
              sync={sync}
            />
          ) : (
            <LayoutLayers
              elements={definition.elements.filter(
                (e) => e.areaId === activeArea,
              )}
              selected={ids}
              select={(id, shift) =>
                setSelected(selectIds(definition.elements, ids, id, shift))
              }
              locate={(id) => {
                canvas.current?.locate(id);
                setSelected(selectIds(definition.elements, [], id));
              }}
              flags={flags}
              editable={editable}
            />
          )}
        </aside>
      </div>
      <footer className="designer-footer">
        <span>
          {definition.elements.length} objects ·{' '}
          {Object.keys(drawing.spaces).length} booths
        </span>
        <span>Ctrl/Cmd + D duplicate · Arrow keys nudge · Esc clear</span>
      </footer>
    </section>
  );
}
