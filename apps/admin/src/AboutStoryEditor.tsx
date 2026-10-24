import { TextSizeControls } from './TextSizeControls';
import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  IconButton,
  SelectField,
  Textarea,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type { StorefrontAppearanceApi } from '@market/api';
import {
  aboutSections,
  aboutSectionLimit,
  defaultAboutCta,
  createAboutSection,
  type AboutSection,
  type StorefrontAppearance,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import { ImageShapeField } from './StorefrontAppearance';
import { CategoryImageField } from './vendor/categories';

const layouts = {
  text: 'Text Only',
  image: 'Image Only',
  'text-image': 'Text + Image',
} as const;
/** About-specific composition of existing fields, disclosure, media picker and Dialog. */
export function AboutStoryEditor({
  about,
  api,
  selected,
  collapsed,
  choose,
  collapse,
  onChange,
  busy,
  textSizes,
  onTextSizeChange,
}: {
  about: StorefrontAppearance['about'];
  api: StorefrontAppearanceApi;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  choose: (id: StorefrontEditorSection) => void;
  collapse: () => void;
  onChange: (
    value: StorefrontAppearance['about'],
    sizes?: StorefrontAppearance['textSizes'],
  ) => void;
  busy: boolean;
  textSizes?: StorefrontAppearance['textSizes'];
  onTextSizeChange: (
    id: string,
    value: { heading: number; paragraph: number },
  ) => void;
}) {
  const sections = aboutSections(about);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string>();
  const [changing, setChanging] = useState<{
    id: string;
    layout: AboutSection['layout'];
  }>();
  const cta = about.cta ?? defaultAboutCta;
  const patch = (value: Partial<typeof about>) =>
    onChange({ ...about, ...value });
  const saveSections = (value: AboutSection[]) =>
    patch({ sections: value, sectionsVersion: 1 });
  const updateSection = (id: string, patch: Partial<AboutSection>) =>
    saveSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const limit = sections.length >= aboutSectionLimit;
  const entries: Array<{
    id: StorefrontEditorSection;
    label: string;
    item?: AboutSection;
  }> = [
    { id: 'story-settings', label: 'Our Story page' },
    ...sections.map((item) => ({
      id: `story:${item.id}` as const,
      label: `${item.heading || layouts[item.layout]}${item.visible ? '' : ' (hidden)'}`,
      item,
    })),
    { id: 'story-cta', label: 'Closing invitation' },
  ];
  return (
    <fieldset disabled={busy} className="story-editor-list">
      <div className="story-editor-add-row">
        <Button
          variant="secondary"
          disabled={limit}
          onClick={() => setAdding(true)}
        >
          Add Section
        </Button>
        <label className="story-page-toggle">
          <Checkbox
            id="story-enabled"
            role="switch"
            className="sr-only"
            aria-label="Enable the About page"
            checked={about.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span className="story-switch-track" aria-hidden="true" />
          <span>{about.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
      {limit && (
        <p role="status">
          You can add up to {aboutSectionLimit} story sections.
        </p>
      )}
      {entries.map(({ id, label, item }) => {
        const open = !collapsed && selected === id;
        const index = item ? sections.findIndex((s) => s.id === item.id) : -1;
        return (
          <div
            key={id}
            className={`story-editor-row${item ? ' story-editor-movable' : ''}`}
          >
            {item && (
              <div className="story-editor-reorder">
                {(['up', 'down'] as const).map((direction) => (
                  <IconButton
                    key={direction}
                    icon={direction === 'up' ? 'arrow-up' : 'arrow-down'}
                    label={`Move ${direction}: ${item.heading || layouts[item.layout]}`}
                    size="compact"
                    disabled={
                      busy ||
                      (direction === 'up'
                        ? index === 0
                        : index === sections.length - 1)
                    }
                    onClick={() => {
                      const next = [...sections],
                        target = index + (direction === 'up' ? -1 : 1);
                      if (target < 0 || target >= next.length) return;
                      [next[index], next[target]] = [
                        next[target]!,
                        next[index]!,
                      ];
                      saveSections(next);
                    }}
                  />
                ))}
              </div>
            )}
            <details className={disclosureClassName('dropdown')} open={open}>
              <summary
                role="button"
                aria-expanded={open}
                onClick={(event) => {
                  event.preventDefault();
                  if (open) collapse();
                  else choose(id);
                }}
              >
                {label}
              </summary>
              {open && (
                <div className="ui-disclosure-content visual-editor-section-content">
                  {id === 'story-settings' && (
                    <>
                      <Field id="story-title" label="Page title">
                        <Input
                          id="story-title"
                          maxLength={160}
                          value={about.title}
                          onChange={(e) => patch({ title: e.target.value })}
                        />
                      </Field>
                      <p>
                        The page and navigation link appear after publishing.
                        Disabling preserves your content.
                      </p>
                    </>
                  )}
                  {item && (
                    <>
                      {item.layout !== 'image' && (
                        <TextSizeControls
                          value={textSizes?.[`story:${item.id}`]}
                          onChange={(value) =>
                            onTextSizeChange(`story:${item.id}`, value)
                          }
                        />
                      )}
                      <SelectField
                        id="story-layout"
                        label="Section type"
                        value={item.layout}
                        onChange={(e) => {
                          const layout = e.target
                            .value as AboutSection['layout'];
                          if (layout !== item.layout)
                            setChanging({ id: item.id, layout });
                        }}
                      >
                        {Object.entries(layouts).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </SelectField>
                      {item.layout !== 'image' && (
                        <>
                          <SelectField
                            id="story-align"
                            label="Text alignment"
                            value={item.textAlign ?? 'left'}
                            onChange={(e) =>
                              updateSection(item.id, {
                                textAlign: e.target.value as
                                  'left' | 'center' | 'right',
                              })
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </SelectField>
                          <Field id="story-heading" label="Heading">
                            <Input
                              id="story-heading"
                              maxLength={160}
                              value={item.heading}
                              onChange={(e) =>
                                updateSection(item.id, {
                                  heading: e.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field id="story-body" label="Body text">
                            <Textarea
                              id="story-body"
                              maxLength={20000}
                              rows={8}
                              value={item.body}
                              onChange={(e) =>
                                updateSection(item.id, { body: e.target.value })
                              }
                            />
                          </Field>
                        </>
                      )}
                      {item.layout !== 'text' && (
                        <>
                          {api.media ? (
                            <CategoryImageField
                              key={item.id}
                              api={api.media}
                              value={item.imageAssetId}
                              preview={item.image}
                              label="Section image"
                              presentation="library"
                              onImageChange={(image) =>
                                updateSection(item.id, {
                                  imageAssetId: image?.id ?? null,
                                  image: image?.preview ?? '',
                                })
                              }
                            />
                          ) : (
                            <p>
                              Connect your vendor session to select or upload
                              images.
                            </p>
                          )}
                          <SelectField
                            id="story-size"
                            label="Image size"
                            value={item.imageSize ?? 'medium'}
                            onChange={(e) =>
                              updateSection(item.id, {
                                imageSize: e.target.value as
                                  'small' | 'medium' | 'large',
                              })
                            }
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </SelectField>
                          <Field
                            id="story-alt"
                            label="Image alternative text"
                            info="A short description of what the image shows. Screen readers read it aloud, and it can appear if the image cannot load. Describe meaningful details; leave it blank for a purely decorative image."
                          >
                            <Input
                              id="story-alt"
                              maxLength={200}
                              value={item.alt}
                              onChange={(e) =>
                                updateSection(item.id, { alt: e.target.value })
                              }
                            />
                          </Field>
                          <ImageShapeField
                            id="story-shape"
                            label="Image shape"
                            value={item.shape}
                            includeNatural
                            onChange={(shape) =>
                              updateSection(item.id, { shape })
                            }
                          />
                          {item.layout === 'text-image' && (
                            <SelectField
                              id="story-position"
                              label="Image position"
                              value={item.imagePosition}
                              onChange={(e) =>
                                updateSection(item.id, {
                                  imagePosition: e.target.value as
                                    'left' | 'right',
                                })
                              }
                            >
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </SelectField>
                          )}
                        </>
                      )}
                      <Field id="story-visible" label="Show section">
                        <Checkbox
                          id="story-visible"
                          checked={item.visible}
                          onChange={(e) =>
                            updateSection(item.id, {
                              visible: e.target.checked,
                            })
                          }
                        />
                      </Field>
                      <div className="ui-actions">
                        <Button
                          variant="secondary"
                          disabled={limit}
                          onClick={() => {
                            if (limit) return;
                            const copy = { ...item, id: crypto.randomUUID() };
                            const next = [...sections];
                            next.splice(index + 1, 0, copy);
                            const size = textSizes?.[`story:${item.id}`];
                            onChange(
                              { ...about, sections: next, sectionsVersion: 1 },
                              size
                                ? {
                                    ...textSizes,
                                    [`story:${copy.id}`]: { ...size },
                                  }
                                : textSizes,
                            );
                            choose(`story:${copy.id}`);
                          }}
                        >
                          Duplicate
                        </Button>
                        <Button
                          variant="destructive-outline"
                          onClick={() => setDeleting(item.id)}
                        >
                          Delete section
                        </Button>
                      </div>
                    </>
                  )}
                  {id === 'story-cta' && (
                    <>
                      <TextSizeControls
                        value={textSizes?.['story-cta']}
                        onChange={(value) =>
                          onTextSizeChange('story-cta', value)
                        }
                      />
                      {(['heading', 'text', 'label'] as const).map((key) => (
                        <Field
                          key={key}
                          id={`story-cta-${key}`}
                          label={
                            {
                              heading: 'CTA heading',
                              text: 'Supporting text',
                              label: 'Button label',
                            }[key]
                          }
                        >
                          {key === 'text' ? (
                            <Textarea
                              id={`story-cta-${key}`}
                              maxLength={600}
                              value={cta[key]}
                              onChange={(e) =>
                                patch({
                                  cta: { ...cta, [key]: e.target.value },
                                })
                              }
                            />
                          ) : (
                            <Input
                              id={`story-cta-${key}`}
                              maxLength={key === 'label' ? 80 : 160}
                              value={cta[key]}
                              onChange={(e) =>
                                patch({
                                  cta: { ...cta, [key]: e.target.value },
                                })
                              }
                            />
                          )}
                        </Field>
                      ))}
                      <SelectField
                        id="story-cta-destination"
                        label="Button destination"
                        value={cta.destination}
                        onChange={(e) =>
                          patch({
                            cta: {
                              ...cta,
                              destination: e.target.value as '/products' | '/',
                            },
                          })
                        }
                      >
                        <option value="/products">Shop</option>
                        <option value="/">Homepage</option>
                      </SelectField>
                      <p>
                        This invitation always stays below your story sections.
                      </p>
                    </>
                  )}
                </div>
              )}
            </details>
          </div>
        );
      })}
      <Dialog
        open={adding}
        title="Add Section"
        onClose={() => setAdding(false)}
      >
        <div className="ui-actions">
          {Object.entries(layouts).map(([layout, label]) => (
            <Button
              key={layout}
              disabled={limit || busy}
              onClick={() => {
                if (limit || busy) return;
                const item = createAboutSection(
                  crypto.randomUUID(),
                  layout as AboutSection['layout'],
                );
                saveSections([...sections, item]);
                setAdding(false);
                choose(`story:${item.id}`);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </Dialog>
      <Dialog
        open={!!changing}
        title="Change section type?"
        busy={busy}
        onClose={() => setChanging(undefined)}
        actions={
          <Button
            variant="destructive-outline"
            disabled={busy}
            onClick={() => {
              if (!changing) return;
              const current = sections.find((s) => s.id === changing.id);
              if (current)
                saveSections(
                  sections.map((s) =>
                    s.id === changing.id
                      ? {
                          ...createAboutSection(s.id, changing.layout),
                          visible: s.visible,
                        }
                      : s,
                  ),
                );
              setChanging(undefined);
            }}
          >
            Change section type
          </Button>
        }
      >
        <p>
          Switching section type removes all text, the selected image,
          alternative text, and layout settings from this section. Your image
          stays in the media library. Close this dialog to keep the current
          section.
        </p>
      </Dialog>
      <Dialog
        open={!!deleting}
        title="Delete this section?"
        onClose={() => setDeleting(undefined)}
        actions={
          <Button
            variant="destructive-outline"
            disabled={busy}
            onClick={() => {
              saveSections(sections.filter((s) => s.id !== deleting));
              setDeleting(undefined);
              choose('story-settings');
            }}
          >
            Delete section
          </Button>
        }
      >
        <p>
          The section will be removed from this draft. Its photograph stays in
          your image library.
        </p>
      </Dialog>
    </fieldset>
  );
}
