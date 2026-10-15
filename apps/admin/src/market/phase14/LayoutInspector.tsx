import type { Drawing, SyncCategory } from '@market/ui';
import { Button, Select, defaults, syncCategories } from '@market/ui';
import type {
  MapElement,
  MarketOperationsData,
  SpaceDetails,
  LayoutVersion,
} from '@market/api';
import { useState } from 'react';
import { MarketDialog as Dialog, StatusBadge } from '../presentation';
import { Check, Control, Entry } from './common';
export function LayoutInspector({
  drawing,
  selected,
  editable,
  version,
  data,
  area,
  name,
  setName,
  update,
  geometry,
  booth,
  grid,
  setGrid,
  snap,
  setSnap,
  spacing,
  setSpacing,
  sync,
  canRename = true,
}: {
  drawing: Drawing;
  selected: string[];
  editable: boolean;
  version: LayoutVersion;
  data: MarketOperationsData;
  area: string;
  name: string;
  setName: (name: string) => void;
  update: (d: Drawing) => void;
  geometry: (e: MapElement) => void;
  booth: (id: string, patch: Partial<SpaceDetails>) => void;
  grid: boolean;
  setGrid: (v: boolean) => void;
  snap: boolean;
  setSnap: (v: boolean) => void;
  spacing: number;
  setSpacing: (v: number) => void;
  sync: (source: string, targets: string[], categories: SyncCategory[]) => void;
  canRename?: boolean;
}) {
  const [areaName, setAreaName] = useState(''),
    [syncOpen, setSyncOpen] = useState(false),
    [source, setSource] = useState(''),
    [categories, setCategories] = useState<SyncCategory[]>(['amenities']);
  const definition = drawing.definition,
    items = definition.elements.filter((e) => selected.includes(e.id)),
    original = items.length === 1 ? items[0] : undefined,
    e = original ? defaults(original) : undefined,
    s = e ? drawing.spaces[e.id] : undefined,
    currentArea = definition.areas.find((a) => a.id === area);
  const title =
    items.length > 1
      ? 'Multi-selection inspector'
      : s
        ? 'Booth inspector'
        : e?.type === 'TEXT'
          ? 'Text inspector'
          : e
            ? 'Shape inspector'
            : 'Layout inspector';
  return (
    <div className="designer-inspector" data-testid="layout-inspector">
      <fieldset disabled={!editable || !!e?.locked}>
        <legend>{title}</legend>
        {!e && items.length < 2 && (
          <>
            {canRename && (
              <Entry label="Layout name" value={name} onChange={setName} />
            )}
            <p>
              <StatusBadge>{version.status}</StatusBadge>
            </p>
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
            <Entry
              label="New area name"
              value={areaName}
              onChange={setAreaName}
            />
            <div className="ui-actions">
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
                variant="destructive"
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
          </>
        )}
        {items.length > 1 && (
          <>
            <p>
              {items.length} objects selected. Use the command bar to move,
              align, distribute or arrange them.
            </p>
            {items.some((e) => e.type === 'SPACE') && (
              <p>
                Resize booths individually to keep physical dimensions precise.
                Grouping is available for decorations.
              </p>
            )}
            <p>
              {items.filter((e) => e.locked).length} locked ·{' '}
              {items.filter((e) => e.editorHidden).length} hidden in editor
            </p>
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
          </>
        )}
        {e && (
          <>
            <Entry
              label="Label"
              maxLength={s ? 80 : 500}
              value={s?.label ?? e.text}
              onChange={(value) =>
                s
                  ? booth(e.id, { label: value })
                  : geometry({ ...e, text: value })
              }
            />
            <div className="inspector-pair">
              {(['x', 'y', 'rotation'] as const).map((key) => (
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
            {s ? (
              <>
                <div className="inspector-pair">
                  <Entry
                    label="Width in feet"
                    type="number"
                    min={1}
                    max={1000}
                    step={0.1}
                    value={s.widthFeet}
                    onChange={(v) => booth(e.id, { widthFeet: Number(v) })}
                  />
                  <Entry
                    label="Depth in feet"
                    type="number"
                    min={1}
                    max={1000}
                    step={0.1}
                    value={s.depthFeet}
                    onChange={(v) => booth(e.id, { depthFeet: Number(v) })}
                  />
                </div>
                <Entry
                  label="Space type"
                  maxLength={80}
                  value={s.spaceType}
                  onChange={(v) => booth(e.id, { spaceType: v })}
                />
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
                <fieldset>
                  <legend>Physical amenities</legend>
                  {[
                    'ELECTRICITY',
                    'WATER',
                    'SHADE',
                    'COVERED',
                    'INDOOR',
                    'VEHICLE',
                    'FOOD_TRUCK',
                  ].map((a) => (
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
              </>
            ) : (
              <>
                <div className="inspector-pair">
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
                {e.type === 'IMAGE' && (
                  <Entry
                    label="Image or logo URL"
                    type="url"
                    maxLength={2000}
                    value={e.imageUrl ?? ''}
                    onChange={(v) => geometry({ ...e, imageUrl: v })}
                  />
                )}
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
              </>
            )}
            <div className="inspector-pair">
              <Entry
                label={e.type === 'TEXT' ? 'Text color' : 'Fill color'}
                type="color"
                value={e.fill}
                onChange={(v) => geometry({ ...e, fill: v })}
              />
              <Entry
                label="Stroke color"
                type="color"
                value={e.stroke!}
                onChange={(v) => geometry({ ...e, stroke: v })}
              />
            </div>
            <div className="inspector-pair">
              <Entry
                label="Stroke width"
                type="number"
                min={0}
                max={50}
                value={e.strokeWidth!}
                onChange={(v) =>
                  geometry({
                    ...e,
                    strokeWidth: Math.max(0, Math.min(50, Number(v))),
                  })
                }
              />
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
            </div>
          </>
        )}
      </fieldset>
      <details className="designer-view-options ui-disclosure">
        <summary>Canvas settings</summary>
        <div className="ui-disclosure-content">
          <Check label="Show grid" checked={grid} onChange={setGrid} />
          <Check label="Snap to grid" checked={snap} onChange={setSnap} />
          <Entry
            label="Grid spacing"
            type="number"
            min={1}
            max={500}
            value={spacing}
            onChange={(v) => setSpacing(Math.max(1, Math.min(500, Number(v))))}
          />
          <p>
            Object edges and centers snap within 5 layout pixels. Hold Shift
            while rotating for 45° increments.
          </p>
        </div>
      </details>
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
