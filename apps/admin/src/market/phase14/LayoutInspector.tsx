import type { Drawing, SyncCategory } from '@market/ui';
import {
  Button,
  Input,
  Select,
  UtilityIcon,
  defaults,
  mapAsset,
  syncCategories,
  isMapLegend,
  MAP_LEGEND_TEMPLATE,
} from '@market/ui';
import type {
  MapElement,
  MarketOperationsData,
  SpaceDetails,
  LayoutVersion,
} from '@market/api';
import { useId, useState, type ComponentProps } from 'react';
import { MarketDialog as Dialog, StatusBadge } from '../presentation';
import { Check, Control, Entry } from './common';
import {
  LayoutBackgroundControls,
  LayoutVisualControls,
} from './LayoutVisualControls';
import { PanelSection } from './LayoutEditorChrome';
import { LayoutImagePicker, type LayoutMedia } from './LayoutImagePicker';
import { objectIcons } from './LayoutTools';

export type InspectorTab = 'properties' | 'style';

const amenityOptions = [
  'ELECTRICITY',
  'WATER',
  'SHADE',
  'COVERED',
  'INDOOR',
  'VEHICLE',
  'FOOD_TRUCK',
];

function elementTitle(e: MapElement, booth: boolean) {
  if (booth) return 'Booth';
  if (isMapLegend(e)) return 'Legend';
  if (e.type === 'IMAGE')
    return e.assetId ? (mapAsset(e.assetId)?.name ?? 'Image') : 'Image';
  if (e.type === 'LINE') return e.closed ? 'Region' : 'Path';
  return e.type.charAt(0) + e.type.slice(1).toLowerCase();
}

/** Read-only booth facts for occurrence editing. */
export interface BoothOccupancy {
  vendor: string | null;
  status?: string;
}

export function LayoutInspector({
  drawing,
  selected,
  editable,
  version,
  data,
  area,
  update,
  geometry,
  booth,
  sync,
  design,
  tab,
  setTab,
  remove,
  canRemove = false,
  occupancy,
  media,
}: {
  drawing: Drawing;
  selected: string[];
  editable: boolean;
  version: LayoutVersion;
  data: MarketOperationsData;
  area: string;
  update: (d: Drawing) => void;
  geometry: (e: MapElement) => void;
  booth: (id: string, patch: Partial<SpaceDetails>) => void;
  sync: (source: string, targets: string[], categories: SyncCategory[]) => void;
  design?: (tool: string) => void;
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
  remove?: () => void;
  canRemove?: boolean;
  occupancy?: (id: string) => BoothOccupancy | undefined;
  /** Market image library for replacing uploaded or URL images. */
  media?: LayoutMedia;
}) {
  const [areaName, setAreaName] = useState(''),
    [syncOpen, setSyncOpen] = useState(false),
    [source, setSource] = useState(''),
    [categories, setCategories] = useState<SyncCategory[]>(['amenities']);
  const sizeId = useId();
  const definition = drawing.definition,
    items = definition.elements.filter((e) => selected.includes(e.id)),
    original = items.length === 1 ? items[0] : undefined,
    e = original ? defaults(original) : undefined,
    s = e ? drawing.spaces[e.id] : undefined,
    currentArea = definition.areas.find((a) => a.id === area),
    facts = e && s ? occupancy?.(e.id) : undefined;
  const title =
    items.length > 1 ? `${items.length} objects` : e ? elementTitle(e, !!s) : 'Layout';
  const icon: ComponentProps<typeof UtilityIcon>['name'] =
    items.length > 1 ? 'layers' : e ? objectIcons[e.type] : 'grid';
  const setMany = (patch: Partial<MapElement>) =>
    update({
      ...drawing,
      definition: {
        ...definition,
        elements: definition.elements.map((item) =>
          selected.includes(item.id) ? { ...item, ...patch } : item,
        ),
      },
    });
  return (
    <div className="designer-inspector" data-testid="layout-inspector">
      <div className="designer-inspector-header">
        <span className="designer-inspector-icon" aria-hidden="true">
          <UtilityIcon name={icon} />
        </span>
        <h2>{title}</h2>
        {items.length > 0 && remove && (
          <Button
            type="button"
            variant="tertiary"
            size="compact"
            iconOnly
            aria-label="Delete selection"
            title="Delete selection"
            disabled={!canRemove}
            onClick={remove}
          >
            <UtilityIcon name="trash" />
          </Button>
        )}
      </div>
      <div className="designer-segmented" role="group" aria-label="Inspector view">
        {(['properties', 'style'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value === 'properties' ? 'Properties' : 'Style'}
          </button>
        ))}
      </div>
      {e?.locked && (
        <p className="designer-muted designer-locked-note">
          <UtilityIcon name="lock" /> Locked. Unlock it to make changes.
        </p>
      )}
      <fieldset disabled={!editable || !!e?.locked} aria-label={`${title} ${tab}`}>
        {tab === 'properties' && !e && items.length < 2 && (
          <>
            <PanelSection title="General">
              <div className="designer-row">
                <span className="designer-row-label">Status</span>
                <StatusBadge>{version.status}</StatusBadge>
              </div>
              <Entry
                label="Area name"
                value={currentArea?.name ?? ''}
                onChange={(name) =>
                  update({
                    ...drawing,
                    definition: {
                      ...definition,
                      areas: definition.areas.map((a) =>
                        a.id === area ? { ...a, name } : a,
                      ),
                    },
                  })
                }
              />
            </PanelSection>
            <PanelSection title="Areas">
              <Entry
                label="New area name"
                value={areaName}
                onChange={setAreaName}
              />
              <div className="designer-actions">
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  disabled={!areaName.trim() || definition.areas.length >= 20}
                  onClick={() => {
                    const id = crypto.randomUUID();
                    update({
                      ...drawing,
                      definition: {
                        ...definition,
                        areas: [
                          ...definition.areas,
                          { id, name: areaName.trim() },
                        ],
                      },
                    });
                    setAreaName('');
                  }}
                >
                  Add area
                </Button>
                <Button
                  variant="destructive-outline"
                  size="compact"
                  type="button"
                  disabled={
                    definition.areas.length < 2 ||
                    definition.elements.some((e) => e.areaId === area)
                  }
                  onClick={() =>
                    update({
                      ...drawing,
                      definition: {
                        ...definition,
                        areas: definition.areas.filter((a) => a.id !== area),
                      },
                    })
                  }
                >
                  Delete empty area
                </Button>
              </div>
            </PanelSection>
            <PanelSection title="Scale">
              <Entry
                label="Pixels per foot"
                type="number"
                min={1}
                max={100}
                value={definition.pixelsPerFoot}
                onChange={(v) => {
                  const scale = Number(v);
                  if (scale < 1 || scale > 100) return;
                  update({
                    ...drawing,
                    definition: {
                      ...definition,
                      pixelsPerFoot: scale,
                      elements: definition.elements.map((e) => {
                        const s = drawing.spaces[e.id];
                        return s
                          ? {
                              ...e,
                              width: s.widthFeet * scale,
                              height: s.depthFeet * scale,
                            }
                          : e;
                      }),
                    },
                  });
                }}
              />
            </PanelSection>
          </>
        )}
        {tab === 'style' && !e && items.length < 2 && (
          <PanelSection title="Map style">
            <p className="designer-muted">
              Select an object to change its fill, outline and effects. Canvas
              background and grid live in Settings.
            </p>
            {design && (
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => design('style')}
              >
                Map style preset
              </Button>
            )}
          </PanelSection>
        )}
        {tab === 'properties' && items.length > 1 && (
          <PanelSection title="Selection">
            <p className="designer-muted">
              {items.length} objects selected. Use the selection toolbar on the
              canvas to move, align, distribute or arrange them.
            </p>
            {items.some((e) => e.type === 'SPACE') && (
              <p className="designer-muted">
                Resize booths individually to keep physical dimensions precise.
                Grouping is available for decorations.
              </p>
            )}
            <p className="designer-muted">
              {items.filter((e) => e.locked).length} locked ·{' '}
              {items.filter((e) => e.editorHidden).length} hidden in editor
            </p>
            <div className="designer-actions">
              {design && (
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => design('precision')}
                >
                  Spacing and size
                </Button>
              )}
              {items.filter((e) => e.type === 'SPACE' && !e.locked).length >
                1 && (
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  onClick={() => {
                    setSource(items.find((e) => e.type === 'SPACE')!.id);
                    setSyncOpen(true);
                  }}
                >
                  Sync booth attributes
                </Button>
              )}
            </div>
          </PanelSection>
        )}
        {tab === 'style' && items.length > 1 && (
          <PanelSection title="Shared appearance">
            {items.every(
              (item) =>
                item.type !== 'SPACE' && !item.locked && !item.editorHidden,
            ) ? (
              <>
                {items.every(
                  (item) => item.type !== 'IMAGE' || item.assetId,
                ) && (
                  <Entry
                    label="Selection fill color"
                    type="color"
                    value={items[0]?.fill ?? '#315947'}
                    onChange={(fill) => setMany({ fill })}
                  />
                )}
                <Entry
                  label="Selection opacity"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={items[0]?.opacity ?? 1}
                  onChange={(value) =>
                    setMany({
                      opacity: Math.max(0, Math.min(1, Number(value))),
                    })
                  }
                />
                <p className="designer-muted">
                  Changes apply to every selected decoration.
                </p>
              </>
            ) : (
              <p className="designer-muted">
                Shared appearance is available when only unlocked, visible
                decorations are selected. Style booths individually.
              </p>
            )}
          </PanelSection>
        )}
        {tab === 'properties' && e && (
          <>
            <PanelSection title="General">
              <Entry
                label={isMapLegend(e) ? 'Legend title' : 'Label'}
                maxLength={s || isMapLegend(e) ? 80 : 500}
                value={
                  s?.label ??
                  (isMapLegend(e)
                    ? e.text.slice(MAP_LEGEND_TEMPLATE.length)
                    : e.text)
                }
                onChange={(value) =>
                  s
                    ? booth(e.id, { label: value })
                    : geometry({
                        ...e,
                        text: isMapLegend(e)
                          ? MAP_LEGEND_TEMPLATE + value
                          : value,
                      })
                }
              />
              {s && (
                <>
                  <Entry
                    label="Space type"
                    maxLength={80}
                    value={s.spaceType}
                    onChange={(v) => booth(e.id, { spaceType: v })}
                  />
                  <div className="ops-field designer-size-field">
                    <div className="field-title">
                      <label htmlFor={sizeId}>Size (ft)</label>
                    </div>
                    <div className="designer-size">
                      <Input
                        id={sizeId}
                        type="number"
                        aria-label="Width in feet"
                        min={1}
                        max={1000}
                        step={0.1}
                        value={s.widthFeet}
                        onChange={(event) =>
                          booth(e.id, { widthFeet: Number(event.target.value) })
                        }
                      />
                      <span aria-hidden="true">×</span>
                      <Input
                        type="number"
                        aria-label="Depth in feet"
                        min={1}
                        max={1000}
                        step={0.1}
                        value={s.depthFeet}
                        onChange={(event) =>
                          booth(e.id, { depthFeet: Number(event.target.value) })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
              {e.type === 'IMAGE' && !e.assetId && (
                <>
                  <div className="designer-image-source">
                    {e.imageUrl ? (
                      <img
                        src={e.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                      />
                    ) : (
                      <span aria-hidden="true">
                        <UtilityIcon name="image" />
                      </span>
                    )}
                    {media ? (
                      <LayoutImagePicker
                        media={media}
                        label={e.imageUrl ? 'Replace image' : 'Upload or choose image'}
                        onPick={(photo) =>
                          geometry({ ...e, imageUrl: photo.url })
                        }
                      >
                        {(open, busy) => (
                          <Button
                            type="button"
                            variant="secondary"
                            size="compact"
                            aria-haspopup="dialog"
                            disabled={busy || !editable || !!e.locked}
                            onClick={open}
                          >
                            {e.imageUrl ? 'Replace image' : 'Upload or choose image'}
                          </Button>
                        )}
                      </LayoutImagePicker>
                    ) : (
                      <p className="designer-muted">
                        Paste an image URL below. Uploads need website
                        management access.
                      </p>
                    )}
                  </div>
                  <Entry
                    label="Image or logo URL"
                    type="url"
                    maxLength={2000}
                    value={e.imageUrl ?? ''}
                    onChange={(v) => geometry({ ...e, imageUrl: v })}
                  />
                </>
              )}
            </PanelSection>
            <PanelSection title="Position">
              <div className="inspector-pair inspector-caps">
                {(['x', 'y'] as const).map((key) => (
                  <Entry
                    key={key}
                    label={key}
                    type="number"
                    value={e[key]}
                    min={-100000}
                    max={100000}
                    step={1}
                    onChange={(v) => geometry({ ...e, [key]: Number(v) })}
                  />
                ))}
              </div>
              {!s && (
                <div className="inspector-pair inspector-caps">
                  {(['width', 'height'] as const).map((key) => (
                    <Entry
                      key={key}
                      label={key}
                      type="number"
                      min={1}
                      max={100000}
                      value={e[key]}
                      onChange={(v) =>
                        geometry({ ...e, [key]: Math.max(1, Number(v)) })
                      }
                    />
                  ))}
                </div>
              )}
              <div className="inspector-caps">
                <Entry
                  label="rotation"
                  type="number"
                  value={e.rotation}
                  min={-100000}
                  max={100000}
                  step={1}
                  onChange={(v) => geometry({ ...e, rotation: Number(v) })}
                />
              </div>
              <Control label="Element area">
                {(id) => (
                  <Select
                    id={id}
                    value={e.areaId}
                    disabled={!!e.groupId}
                    onChange={(event) =>
                      geometry({ ...e, areaId: event.target.value })
                    }
                  >
                    {definition.areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Control>
            </PanelSection>
            {s && (
              <PanelSection title="Booth details">
                {facts && (
                  <dl className="designer-facts">
                    <div>
                      <dt>Assignment</dt>
                      <dd>{facts.vendor ?? 'Unassigned'}</dd>
                    </div>
                    {facts.status && (
                      <div>
                        <dt>Status</dt>
                        <dd>
                          <span
                            className={`designer-status-dot is-${facts.status}`}
                            aria-hidden="true"
                          />
                          {facts.status.charAt(0).toUpperCase() +
                            facts.status.slice(1)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                <Entry
                  label="Description"
                  maxLength={2000}
                  value={s.description}
                  onChange={(v) => booth(e.id, { description: v })}
                />
                <Entry
                  label="Default fee in minor units"
                  type="number"
                  min={0}
                  max={100000000}
                  step={1}
                  value={s.feeMinor}
                  onChange={(v) => booth(e.id, { feeMinor: Number(v) })}
                />
                <Entry
                  label="Currency"
                  maxLength={3}
                  value={s.currency}
                  onChange={(v) => booth(e.id, { currency: v.toUpperCase() })}
                />
                <fieldset className="designer-amenities">
                  <legend>Physical amenities</legend>
                  {amenityOptions.map((a) => (
                    <Check
                      key={a}
                      label={a.toLowerCase().replaceAll('_', ' ')}
                      checked={s.amenities.includes(a)}
                      onChange={(v) =>
                        booth(e.id, {
                          amenities: v
                            ? [...s.amenities, a]
                            : s.amenities.filter((x) => x !== a),
                        })
                      }
                    />
                  ))}
                </fieldset>
                <Control label="Preferred business suggestion">
                  {(id) => (
                    <Select
                      id={id}
                      value={s.preferredDirectoryId ?? ''}
                      onChange={(event) =>
                        booth(e.id, {
                          preferredDirectoryId: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">No preference</option>
                      {data.directory?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.contact.businessName}
                        </option>
                      ))}
                    </Select>
                  )}
                </Control>
                <Entry
                  label="Private manager notes"
                  value={s.managerNotes}
                  onChange={(v) => booth(e.id, { managerNotes: v })}
                />
              </PanelSection>
            )}
          </>
        )}
        {tab === 'style' && e && (
          <>
            <PanelSection title={s ? 'Booth appearance' : 'Appearance'}>
              <div className="inspector-pair">
                {(e.type !== 'IMAGE' || e.assetId) && (
                  <Entry
                    label={e.type === 'TEXT' ? 'Text color' : 'Fill color'}
                    type="color"
                    value={e.fill}
                    onChange={(v) => geometry({ ...e, fill: v })}
                  />
                )}
                {e.type !== 'IMAGE' && (
                  <Entry
                    label="Stroke color"
                    type="color"
                    value={e.stroke!}
                    onChange={(v) => geometry({ ...e, stroke: v })}
                  />
                )}
              </div>
              {e.type !== 'IMAGE' && (
                <Entry
                  label="Stroke width"
                  type="number"
                  min={0}
                  max={s ? 50 : 500}
                  value={e.strokeWidth!}
                  onChange={(v) =>
                    geometry({
                      ...e,
                      strokeWidth: Math.max(
                        0,
                        Math.min(s ? 50 : 500, Number(v)),
                      ),
                    })
                  }
                />
              )}
              <Entry
                label="Opacity"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={e.opacity!}
                onChange={(v) =>
                  geometry({
                    ...e,
                    opacity: Math.max(0, Math.min(1, Number(v))),
                  })
                }
              />
            </PanelSection>
            {!s && (
              <PanelSection
                title={
                  e.type === 'TEXT'
                    ? 'Typography'
                    : e.type === 'IMAGE'
                      ? 'Image settings'
                      : 'Object settings'
                }
              >
                {e.type === 'TEXT' && (
                  <>
                    <Entry
                      label="Font size"
                      type="number"
                      min={8}
                      max={200}
                      value={e.fontSize!}
                      onChange={(v) =>
                        geometry({
                          ...e,
                          fontSize: Math.max(8, Math.min(200, Number(v))),
                        })
                      }
                    />
                    <Check
                      label="Bold text"
                      checked={e.fontWeight === 'bold'}
                      onChange={(v) =>
                        geometry({ ...e, fontWeight: v ? 'bold' : 'normal' })
                      }
                    />
                    <Control label="Text alignment">
                      {(id) => (
                        <Select
                          id={id}
                          value={e.textAlign}
                          onChange={(event) =>
                            geometry({
                              ...e,
                              textAlign: event.target
                                .value as MapElement['textAlign'],
                            })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </Select>
                      )}
                    </Control>
                  </>
                )}
                <LayoutVisualControls element={e} change={geometry} />
              </PanelSection>
            )}
          </>
        )}
      </fieldset>
      {syncOpen && (
        <Dialog
          open
          title="Sync booth attributes"
          onClose={() => setSyncOpen(false)}
          actions={
            <Button
              variant="primary"
              size="compact"
              type="button"
              disabled={!categories.length}
              onClick={() => {
                sync(
                  source,
                  items
                    .filter(
                      (e) => e.type === 'SPACE' && !e.locked && e.id !== source,
                    )
                    .map((e) => e.id),
                  categories,
                );
                setSyncOpen(false);
              }}
            >
              Confirm attribute sync
            </Button>
          }
        >
          <p>
            Choose the source and fields to copy to the other selected, unlocked
            booths. Booth IDs, private notes, preferences, assignments and
            billing records are preserved.
          </p>
          <Control label="Source booth">
            {(id) => (
              <Select
                id={id}
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                {items
                  .filter((e) => e.type === 'SPACE')
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {drawing.spaces[e.id]?.label}
                    </option>
                  ))}
              </Select>
            )}
          </Control>
          {syncCategories.map((c) => (
            <Check
              key={c}
              label={c}
              checked={categories.includes(c)}
              onChange={(v) =>
                setCategories(
                  v ? [...categories, c] : categories.filter((x) => x !== c),
                )
              }
            />
          ))}
        </Dialog>
      )}
    </div>
  );
}

/** Settings drawer: published background plus editor-only grid and snapping. */
export function LayoutCanvasSettings({
  drawing,
  editable,
  update,
  grid,
  setGrid,
  snap,
  setSnap,
  snapObjects,
  setSnapObjects,
  spacing,
  setSpacing,
}: {
  drawing: Drawing;
  editable: boolean;
  update: (d: Drawing) => void;
  grid: boolean;
  setGrid: (v: boolean) => void;
  snap: boolean;
  setSnap: (v: boolean) => void;
  snapObjects: boolean;
  setSnapObjects: (v: boolean) => void;
  spacing: number;
  setSpacing: (v: number) => void;
}) {
  return (
    <div className="designer-inspector designer-settings">
      <PanelSection title="Canvas background">
        <fieldset disabled={!editable}>
          <LayoutBackgroundControls
            definition={drawing.definition}
            change={(definition) => update({ ...drawing, definition })}
          />
        </fieldset>
      </PanelSection>
      <PanelSection title="Grid and snapping">
        <Check label="Show grid" checked={grid} onChange={setGrid} />
        <Check label="Snap to grid" checked={snap} onChange={setSnap} />
        <Check
          label="Snap to nearby edges and centers"
          checked={snapObjects}
          onChange={setSnapObjects}
        />
        <Entry
          label="Grid spacing"
          type="number"
          min={1}
          max={500}
          value={spacing}
          onChange={(v) => setSpacing(Math.max(1, Math.min(500, Number(v))))}
        />
        <p className="designer-muted">
          Snap distance is 5 screen pixels. Hold Shift while rotating for 45°
          increments.
        </p>
      </PanelSection>
      <PanelSection title="Keyboard shortcuts" defaultOpen={false}>
        <dl className="designer-facts designer-shortcuts">
          {[
            ['Undo / redo', 'Ctrl/Cmd + Z / Y'],
            ['Copy / paste', 'Ctrl/Cmd + C / V'],
            ['Duplicate', 'Ctrl/Cmd + D'],
            ['Nudge', 'Arrow keys (Shift ×10)'],
            ['Pan', 'Space or Alt + drag'],
            ['Clear selection', 'Esc'],
          ].map(([action, keys]) => (
            <div key={action}>
              <dt>{action}</dt>
              <dd>{keys}</dd>
            </div>
          ))}
        </dl>
      </PanelSection>
    </div>
  );
}
