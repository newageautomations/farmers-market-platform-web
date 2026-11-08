import type { MapDefinition, MapElement } from '@market/api';
import { Select, mapFonts, backgroundPresets } from '@market/ui';
import { Check, Control, Entry } from './common';

const number = (value: string, max: number) =>
  Math.max(0, Math.min(max, Number(value) || 0));
// Inspector feature compositions reuse the existing controls and history callbacks.
export function LayoutVisualControls({
  element: e,
  change,
}: {
  element: MapElement;
  change: (e: MapElement) => void;
}) {
  return (
    <>
      {e.type === 'IMAGE' && !e.assetId && (
        <>
          <Check
            label="Hide image from published map"
            checked={!!e.referenceOnly}
            onChange={(referenceOnly) => change({ ...e, referenceOnly })}
          />
          <p>
            Use Opacity to trace over a site plan. Lock the image with the
            selection commands or Layers.
          </p>
        </>
      )}
      {e.type !== 'IMAGE' && (
        <>
          <Control label="Stroke pattern">
            {(id) => (
              <Select
                id={id}
                value={e.strokePattern ?? 'solid'}
                onChange={(event) =>
                  change({
                    ...e,
                    strokePattern: event.target
                      .value as MapElement['strokePattern'],
                  })
                }
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </Select>
            )}
          </Control>
        </>
      )}
      {(e.type === 'RECTANGLE' || e.type === 'TEXT') && (
        <Entry
          label="Corner radius"
          type="number"
          min={0}
          max={500}
          value={e.cornerRadius ?? 0}
          onChange={(v) => change({ ...e, cornerRadius: number(v, 500) })}
        />
      )}
      <Control label="Shadow">
        {(id) => (
          <Select
            id={id}
            value={e.shadow ?? 'none'}
            onChange={(event) =>
              change({
                ...e,
                shadow: event.target.value as MapElement['shadow'],
              })
            }
          >
            <option value="none">None</option>
            <option value="soft">Soft</option>
          </Select>
        )}
      </Control>
      {e.type === 'LINE' && (
        <>
          <Check
            label="Filled landscape region"
            checked={!!e.closed}
            onChange={(closed) => change({ ...e, closed })}
          />
          <Check
            label="Curved boundary or walkway"
            checked={!!e.curved}
            onChange={(curved) => change({ ...e, curved })}
          />
          <Entry
            label="Outline color"
            type="color"
            value={e.outlineColor ?? '#718171'}
            onChange={(outlineColor) => change({ ...e, outlineColor })}
          />
          <Entry
            label="Outline width"
            type="number"
            min={0}
            max={20}
            value={e.outlineWidth ?? 0}
            onChange={(v) => change({ ...e, outlineWidth: number(v, 20) })}
          />
          <p>
            Stroke width is in layout pixels. Divide by pixels per foot for
            physical path width. Use Edit path points to adjust vertices.
          </p>
        </>
      )}
      {e.type === 'TEXT' && (
        <>
          <Control label="Font">
            {(id) => (
              <Select
                id={id}
                value={e.fontFamily ?? 'sans'}
                onChange={(event) =>
                  change({
                    ...e,
                    fontFamily: event.target.value as MapElement['fontFamily'],
                  })
                }
              >
                {Object.entries(mapFonts).map(([value, font]) => (
                  <option key={value} value={value}>
                    {font.label}
                  </option>
                ))}
              </Select>
            )}
          </Control>
          <Check
            label="Label background"
            checked={!!e.labelBackground}
            onChange={(enabled) =>
              change({ ...e, labelBackground: enabled ? '#faf8f2' : undefined })
            }
          />
          {e.labelBackground && (
            <>
              <Entry
                label="Label background color"
                type="color"
                value={e.labelBackground}
                onChange={(labelBackground) =>
                  change({ ...e, labelBackground })
                }
              />
              <Entry
                label="Label padding"
                type="number"
                min={0}
                max={100}
                value={e.labelPadding ?? 0}
                onChange={(v) => change({ ...e, labelPadding: number(v, 100) })}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
export function LayoutBackgroundControls({
  definition,
  change,
}: {
  definition: MapDefinition;
  change: (d: MapDefinition) => void;
}) {
  const background = definition.background ?? { color: '#ffffff' };
  const patch = (value: Partial<typeof background>) =>
    change({ ...definition, background: { ...background, ...value } });
  return (
    <>
      <Control label="Background preset">
        {(id) => (
          <Select
            id={id}
            value={
              backgroundPresets.find((p) => p.color === background.color)
                ?.color ?? ''
            }
            onChange={(event) => patch({ color: event.target.value })}
          >
            <option value="" disabled>
              Custom color
            </option>
            {backgroundPresets.map((p) => (
              <option key={p.name} value={p.color}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </Control>
      <Entry
        label="Background color"
        type="color"
        value={background.color}
        onChange={(color) => patch({ color })}
      />
      <Entry
        label="Grid color"
        type="color"
        value={background.gridColor ?? '#dce4df'}
        onChange={(gridColor) => patch({ gridColor })}
      />
      <Entry
        label="Grid opacity"
        type="number"
        min={0}
        max={1}
        step={0.1}
        value={background.gridOpacity ?? 0.45}
        onChange={(v) => patch({ gridOpacity: number(v, 1) })}
      />
      <p>
        The background color is published. Grid settings are only used while
        editing and do not change scale or booth measurements.
      </p>
    </>
  );
}
