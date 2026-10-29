import { TextSizeControls } from './TextSizeControls';
import { Checkbox, Field, Input, SelectField, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import {
  defaultFindUs,
  type StorefrontAppearance,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import type { StorefrontAppearanceApi } from '@market/api';
import { ImageShapeField } from './StorefrontAppearance';
import { CategoryImageField } from './vendor/categories';
export function FindUsEditor({
  value = defaultFindUs,
  api,
  selected,
  collapsed,
  choose,
  collapse,
  onChange,
  busy,
  textSizes,
  onTextSizeChange,
  themeId,
}: {
  value?: StorefrontAppearance['findUs'];
  api: StorefrontAppearanceApi;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  choose: (id: StorefrontEditorSection) => void;
  collapse: () => void;
  onChange: (value: NonNullable<StorefrontAppearance['findUs']>) => void;
  busy: boolean;
  textSizes?: StorefrontAppearance['textSizes'];
  onTextSizeChange: (
    id: string,
    value: { heading: number; paragraph: number },
  ) => void;
  themeId?: string;
}) {
  const patch = (v: Partial<typeof value>) => onChange({ ...value, ...v });
  const intro = value.introduction;
  const patchIntro = (v: Partial<typeof intro>) =>
    patch({ introduction: { ...intro, ...v } });
  const cta = value.cta;
  return (
    <fieldset disabled={busy}>
      {(
        ['find-settings', 'find-intro', 'find-markets', 'find-cta'] as const
      ).map((id) => (
        <details
          key={id}
          className={disclosureClassName('dropdown')}
          open={!collapsed && selected === id}
        >
          <summary
            role="button"
            aria-expanded={!collapsed && selected === id}
            onClick={(e) => {
              e.preventDefault();
              if (!collapsed && selected === id) collapse();
              else choose(id);
            }}
          >
            {
              {
                'find-settings': 'Find Us page',
                'find-intro': 'Introduction',
                'find-markets': 'Market appearances',
                'find-cta': 'Closing invitation',
              }[id]
            }
          </summary>
          {!collapsed && selected === id && (
            <div className="ui-disclosure-content">
              {id === 'find-settings' && (
                <>
                  <label>
                    <Checkbox
                      checked={value.enabled}
                      onChange={(e) => patch({ enabled: e.target.checked })}
                    />{' '}
                    Enable Find Us page
                  </label>
                  <Field label="Page title" id="find-title">
                    <Input
                      id="find-title"
                      maxLength={160}
                      value={value.title}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </Field>
                </>
              )}
              {id === 'find-intro' && (
                <>
                  <TextSizeControls
                    value={textSizes?.['find-intro']}
                    onChange={(value) => onTextSizeChange('find-intro', value)}
                  />
                  <Field id="find-heading" label="Heading">
                    <Input
                      id="find-heading"
                      maxLength={160}
                      value={intro.heading}
                      onChange={(e) => patchIntro({ heading: e.target.value })}
                    />
                  </Field>
                  <Field id="find-description" label="Description">
                    <Textarea
                      id="find-description"
                      maxLength={20000}
                      value={intro.body}
                      onChange={(e) => patchIntro({ body: e.target.value })}
                    />
                  </Field>
                  {api.media && (
                    <CategoryImageField
                      api={api.media}
                      themeId={themeId}
                      value={intro.imageAssetId}
                      preview={intro.image}
                      label="Introduction photograph"
                      presentation="library"
                      onImageChange={(image) =>
                        patchIntro({
                          imageAssetId: image?.id ?? null,
                          image: image?.preview ?? '',
                        })
                      }
                    />
                  )}
                  <Field id="find-alt" label="Image alternative text">
                    <Input
                      id="find-alt"
                      maxLength={200}
                      value={intro.alt}
                      onChange={(e) => patchIntro({ alt: e.target.value })}
                    />
                  </Field>
                  <ImageShapeField
                    id="find-shape"
                    label="Image shape"
                    value={intro.shape}
                    includeNatural
                    onChange={(shape) => patchIntro({ shape })}
                  />
                  <SelectField
                    label="Image size"
                    value={intro.imageSize ?? 'small'}
                    onChange={(e) =>
                      patchIntro({
                        imageSize: e.target.value as
                          'small' | 'medium' | 'large',
                      })
                    }
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </SelectField>
                  <SelectField
                    label="Text alignment"
                    value={intro.textAlign ?? 'left'}
                    onChange={(e) =>
                      patchIntro({
                        textAlign: e.target.value as
                          'left' | 'center' | 'right',
                      })
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </SelectField>
                </>
              )}
              {id === 'find-markets' && (
                <p>
                  Confirmed appearances and preorder availability come from your
                  market schedules and participation. Manage attendance through
                  the existing market workflows.
                </p>
              )}
              {id === 'find-cta' && (
                <>
                  <TextSizeControls
                    value={textSizes?.['find-cta']}
                    onChange={(value) => onTextSizeChange('find-cta', value)}
                  />
                  {(['heading', 'text', 'label'] as const).map((key) => (
                    <Field
                      key={key}
                      id={`find-cta-${key}`}
                      label={
                        {
                          heading: 'Heading',
                          text: 'Supporting text',
                          label: 'Button label',
                        }[key]
                      }
                    >
                      <Input
                        id={`find-cta-${key}`}
                        maxLength={
                          key === 'heading' ? 160 : key === 'text' ? 600 : 80
                        }
                        value={cta[key]}
                        onChange={(e) =>
                          patch({ cta: { ...cta, [key]: e.target.value } })
                        }
                      />
                    </Field>
                  ))}
                  <SelectField
                    label="Destination"
                    value={cta.destination}
                    onChange={(e) =>
                      patch({
                        cta: {
                          ...cta,
                          destination: e.target.value as '/' | '/products',
                        },
                      })
                    }
                  >
                    <option value="/products">Shop</option>
                    <option value="/">Homepage</option>
                  </SelectField>
                </>
              )}
            </div>
          )}
        </details>
      ))}
    </fieldset>
  );
}
