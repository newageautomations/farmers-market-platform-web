import { useState } from 'react';
import {
  Button,
  Select,
  boothRow,
  mapStylePresets,
  applyMapStyle,
  mapArrangements,
  insertArrangement,
  createMapLegend,
  colorBooths,
  equalSpacing,
  matchSize,
  canMatchSize,
  arrangementUnits,
  type Drawing,
  type BoothRowOptions,
  type MapStylePreset,
  type MapArrangement,
} from '@market/ui';
import { Check, Control, Entry } from './common';

// Feature composition of the editor's approved controls. No shared component
// owns row validation, batch insertion, or these map-specific operations.
export function LayoutSmartTools({
  drawing,
  area,
  selected,
  editable,
  center,
  update,
  select,
  snapObjects,
  setSnapObjects,
  occurrence,
  statusMode,
  setStatusMode,
  activeTool,
  onToolChange,
}: {
  drawing: Drawing;
  area: string;
  selected: string[];
  editable: boolean;
  center: () => { x: number; y: number };
  update: (drawing: Drawing) => void;
  select: (ids: string[]) => void;
  snapObjects: boolean;
  setSnapObjects: (value: boolean) => void;
  occurrence: boolean;
  statusMode: boolean;
  setStatusMode: (value: boolean) => void;
  activeTool?: string;
  onToolChange?: (tool: string) => void;
}) {
  const [localTool, setTool] = useState('row'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [row, setRow] = useState<BoothRowOptions>({
      count: 6,
      widthFeet: 10,
      depthFeet: 10,
      gapFeet: 2,
      orientation: 'horizontal',
      start: 1,
      prefix: 'A',
      rotation: 0,
    }),
    [preset, setPreset] = useState<MapStylePreset>('natural'),
    [replace, setReplace] = useState(false),
    [arrangement, setArrangement] = useState<MapArrangement>('picnic'),
    [title, setTitle] = useState('Map legend'),
    [appearance, setAppearance] = useState<'uniform' | 'type' | 'custom'>(
      'uniform',
    ),
    [color, setColor] = useState('#e0ebd9'),
    [gap, setGap] = useState(2),
    [axis, setAxis] = useState<'x' | 'y'>('x');
  const tool = activeTool ?? localTool;
  const items = drawing.definition.elements.filter((e) =>
      selected.includes(e.id),
    ),
    movable = arrangementUnits(drawing, selected).length >= 2;
  function perform(
    action: () => Drawing | { drawing: Drawing; ids: string[] },
    message: string,
  ) {
    if (!editable) return;
    setError('');
    setNotice('');
    try {
      const result = action();
      if ('drawing' in result) {
        update(result.drawing);
        select(result.ids);
      } else update(result);
      setNotice(message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to apply this design change.',
      );
    }
  }
  return (
    <div className="designer-inspector">
      <Control label="Smart design tool">
        {(id) => (
          <Select
            id={id}
            value={tool}
            onChange={(e) => {
              setTool(e.target.value);
              onToolChange?.(e.target.value);
              setError('');
              setNotice('');
            }}
          >
            <option value="row">Booth row</option>
            <option value="style">Map style</option>
            <option value="precision">Spacing and size</option>
            <option value="arrangement">Premade elements</option>
            <option value="legend">Automatic legend</option>
            <option value="appearance">Booth appearance</option>
          </Select>
        )}
      </Control>
      <fieldset disabled={!editable} aria-label="Smart design settings">
        {tool === 'row' && (
          <>
            <Entry
              label="Number of booths"
              type="number"
              min={1}
              max={100}
              value={row.count}
              onChange={(v) => setRow({ ...row, count: Number(v) })}
            />
            <Entry
              label="Booth width in feet"
              type="number"
              min={1}
              max={1000}
              step={0.5}
              value={row.widthFeet}
              onChange={(v) => setRow({ ...row, widthFeet: Number(v) })}
            />
            <Entry
              label="Booth depth in feet"
              type="number"
              min={1}
              max={1000}
              step={0.5}
              value={row.depthFeet}
              onChange={(v) => setRow({ ...row, depthFeet: Number(v) })}
            />
            <Entry
              label="Gap between booths in feet"
              type="number"
              min={0}
              max={1000}
              step={0.5}
              value={row.gapFeet}
              onChange={(v) => setRow({ ...row, gapFeet: Number(v) })}
            />
            <Control label="Row direction">
              {(id) => (
                <Select
                  id={id}
                  value={row.orientation}
                  onChange={(e) =>
                    setRow({
                      ...row,
                      orientation: e.target
                        .value as BoothRowOptions['orientation'],
                    })
                  }
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </Select>
              )}
            </Control>
            <Entry
              label="Number prefix"
              maxLength={60}
              value={row.prefix}
              onChange={(prefix) => setRow({ ...row, prefix })}
            />
            <Entry
              label="Starting number"
              type="number"
              min={0}
              value={row.start}
              onChange={(v) => setRow({ ...row, start: Number(v) })}
            />
            <Entry
              label="Row rotation in degrees"
              type="number"
              min={-360}
              max={360}
              value={row.rotation}
              onChange={(v) => setRow({ ...row, rotation: Number(v) })}
            />
            <p>
              The row is centered in the current canvas view. Every booth stays
              independent. Duplicate labels stop the entire insertion.
            </p>
            <Button
              type="button"
              onClick={() =>
                perform(
                  () =>
                    boothRow(drawing, area, center(), row, () =>
                      crypto.randomUUID(),
                    ),
                  'Booth row added. Save to create its physical booth identities.',
                )
              }
            >
              Create booth row
            </Button>
          </>
        )}
        {tool === 'style' && (
          <>
            <Control label="Map style">
              {(id) => (
                <Select
                  id={id}
                  value={preset}
                  onChange={(e) => {
                    setPreset(e.target.value as MapStylePreset);
                    setReplace(false);
                  }}
                >
                  {Object.entries(mapStylePresets).map(([value, p]) => (
                    <option key={value} value={value}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </Control>
            <p>
              Applies across all areas. Replaces colors, text fonts and
              decorative shadows on unlocked objects. Preserves physical
              measurements, geometry, image references, locks and operational
              data.
            </p>
            <Check
              label="Replace existing map styling"
              checked={replace}
              onChange={setReplace}
            />
            <Button
              type="button"
              disabled={!replace}
              onClick={() =>
                perform(
                  () => applyMapStyle(drawing, preset),
                  'Map style applied. Undo restores the previous styling.',
                )
              }
            >
              Apply map style
            </Button>
          </>
        )}
        {tool === 'precision' && (
          <>
            <p>
              Use Align in the selection bar for edges, centers and
              distribution. Equal spacing anchors the first object at the left
              or top. Groups move as single units; ungroup to arrange individual
              pieces.
            </p>
            <Control label="Spacing direction">
              {(id) => (
                <Select
                  id={id}
                  value={axis}
                  onChange={(e) => setAxis(e.target.value as 'x' | 'y')}
                >
                  <option value="x">Horizontal</option>
                  <option value="y">Vertical</option>
                </Select>
              )}
            </Control>
            <Entry
              label="Equal gap in feet"
              type="number"
              min={0}
              max={1000}
              step={0.5}
              value={gap}
              onChange={(v) => setGap(Number(v))}
            />
            <Button
              type="button"
              disabled={!movable}
              onClick={() =>
                perform(
                  () => equalSpacing(drawing, selected, axis, gap),
                  'Equal spacing applied.',
                )
              }
            >
              Apply equal spacing
            </Button>
            <div className="ui-actions">
              {(['width', 'height'] as const).map((dimension) => (
                <Button
                  type="button"
                  variant="secondary"
                  key={dimension}
                  disabled={!canMatchSize(items)}
                  onClick={() =>
                    perform(
                      () => matchSize(drawing, selected, dimension),
                      `Matched ${dimension}.`,
                    )
                  }
                >
                  Match {dimension}
                </Button>
              ))}
            </div>
            <p>
              Match size uses the first selected object. It is available for
              ungrouped decorations only. Booth dimensions use the existing
              booth inspector.
            </p>
            <Check
              label="Snap to nearby edges and centers"
              checked={snapObjects}
              onChange={setSnapObjects}
            />
          </>
        )}
        {tool === 'arrangement' && (
          <>
            <Control label="Arrangement">
              {(id) => (
                <Select
                  id={id}
                  value={arrangement}
                  onChange={(e) =>
                    setArrangement(e.target.value as MapArrangement)
                  }
                >
                  {Object.entries(mapArrangements).map(([value, p]) => (
                    <option key={value} value={value}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </Control>
            <p>
              Inserts grouped decorations at the canvas center. Move the group
              together, or Ungroup to customize each piece. These elements do
              not create bookable booths or equipment.
            </p>
            <Button
              type="button"
              onClick={() =>
                perform(
                  () =>
                    insertArrangement(
                      drawing,
                      area,
                      center(),
                      arrangement,
                      () => crypto.randomUUID(),
                    ),
                  'Arrangement inserted. Ungroup to edit its individual objects.',
                )
              }
            >
              Insert arrangement
            </Button>
          </>
        )}
        {tool === 'legend' && (
          <>
            <Entry
              label="New legend title"
              maxLength={80}
              value={title}
              onChange={setTitle}
            />
            <p>
              The legend follows visible objects in its area. Scheduling views
              use their live status colors when supplied; other views show booth
              types or sizes and actual colors. Reference images are excluded.
            </p>
            <p>
              Use Inspector to move, resize and style the legend. Increase its
              height for more entries. Status colors describe the current view
              and do not calculate bookable availability.
            </p>
            <Button
              type="button"
              onClick={() =>
                perform(
                  () =>
                    createMapLegend(drawing, area, center(), title, () =>
                      crypto.randomUUID(),
                    ),
                  'Dynamic legend inserted.',
                )
              }
            >
              Insert legend
            </Button>
          </>
        )}
        {tool === 'appearance' && (
          <>
            <Control label="Booth coloring">
              {(id) => (
                <Select
                  id={id}
                  value={appearance}
                  onChange={(e) =>
                    setAppearance(e.target.value as typeof appearance)
                  }
                >
                  <option value="uniform">Uniform color</option>
                  <option value="type">Color by booth type</option>
                  <option value="custom">Custom styling</option>
                </Select>
              )}
            </Control>
            {appearance === 'uniform' && (
              <Entry
                label="Uniform booth color"
                type="color"
                value={color}
                onChange={setColor}
              />
            )}
            <p>
              {appearance === 'custom'
                ? 'Select a booth and use its existing Inspector fill, stroke and opacity controls. Existing custom colors are preserved.'
                : 'Replaces fills on unlocked booths across all areas. Type colors use each booth’s saved space type. Apply again after changing a type.'}
            </p>
            {appearance !== 'custom' && (
              <Button
                type="button"
                onClick={() =>
                  perform(() => {
                    setStatusMode(false);
                    return colorBooths(drawing, appearance, color);
                  }, 'Booth colors applied. Undo restores previous fills.')
                }
              >
                Apply booth colors
              </Button>
            )}
            {occurrence && (
              <Check
                label="Preview live scheduling status colors"
                checked={statusMode}
                onChange={setStatusMode}
              />
            )}
            {occurrence && (
              <p>
                Status preview uses the current occurrence assignments and
                invoices. Unassigned does not mean bookable. This preview is not
                saved as booth styling.
              </p>
            )}
          </>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
