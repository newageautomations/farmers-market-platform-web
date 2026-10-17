import { useState, type CSSProperties } from 'react';
import { Button, Card, Checkbox, Field, Input } from '@market/ui';
import './button-playground.css';

const defaults = { roundness: 22, height: 40, padding: 18 };
const buttonLabels = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
};
const controls = [
  { key: 'roundness', label: 'Roundness', min: 0, max: 40 },
  { key: 'height', label: 'Height', min: 28, max: 72 },
  { key: 'padding', label: 'Horizontal padding', min: 4, max: 44 },
] as const;
const effects = [
  {
    id: 'color',
    title: 'Stronger color',
    description: 'The selected primary hover color.',
  },
  {
    id: 'darken',
    title: 'Darker background',
    description: 'Strong primary fill with softer secondary colors.',
  },
  {
    id: 'lift',
    title: 'Slide up',
    description: 'Move up slightly with a small shadow.',
  },
  {
    id: 'grow',
    title: 'Grow',
    description: 'Grow the surface and text together.',
  },
  {
    id: 'shadow',
    title: 'Soft shadow',
    description: 'Add depth while keeping the button in place.',
  },
  {
    id: 'fill',
    title: 'Solid fill',
    description: 'The selected soft fill for outlined and text buttons.',
  },
  {
    id: 'inset',
    title: 'Inset edge',
    description: 'Draw a second edge inside the button.',
  },
  {
    id: 'sweep',
    title: 'Color sweep',
    description: 'Slide a soft layer of color across the surface.',
  },
  {
    id: 'shine',
    title: 'Soft shine',
    description: 'Pass a subtle highlight across the button.',
  },
] as const;

// The existing gallery has static specimens, not adjustable controls. This page
// composes shared primitives; its experimental styles never leave this fixture.
export default function ButtonPlayground() {
  const [geometry, setGeometry] = useState(defaults);
  const [previewHover, setPreviewHover] = useState(false);
  const sampleButtons = (effect?: string) => (
    <div className="button-playground-samples">
      {(['primary', 'secondary', 'tertiary'] as const).map((kind) => (
        <Button
          key={kind}
          variant={kind}
          className="button-playground-sample"
          data-kind={kind}
          data-effect={effect}
          data-preview={effect && previewHover ? 'true' : undefined}
        >
          <span
            className={
              effect === 'grow' ? 'button-playground-grow-label' : undefined
            }
          >
            {effect === 'grow' ? (
              <>
                <span
                  className="button-playground-grow-sizer"
                  aria-hidden="true"
                >
                  {buttonLabels[kind]}
                </span>
                <span className="button-playground-grow-text">
                  {buttonLabels[kind]}
                </span>
              </>
            ) : (
              buttonLabels[kind]
            )}
          </span>
        </Button>
      ))}
    </div>
  );
  return (
    <main
      className="button-playground"
      style={
        {
          '--playground-radius': `${geometry.roundness}px`,
          '--playground-height': `${geometry.height}px`,
          '--playground-padding': `${geometry.padding}px`,
        } as CSSProperties
      }
    >
      <header className="button-playground-intro">
        <h1>Button playground</h1>
        <p>
          Find the shape and feel you like. These experiments only affect the
          samples on this page.
        </p>
      </header>

      <Card
        as="section"
        aria-label="Button adjustments"
        className="button-playground-controls"
      >
        <div className="button-playground-sliders">
          {controls.map(({ key, label, min, max }) => (
            <Field
              key={key}
              id={`button-${key}`}
              label={
                <span className="button-playground-control-label">
                  {label}
                  <output htmlFor={`button-${key}`}>{geometry[key]}px</output>
                </span>
              }
            >
              <Input
                id={`button-${key}`}
                type="range"
                min={min}
                max={max}
                step={1}
                value={geometry[key]}
                aria-valuetext={`${geometry[key]} pixels`}
                onChange={(event) =>
                  setGeometry({
                    ...geometry,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </Field>
          ))}
        </div>
        <div className="button-playground-control-footer">
          <p>
            Height controls the vertical space, so there is no separate
            vertical-padding slider.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setGeometry(defaults);
              setPreviewHover(false);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <section
        aria-labelledby="button-preview-title"
        className="button-playground-preview"
      >
        <h2 id="button-preview-title">Live preview</h2>
        <Card className="button-playground-preview-card">
          {sampleButtons()}
          <p>
            Filled primary, outlined secondary, and a quieter text-only
            tertiary.
          </p>
          <code>{`height: ${geometry.height}px; padding: 0 ${geometry.padding}px; border-radius: ${geometry.roundness}px;`}</code>
        </Card>
      </section>

      <section aria-labelledby="button-effects-title">
        <div className="button-playground-effects-header">
          <div>
            <h2 id="button-effects-title">Hover effects</h2>
            <p>
              Hover or focus a button to compare. Your size settings apply to
              every sample.
            </p>
          </div>
          <label
            className="button-playground-hover-toggle"
            htmlFor="keep-button-effects"
          >
            <Checkbox
              id="keep-button-effects"
              checked={previewHover}
              onChange={(event) => setPreviewHover(event.target.checked)}
            />
            Keep effects visible
          </label>
        </div>
        <div className="button-playground-effects">
          {effects.map(({ id, title, description }) => (
            <Card
              as="article"
              key={id}
              className="button-playground-effect"
              aria-label={title}
            >
              <h3>{title}</h3>
              <p>{description}</p>
              {sampleButtons(id)}
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
