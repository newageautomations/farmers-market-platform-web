import { EmptyState } from '@market/ui';
import { AnimatedDisclosure, StatusBadge, MarketDialog } from '../presentation';
import { go, RouteLink } from '../../vendor/common';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
  IconButton,
  Input,
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
  environmentStyle,
  type MapAsset,
  simplifyMapPath,
  environmentPresets,
  arrangementUnits,
  UtilityIcon,
  isMapLegend,
  MAP_LEGEND_TEMPLATE,
  type Viewport,
} from '@market/ui';
import { Control } from './common';
import {
  LayoutCanvasSettings,
  LayoutInspector,
  type InspectorTab,
} from './LayoutInspector';
import { LayoutLayers } from './LayoutLayers';
import { LayoutAssets } from './LayoutAssets';
import { LayoutTools, type BoothVariant } from './LayoutTools';
import {
  DrawerHeader,
  EditorRail,
  MenuItem,
  ToolbarMenu,
  selectionAnchor,
  type DrawerId,
} from './LayoutEditorChrome';
import {
  photoSize,
  type LayoutMedia,
  type LayoutPhoto,
} from './LayoutImagePicker';
import { LayoutSmartTools } from './LayoutSmartTools';
import { boothStatus } from './booth-status';
import './designer.css';
export { drawingHistory } from '@market/ui';
// Feature composition shared by the library and editor copy actions.
// Reuses the existing dialog and form controls; it adds no UI primitive.
function CopyLayoutDialog({
  version,
  run,
  onClose,
  onCopied,
}: {
  version: LayoutVersion;
  run: (c: OperationsCommand) => Promise<unknown>;
  onClose: () => void;
  onCopied: (version: LayoutVersion) => void;
}) {
  const [mode, setMode] = useState<'VARIATION' | 'INDEPENDENT'>('VARIATION');
  const [busy, setBusy] = useState(false);
  const copying = useRef(false);
  return (
    <MarketDialog
      open
      title="Copy layout"
      busy={busy}
      onClose={onClose}
      actions={
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (copying.current) return;
            copying.current = true;
            setBusy(true);
            try {
              const copied = (await run({
                action: 'CLONE_LAYOUT',
                id: version.id,
                expectedRevision: version.revision,
                data: { copyMode: mode },
              })) as LayoutVersion | undefined;
              if (copied) {
                onClose();
                onCopied(copied);
              }
            } finally {
              copying.current = false;
              setBusy(false);
            }
          }}
        >
          Create copy
        </Button>
      }
    >
      <Control label="Copy mode">
        {(id) => (
          <Select
            id={id}
            value={mode}
            disabled={busy}
            onChange={(event) =>
              setMode(event.target.value as 'VARIATION' | 'INDEPENDENT')
            }
          >
            <option value="VARIATION">Create a variation</option>
            <option value="INDEPENDENT">Create an independent layout</option>
          </Select>
        )}
      </Control>
      <p>
        Create a variation: Same physical booths, different arrangement. Changes
        to this copy do not change the original layout.
      </p>
      <p>Create an independent layout: Separate booths with new identities.</p>
      <p>
        Assignments are not copied. Existing layout-switch protections still
        apply.
      </p>
    </MarketDialog>
  );
}
const alignOptions = [
  ['left', 'Align left'],
  ['center', 'Align center horizontally'],
  ['right', 'Align right'],
  ['top', 'Align top'],
  ['middle', 'Align center vertically'],
  ['bottom', 'Align bottom'],
  ['horizontal', 'Distribute horizontally'],
  ['vertical', 'Distribute vertically'],
] as const;
/** Editor UI state carried across the remount that follows a save, so the
 *  view, panels and selection stay put while the saved version reloads. */
interface EditorSession {
  at: number;
  /** Revision being saved; only a later revision's remount restores it. */
  revision: number;
  selected: string[];
  area: string;
  drawer: DrawerId | null;
  inspectorTab: InspectorTab;
  sidebarOpen: boolean;
  smartTool: string;
  grid: boolean;
  snap: boolean;
  snapObjects: boolean;
  spacing: number;
  tool: MapTool;
  view?: Viewport;
}
const editorSessions = new Map<string, EditorSession>();
// Save-and-publish remounts twice (one per revision), so a session is kept
// until it expires or the next save replaces it.
function takeEditorSession(key: string, revision: number) {
  const session = editorSessions.get(key);
  if (!session) return undefined;
  if (Date.now() - session.at > 30_000) {
    editorSessions.delete(key);
    return undefined;
  }
  return session.revision !== revision ? session : undefined;
}
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
  const [copyVersion, setCopyVersion] = useState<LayoutVersion | null>(null);
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
                        onClick={() => setCopyVersion(version)}
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
      {copyVersion && (
        <CopyLayoutDialog
          version={copyVersion}
          run={run}
          onClose={() => setCopyVersion(null)}
          onCopied={(v) => go(`/market/layouts/${v.layoutId}/edit`)}
        />
      )}
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
  media,
}: {
  data: MarketOperationsData;
  layoutId: number;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  media?: LayoutMedia;
}) {
  const version = data.layouts?.some(
    (layout) => layout.id === layoutId && !layout.deletedAt,
  )
    ? currentLayoutVersion(data, layoutId)
    : undefined;
  return (
    <div className="layout-editor-screen">
      {version ? (
        <LayoutEditor
          key={`${version.id}:${version.revision}`}
          version={version}
          data={data}
          run={run}
          canManage={canManage}
          media={media}
          exit={{ to: '/market/layouts', label: 'Exit to layouts' }}
          editablePublished
          onClone={(v) => go(`/market/layouts/${v.layoutId}/edit`)}
        />
      ) : (
        <>
          <div className="layout-screen-navigation">
            <RouteLink to="/market/layouts">Back to layouts</RouteLink>
          </div>
          <p>This layout is unavailable or archived.</p>
        </>
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
  exit,
  notice,
  media,
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
  /** Header Exit link; the label is its full accessible name. */
  exit?: { to: string; label: string };
  /** Context shown beneath the header, such as occurrence-only editing. */
  notice?: string;
  /** Market image library for uploads; omitted without website access. */
  media?: LayoutMedia;
}) {
  const initial: Drawing = {
    definition: version.definition,
    physicalBoothIds: Object.fromEntries(
      (data.spaces ?? [])
        .filter((s) => s.layoutVersionId === version.id && s.physicalBoothId)
        .map((s) => [s.elementId, s.physicalBoothId!]),
    ),
    spaces: Object.fromEntries(
      data.spaces
        ?.filter((s) => s.layoutVersionId === version.id)
        .map((s) => [s.elementId, s.details]) ?? [],
    ),
  };
  const sessionKey = `${version.layoutId}:${occurrenceId ?? 0}`;
  const [restored] = useState(() =>
    takeEditorSession(sessionKey, version.revision),
  );
  const [history, dispatch] = useReducer(drawingHistory, {
      past: [],
      future: [],
      present: initial,
    }),
    [selected, setSelected] = useState<string[]>(restored?.selected ?? []),
    [grid, setGrid] = useState(restored?.grid ?? true),
    [snap, setSnap] = useState(restored?.snap ?? true),
    [snapObjects, setSnapObjects] = useState(restored?.snapObjects ?? true),
    [statusMode, setStatusMode] = useState(false),
    [spacing, setSpacing] = useState(
      restored?.spacing ?? version.definition.pixelsPerFoot,
    ),
    [area, setArea] = useState(
      restored?.area ??
        version.definition.elements[0]?.areaId ??
        version.definition.areas[0]?.id ??
        '',
    ),
    [tool, setTool] = useState<MapTool>(restored?.tool ?? 'select'),
    [clipboard, setClipboard] = useState<{
      drawing: Drawing;
      ids: string[];
    } | null>(null),
    [name, setName] = useState(
      data.layouts?.find((l) => l.id === version.layoutId)?.name ??
        'Market layout',
    ),
    [drawer, setDrawer] = useState<DrawerId | null>(
      restored ? restored.drawer : canManage ? 'add' : null,
    ),
    [inspectorTab, setInspectorTab] = useState<InspectorTab>(
      restored?.inspectorTab ?? 'properties',
    ),
    [viewport, setViewport] = useState<{
      view: Viewport;
      size: { width: number; height: number };
    } | null>(null),
    [environment, setEnvironment] = useState(''),
    [preview, setPreview] = useState(false),
    [sidebarOpen, setSidebarOpen] = useState(restored?.sidebarOpen ?? true),
    [smartTool, setSmartTool] = useState(restored?.smartTool ?? 'row'),
    [saving, setSaving] = useState<'save' | 'publish' | null>(null),
    [initialView] = useState(restored?.view),
    [copyOpen, setCopyOpen] = useState(false);
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
  const alignmentUnits = arrangementUnits(drawing, ids).length;
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
    if (editable && !preview) dispatch({ type: 'EDIT', value, merge });
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
    style: Partial<MapElement> = {},
    space: Partial<SpaceDetails> = {},
  ) {
    if (!editable || preview || definition.elements.length >= 1000) return;
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
    const width =
        style.width ??
        (type === 'SPACE' && space.widthFeet
          ? space.widthFeet * definition.pixelsPerFoot
          : type === 'TEXT'
            ? 200
            : size),
      height =
        style.height ??
        (type === 'SPACE' && space.depthFeet
          ? space.depthFeet * definition.pixelsPerFoot
          : type === 'TEXT'
            ? 40
            : type === 'LINE'
              ? 60
              : size);
    const e: MapElement = {
      id,
      areaId: activeArea,
      type,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      rotation: 0,
      zIndex: Math.max(-1, ...definition.elements.map((e) => e.zIndex)) + 1,
      text: label,
      fill:
        type === 'SPACE' ? '#e0ebd9' : type === 'TEXT' ? '#173925' : '#d4dccf',
      ...path,
      ...style,
    };
    update({
      ...drawing,
      definition: { ...definition, elements: [...definition.elements, e] },
      spaces:
        type === 'SPACE'
          ? { ...drawing.spaces, [id]: { ...baseSpace(label), ...space } }
          : drawing.spaces,
    });
    setSelected([id]);
    if (!path) setTool('select');
    setSidebarOpen(true);
  }
  function addBooth(variant: BoothVariant) {
    add('SPACE', undefined, {}, variant === 'double' ? { widthFeet: 20 } : {});
  }
  const latestAdd = useRef(add);
  useEffect(() => {
    latestAdd.current = add;
  });
  async function addPhoto(photo: LayoutPhoto) {
    const size = await photoSize(photo.url);
    latestAdd.current('IMAGE', undefined, {
      imageUrl: photo.url,
      text: photo.name,
      ...size,
    });
  }
  function addAsset(asset: MapAsset) {
    add('IMAGE', undefined, {
      assetId: asset.id,
      fill: asset.color,
      text: asset.name,
      width: asset.width,
      height: asset.height,
    });
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
    editable: editable && !preview,
    clipboard,
    activeArea,
    protectedIds,
  });
  useEffect(() => {
    commands.current = {
      drawing,
      ids,
      editable: editable && !preview,
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
    spaceType: s.spaceType,
    amenities: s.amenities,
    vendor:
      assignments.find((a) =>
        data.spaces?.some(
          (space) => space.id === a.spaceId && space.elementId === elementId,
        ),
      )?.businessSnapshot ?? null,
  }));
  const statuses =
    statusMode && occurrenceId
      ? Object.fromEntries(
          publicSpaces.map((s) => {
            const space = data.spaces?.find(
              (space) =>
                space.layoutVersionId === version.id &&
                space.elementId === s.elementId,
            );
            return [
              s.elementId,
              boothStatus(
                space
                  ? assignments.find((a) => a.spaceId === space.id)
                  : undefined,
                data.invoices,
              ),
            ];
          }),
        )
      : {};
  async function save(publish = false) {
    if (saving || (!onSave && !name.trim())) return;
    setSaving(publish ? 'publish' : 'save');
    // A successful save reloads and remounts this editor with the new revision.
    editorSessions.set(sessionKey, {
      at: Date.now(),
      revision: version.revision,
      selected: ids,
      area: activeArea,
      drawer,
      inspectorTab,
      sidebarOpen,
      smartTool,
      grid,
      snap,
      snapObjects,
      spacing,
      tool: tool === 'draw' || tool === 'points' ? 'select' : tool,
      view: viewport?.view,
    });
    try {
      if (onSave) {
        await onSave(drawing);
        return;
      }
      const saved = (await run({
        action: 'SAVE_LAYOUT',
        id: version.id,
        expectedRevision: version.revision,
        data: { ...drawing, name: name.trim() },
      })) as LayoutVersion;
      if (saved && publish)
        await run({
          action: 'PUBLISH_LAYOUT',
          id: saved.id,
          expectedRevision: saved.revision,
          data: {},
        });
    } finally {
      setSaving(null);
    }
  }
  function openSmart(next: string) {
    setSmartTool(next);
    setDrawer('smart');
  }
  const onViewChange = useCallback(
    (view: Viewport, size: { width: number; height: number }) =>
      setViewport({ view, size }),
    [],
  );
  function occupancy(elementId: string) {
    if (!occurrenceId) return undefined;
    const space = data.spaces?.find(
      (space) =>
        space.layoutVersionId === version.id && space.elementId === elementId,
    );
    const assignment = space
      ? assignments.find((a) => a.spaceId === space.id)
      : undefined;
    return {
      vendor: assignment?.businessSnapshot.businessName ?? null,
      status: boothStatus(assignment, data.invoices),
    };
  }
  const removable =
    editable && mutable && !ids.some((id) => protectedIds.includes(id));
  const allLocked = items.length > 0 && items.every((e) => e.locked),
    allHidden = items.length > 0 && items.every((e) => e.editorHidden);
  const drawerItems: Array<{
    id: DrawerId;
    label: string;
    icon: Parameters<typeof UtilityIcon>[0]['name'];
  }> = [
    ...(editable
      ? [{ id: 'add' as const, label: 'Add', icon: 'plus' as const }]
      : []),
    { id: 'layers', label: 'Layers', icon: 'layers' },
    ...(editable
      ? [
          {
            id: 'smart' as const,
            label: 'Smart design',
            icon: 'sparkle' as const,
          },
          { id: 'assets' as const, label: 'Assets', icon: 'image' as const },
        ]
      : []),
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  const openDrawer =
    drawer && drawerItems.some((item) => item.id === drawer) ? drawer : null;
  const drawerTitle = {
    add: 'Add elements',
    layers: 'Layers',
    smart: 'Smart design',
    assets: 'Assets',
    settings: 'Settings',
  } as const;
  const anchor = selectionAnchor(
    items,
    viewport?.view ?? null,
    viewport?.size ?? null,
  );
  const zoom = Math.round((viewport?.view.scale ?? 1) * 100);
  const areaName = definition.areas.find((a) => a.id === activeArea)?.name;
  const toolLabel =
    tool === 'draw'
      ? environmentPresets.find((preset) => preset.id === environment)?.name ||
        'Custom path'
      : tool === 'points'
        ? 'Edit path points'
        : tool === 'pan'
          ? 'Pan'
          : 'Select';
  return (
    <section
      className={`designer ${preview ? 'is-preview' : ''} ${sidebarOpen ? '' : 'sidebar-collapsed'} ${openDrawer && !preview ? 'drawer-open' : ''}`}
      aria-label="Market layout editor"
      data-testid="layout-editor"
      onBlurCapture={() => {
        typing.current = '';
      }}
    >
      <header className="designer-header designer-chrome">
        <div className="designer-header-start">
          {exit && (
            <span className="designer-exit">
              <RouteLink to={exit.to}>
                <UtilityIcon name="close" />
                <span aria-hidden="true">Exit</span>
                <span className="sr-only">{exit.label}</span>
              </RouteLink>
            </span>
          )}
          <div className="designer-title">
            <h1>
              {occurrenceId ? 'Occurrence Layout Editor' : 'Market Layout Editor'}
            </h1>
            <p>
              {!onSave && editable && !preview ? (
                <span className="designer-name">
                  <Input
                    className="designer-name-input"
                    aria-label="Layout name"
                    aria-invalid={!name.trim()}
                    title="Rename layout"
                    value={name}
                    maxLength={200}
                    size={Math.max(8, Math.min(40, name.length + 1))}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === 'Escape')
                        event.currentTarget.blur();
                    }}
                  />
                  <UtilityIcon name="edit" />
                </span>
              ) : (
                <span className="designer-title-name">{name}</span>
              )}
              {areaName && <span aria-hidden="true">·</span>}
              {areaName && <span>{areaName}</span>}
              <StatusBadge>{version.status}</StatusBadge>
              <span
                className={
                  dirty ? 'designer-save-state is-dirty' : 'designer-save-state'
                }
                role="status"
              >
                {saving === 'publish'
                  ? 'Publishing…'
                  : saving
                    ? 'Saving…'
                    : !onSave && !name.trim()
                      ? 'Layout name required'
                      : dirty
                        ? 'Unsaved changes'
                        : 'All changes saved'}
              </span>
            </p>
          </div>
        </div>
        <div className="designer-header-center">
          {!preview && (
            <div
              className="designer-segment"
              role="group"
              aria-label="Navigation"
            >
              <IconButton
                icon="cursor"
                label="Select"
                variant="tertiary"
                size="compact"
                type="button"
                aria-pressed={tool === 'select'}
                onClick={() => setTool('select')}
              />
              <IconButton
                icon="hand"
                label="Pan"
                variant="tertiary"
                size="compact"
                type="button"
                aria-pressed={tool === 'pan'}
                onClick={() => setTool('pan')}
              />
            </div>
          )}
          {!preview && (
            <div className="designer-segment" role="group" aria-label="History">
              <IconButton
                icon="undo"
                label="Undo"
                variant="tertiary"
                size="compact"
                type="button"
                disabled={!editable || !history.past.length}
                onClick={() => dispatch({ type: 'UNDO' })}
              />
              <IconButton
                icon="redo"
                label="Redo"
                variant="tertiary"
                size="compact"
                type="button"
                disabled={!editable || !history.future.length}
                onClick={() => dispatch({ type: 'REDO' })}
              />
              <IconButton
                icon="paste"
                label="Paste"
                variant="tertiary"
                size="compact"
                type="button"
                disabled={!editable || !clipboard}
                onClick={() => paste()}
              />
            </div>
          )}
          <div className="designer-segment" role="group" aria-label="Zoom">
            <IconButton
              icon="minus"
              label="Zoom out"
              variant="tertiary"
              size="compact"
              type="button"
              onClick={() => canvas.current?.zoomBy(1 / 1.25)}
            />
            <Button
              type="button"
              variant="tertiary"
              size="compact"
              className="designer-zoom-value"
              aria-label="Reset zoom"
              title="Reset zoom to 100%"
              onClick={() => canvas.current?.resetZoom()}
            >
              {zoom}%
            </Button>
            <IconButton
              icon="plus"
              label="Zoom in"
              variant="tertiary"
              size="compact"
              type="button"
              onClick={() => canvas.current?.zoomBy(1.25)}
            />
          </div>
          <IconButton
            icon="expand"
            label="Fit map"
            variant="tertiary"
            size="compact"
            type="button"
            onClick={() => canvas.current?.fit()}
          />
        </div>
        <div className="designer-header-end">
          {definition.areas.length > 0 && (
            <Select
              aria-label="Area"
              className="designer-area"
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
          )}
          <Button
            variant="secondary"
            size="compact"
            type="button"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            <UtilityIcon name={preview ? 'edit' : 'eye'} />
            {preview ? 'Back to editing' : 'Preview'}
          </Button>
          {!preview && (
            <IconButton
              icon="panel"
              label={sidebarOpen ? 'Hide panel' : 'Show panel'}
              variant="tertiary"
              size="compact"
              type="button"
              className="designer-panel-toggle"
              aria-expanded={sidebarOpen}
              aria-controls="layout-properties"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            />
          )}
          {!preview && canManage && !onSave && (
            <IconButton
              icon="copy"
              label="Copy Layout"
              variant="tertiary"
              size="compact"
              type="button"
              disabled={dirty || !!saving}
              onClick={() => setCopyOpen(true)}
            />
          )}
          {!preview && editable && (
            <Button
              variant="secondary"
              size="compact"
              type="button"
              className="designer-save"
              loading={saving === 'save'}
              disabled={!dirty || !!saving || (!onSave && !name.trim())}
              onClick={() => save()}
            >
              Save layout
            </Button>
          )}
          {!preview && editable && !onSave && version.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="compact"
              type="button"
              className="designer-publish"
              aria-label="Save and publish layout"
              loading={saving === 'publish'}
              disabled={!!saving || !name.trim()}
              onClick={() => save(true)}
            >
              <UtilityIcon name="check" />
              Publish layout
            </Button>
          )}
        </div>
      </header>
      {notice && !preview && (
        <p className="designer-notice">
          <UtilityIcon name="calendar" />
          {notice}
        </p>
      )}
      {preview && (
        <p className="designer-preview-note" role="status">
          Public map preview of current {dirty ? 'unsaved ' : ''}
          {version.status === 'DRAFT' ? 'draft' : 'editor'} content. This does
          not publish changes. Vendor assignments are omitted.
        </p>
      )}
      <div className="designer-body">
        {!preview && (
          <EditorRail
            items={drawerItems}
            active={openDrawer}
            onSelect={(id) => setDrawer(openDrawer === id ? null : id)}
          />
        )}
        {!preview && openDrawer && (
          <aside
            id="layout-drawer"
            className="designer-drawer designer-chrome"
            aria-label={drawerTitle[openDrawer]}
          >
            <DrawerHeader
              title={drawerTitle[openDrawer]}
              onClose={() => setDrawer(null)}
            />
            <div className="designer-drawer-content">
              {openDrawer === 'add' ? (
                <LayoutTools
                  tool={tool}
                  setTool={setTool}
                  add={add}
                  addBooth={addBooth}
                  addAsset={addAsset}
                  environment={environment}
                  setEnvironment={setEnvironment}
                  canEditPoints={
                    items.length === 1 &&
                    items[0]?.type === 'LINE' &&
                    !!items[0]?.points &&
                    mutable
                  }
                  openSmart={openSmart}
                  media={media}
                  addPhoto={addPhoto}
                />
              ) : openDrawer === 'smart' ? (
                <LayoutSmartTools
                  activeTool={smartTool}
                  onToolChange={setSmartTool}
                  drawing={drawing}
                  area={activeArea}
                  selected={ids}
                  editable={editable}
                  center={() => canvas.current?.center() ?? { x: 100, y: 100 }}
                  update={update}
                  select={(ids) => {
                    setSelected(ids);
                    setTool('select');
                  }}
                  snapObjects={snapObjects}
                  setSnapObjects={setSnapObjects}
                  occurrence={!!occurrenceId}
                  statusMode={statusMode}
                  setStatusMode={setStatusMode}
                />
              ) : openDrawer === 'assets' ? (
                <LayoutAssets
                  arrangements={() => openSmart('arrangement')}
                  disabled={!editable || definition.elements.length >= 1000}
                  insert={addAsset}
                  media={media}
                  insertPhoto={addPhoto}
                />
              ) : openDrawer === 'settings' ? (
                <LayoutCanvasSettings
                  drawing={drawing}
                  editable={editable}
                  update={update}
                  grid={grid}
                  setGrid={setGrid}
                  snap={snap}
                  setSnap={setSnap}
                  snapObjects={snapObjects}
                  setSnapObjects={setSnapObjects}
                  spacing={spacing}
                  setSpacing={setSpacing}
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
                  rename={(id, value) => {
                    const element = definition.elements.find(
                      (e) => e.id === id,
                    );
                    if (!element || element.locked) return;
                    if (element.type === 'SPACE')
                      changeBooth(id, { label: value });
                    else
                      change([
                        {
                          ...element,
                          text: isMapLegend(element)
                            ? MAP_LEGEND_TEMPLATE + value
                            : value,
                        },
                      ]);
                  }}
                  order={(id, direction) => {
                    const targets = selectIds(definition.elements, [], id);
                    if (
                      definition.elements.some(
                        (e) =>
                          targets.includes(e.id) &&
                          (e.locked || e.editorHidden),
                      )
                    )
                      return;
                    update(reorder(drawing, targets, direction));
                  }}
                  flags={flags}
                  editable={editable}
                />
              )}
            </div>
          </aside>
        )}
        <div className="designer-stage">
          <MapCanvas
            ref={canvas}
            definition={definition}
            areaId={activeArea}
            showNavigation={false}
            onViewChange={onViewChange}
            initialView={initialView}
            spaces={
              preview
                ? publicSpaces.map(
                    ({ elementId, label, widthFeet, depthFeet, amenities }) => ({
                      elementId,
                      label,
                      widthFeet,
                      depthFeet,
                      amenities,
                      vendor: null,
                    }),
                  )
                : publicSpaces
            }
            statuses={preview ? {} : statuses}
            selectedIds={preview ? [] : ids}
            onSelection={preview ? undefined : setSelected}
            editable={editable && !preview}
            onChange={change}
            onPath={(path) => {
              const style = environmentStyle(environment);
              add(
                'LINE',
                environment ? { ...path, points: simplifyMapPath(path) } : path,
                {
                  ...style,
                  ...(style.closed
                    ? {
                        zIndex:
                          Math.min(
                            0,
                            ...definition.elements.map((e) => e.zIndex),
                          ) - 1,
                      }
                    : {}),
                },
              );
            }}
            tool={preview ? 'pan' : tool}
            grid={grid && !preview}
            snap={snap}
            snapObjects={snapObjects}
            spacing={spacing}
          />
          {!preview && ids.length > 0 && (
            <div
              className={`designer-selection-toolbar designer-chrome ${anchor ? (anchor.below ? 'is-below' : 'is-above') : 'is-docked'}`}
              role="toolbar"
              aria-label="Selection commands"
              style={anchor ? { left: anchor.x, top: anchor.y } : undefined}
            >
              <span className="designer-selection-count">
                {ids.length} selected
              </span>
              <IconButton
                icon="copy"
                label="Duplicate"
                variant="tertiary"
                size="compact"
                type="button"
                disabled={!editable}
                onClick={duplicate}
              />
              <IconButton
                icon="trash"
                label="Delete"
                variant="tertiary"
                size="compact"
                type="button"
                className="designer-danger"
                disabled={!removable}
                onClick={() => update(remove(drawing, ids))}
              />
              <IconButton
                icon={allLocked ? 'unlock' : 'lock'}
                label={allLocked ? 'Unlock' : 'Lock'}
                variant="tertiary"
                size="compact"
                type="button"
                disabled={!editable}
                onClick={() => flags(ids, { locked: !allLocked })}
              />
              <ToolbarMenu
                icon="layers"
                label="Arrange"
                disabled={!editable || !mutable}
              >
                {(close) =>
                  (
                    [
                      ['front', 'Bring to front'],
                      ['forward', 'Bring forward'],
                      ['backward', 'Send backward'],
                      ['back', 'Send to back'],
                    ] as const
                  ).map(([value, label]) => (
                    <MenuItem
                      key={value}
                      onClick={() => {
                        update(reorder(drawing, ids, value));
                        close();
                      }}
                    >
                      {label}
                    </MenuItem>
                  ))
                }
              </ToolbarMenu>
              <ToolbarMenu
                icon="align"
                label="Align selection"
                disabled={!editable || !mutable || alignmentUnits < 2}
              >
                {(close) =>
                  alignOptions.map(([value, label]) => (
                    <MenuItem
                      key={value}
                      disabled={
                        ['horizontal', 'vertical'].includes(value) &&
                        alignmentUnits < 3
                      }
                      onClick={() => {
                        update(align(drawing, ids, value));
                        close();
                      }}
                    >
                      {label}
                    </MenuItem>
                  ))
                }
              </ToolbarMenu>
              <ToolbarMenu icon="more" label="More actions" align="end">
                {(close) => (
                  <>
                    <MenuItem
                      icon="copy"
                      disabled={!editable}
                      onClick={() => {
                        copy();
                        close();
                      }}
                    >
                      Copy
                    </MenuItem>
                    <MenuItem
                      icon={allHidden ? 'eye' : 'eye-off'}
                      disabled={!editable}
                      onClick={() => {
                        flags(ids, { editorHidden: !allHidden });
                        close();
                      }}
                    >
                      {allHidden ? 'Show' : 'Hide'}
                    </MenuItem>
                    <MenuItem
                      icon="layers"
                      disabled={
                        !editable ||
                        !mutable ||
                        ids.length < 2 ||
                        items.some((e) => e.type === 'SPACE')
                      }
                      onClick={() => {
                        update(group(drawing, ids, crypto.randomUUID()));
                        close();
                      }}
                    >
                      Group
                    </MenuItem>
                    <MenuItem
                      disabled={
                        !editable || !mutable || !items.some((e) => e.groupId)
                      }
                      onClick={() => {
                        update(group(drawing, ids));
                        close();
                      }}
                    >
                      Ungroup
                    </MenuItem>
                    <MenuItem
                      icon="align"
                      onClick={() => {
                        openSmart('precision');
                        close();
                      }}
                    >
                      Spacing and size
                    </MenuItem>
                  </>
                )}
              </ToolbarMenu>
            </div>
          )}
        </div>
        {!preview && sidebarOpen && (
          <aside
            id="layout-properties"
            className="designer-sidebar designer-chrome"
            aria-label="Layout properties"
          >
            <LayoutInspector
              drawing={drawing}
              selected={ids}
              editable={editable}
              version={version}
              data={data}
              area={activeArea}
              update={update}
              geometry={inspectorGeometry}
              booth={changeBooth}
              sync={sync}
              design={(next) => openSmart(next)}
              tab={inspectorTab}
              setTab={setInspectorTab}
              remove={() => update(remove(drawing, ids))}
              canRemove={removable}
              occupancy={occurrenceId ? occupancy : undefined}
              media={media}
            />
          </aside>
        )}
      </div>
      {copyOpen && (
        <CopyLayoutDialog
          version={version}
          run={run}
          onClose={() => setCopyOpen(false)}
          onCopied={(v) => onClone?.(v)}
        />
      )}
      <footer className="designer-footer designer-chrome">
        <span>
          {definition.elements.length} objects ·{' '}
          {Object.keys(drawing.spaces).length} booths
        </span>
        <span>
          {preview
            ? 'Public appearance · Drag to pan · Scroll to zoom'
            : `${toolLabel} · Shift-click or drag to multi-select · Space or Alt + drag to pan · Scroll to zoom · Ctrl/Cmd + D duplicate · Arrows nudge · Esc clear`}
        </span>
      </footer>
    </section>
  );
}
