import { HarvestSectionEditor } from './HarvestSectionEditor';
import { Field, Input, Textarea, SelectField } from '@market/ui';
import type { ReactNode } from 'react';
import type { StorefrontAppearanceApi } from '@market/api';
import { CategoryImageField } from './vendor/categories';
import { WebsiteSectionSizingEditor } from './WebsiteSectionSizingEditor';
import {
  isHarvestExpandedSection,
  websiteSectionRegistry,
  websiteSectionVariants,
  farmhouseHomepageTarget,
  type SectionTarget,
  type WebsiteSectionVariant,
  withWebsiteSectionContent,
  withWebsiteSectionPresentation,
  type WebsiteTextSection,
  type WebsiteImageTextLegacyContent,
  type WebsiteSection,
} from '@market/theme/storefront';

/** Shared content controls; theme layout and section management stay with the host editor. */
function TextSectionEditor({
  value,
  onChange,
}: {
  value: WebsiteTextSection;
  onChange: (value: WebsiteTextSection) => void;
}) {
  const definition = websiteSectionRegistry.text;
  return (
    <>
      <Field id={`${value.id}-heading`} label="Heading">
        <Input
          id={`${value.id}-heading`}
          value={value.content.heading}
          maxLength={definition.limits.heading}
          onChange={(event) =>
            onChange({
              ...value,
              content: { ...value.content, heading: event.target.value },
            })
          }
        />
      </Field>
      <Field id={`${value.id}-body`} label="Body text">
        <Textarea
          id={`${value.id}-body`}
          value={value.content.body}
          maxLength={definition.limits.body}
          rows={5}
          onChange={(event) =>
            onChange({
              ...value,
              content: { ...value.content, body: event.target.value },
            })
          }
        />
      </Field>
      <SelectField
        id={`${value.id}-alignment`}
        label="Alignment"
        value={value.presentation.alignment}
        onChange={(event) =>
          onChange({
            ...value,
            presentation: {
              ...value.presentation,
              alignment: event.target
                .value as WebsiteTextSection['presentation']['alignment'],
            },
          })
        }
      >
        {definition.alignments.map((alignment) => (
          <option key={alignment} value={alignment}>
            {alignment[0]!.toUpperCase() + alignment.slice(1)}
          </option>
        ))}
      </SelectField>
    </>
  );
}

type SectionEditorProps = {
  value: WebsiteSection;
  onChange: (value: WebsiteSection) => void;
  media?: StorefrontAppearanceApi['media'];
  destinationControl?: ReactNode;
  target?: SectionTarget;
  api?: StorefrontAppearanceApi;
  products?: Array<{ id: string; name: string }>;
  loadProducts?: () => void;
  categoryPresentation?: import('@market/theme/storefront').StorefrontAppearance['categoryPresentation'];
  onCategoryPresentationChange?: (
    value: NonNullable<
      import('@market/theme/storefront').StorefrontAppearance['categoryPresentation']
    >,
  ) => void;
  hiddenCategoryIds?: readonly string[];
};

/** Registry adapters compose existing fields, media picker and host-owned route choices. */
function WebsiteSectionEditor({
  value,
  onChange,
  media,
  destinationControl,
  api,
  products,
  loadProducts,
  categoryPresentation,
  onCategoryPresentationChange,
  hiddenCategoryIds,
  target = farmhouseHomepageTarget,
}: SectionEditorProps) {
  if (isHarvestExpandedSection(value))
    return (
      <HarvestSectionEditor
        themeId={target.theme}
        value={value}
        onChange={onChange}
        media={media}
        destinationControl={destinationControl}
        api={api}
        products={products}
        loadProducts={loadProducts}
        categoryPresentation={categoryPresentation}
        onCategoryPresentationChange={onCategoryPresentationChange}
        hiddenCategoryIds={hiddenCategoryIds}
      />
    );
  const backgroundTypeControl = (
    <SelectField
      id={`${value.id}-background-type`}
      label="Background type"
      value={value.presentation.backgroundType ?? 'contained'}
      onChange={(e) =>
        onChange(
          withWebsiteSectionPresentation(value, {
            backgroundType: e.target.value as 'contained' | 'full',
          }),
        )
      }
    >
      <option value="contained">Contained</option>
      <option value="full">Full screen width</option>
    </SelectField>
  );
  const variantControl = (
    <SelectField
      id={`${value.id}-variant`}
      label="Presentation"
      value={value.presentation.variant ?? 'standard'}
      onChange={(event) =>
        onChange(
          withWebsiteSectionPresentation(value, {
            variant: event.target.value as WebsiteSectionVariant,
          }),
        )
      }
    >
      {websiteSectionVariants(value.type, target).map((variant) => (
        <option key={variant} value={variant}>
          {variant[0]!.toUpperCase() + variant.slice(1)}
        </option>
      ))}
    </SelectField>
  );
  if (value.type === 'text')
    return (
      <>
        {backgroundTypeControl}
        {variantControl}
        <SelectField
          id={`${value.id}-background`}
          label="Background color"
          value={value.presentation.background ?? 'paper'}
          onChange={(e) =>
            onChange(
              withWebsiteSectionPresentation(value, {
                background: e.target.value as 'paper' | 'surface' | 'ink',
              }),
            )
          }
        >
          <option value="paper">Warm paper</option>
          <option value="surface">Surface</option>
          <option value="ink">Theme color</option>
        </SelectField>
        <TextSectionEditor value={value} onChange={onChange} />
        <WebsiteSectionSizingEditor value={value} onChange={onChange} />
      </>
    );
  const definition = websiteSectionRegistry[value.type];
  const blockMode = value.type === 'image-with-text' && !!value.content.blocks;
  const content = value.content;
  return (
    <>
      {backgroundTypeControl}
      {variantControl}
      {!blockMode && (
        <>
          <Field id={`${value.id}-heading`} label="Heading">
            <Input
              id={`${value.id}-heading`}
              value={content.heading}
              maxLength={definition.limits.heading}
              onChange={(e) =>
                onChange(
                  withWebsiteSectionContent(value, { heading: e.target.value }),
                )
              }
            />
          </Field>
          <Field
            id={`${value.id}-body`}
            label={
              value.type === 'cta-banner'
                ? 'Description (optional)'
                : 'Body text'
            }
          >
            <Textarea
              id={`${value.id}-body`}
              value={content.body}
              rows={4}
              maxLength={definition.limits.body}
              onChange={(e) =>
                onChange(
                  withWebsiteSectionContent(value, { body: e.target.value }),
                )
              }
            />
          </Field>
        </>
      )}
      {value.type === 'image-with-text' && (
        <>
          {!blockMode && (
            <>
              {media && (
                <CategoryImageField
                  api={media}
                  themeId={target.theme}
                  label="Photograph"
                  presentation="library"
                  value={value.content.image!.assetId}
                  preview={value.content.image!.url}
                  onImageChange={(image) =>
                    onChange({
                      ...value,
                      content: {
                        ...(value.content as WebsiteImageTextLegacyContent),
                        image: {
                          ...value.content.image!,
                          assetId: image?.id ?? null,
                          url: image?.preview ?? '',
                        },
                      },
                    })
                  }
                />
              )}
              <Field id={`${value.id}-alt`} label="Image alt text">
                <Input
                  id={`${value.id}-alt`}
                  value={value.content.image!.alt}
                  maxLength={
                    websiteSectionRegistry['image-with-text'].limits.alt
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      content: {
                        ...(value.content as WebsiteImageTextLegacyContent),
                        image: { ...value.content.image!, alt: e.target.value },
                      },
                    })
                  }
                />
              </Field>
            </>
          )}
          <SelectField
            id={`${value.id}-side`}
            label="Image position"
            value={value.presentation.imageSide}
            onChange={(e) =>
              onChange({
                ...value,
                presentation: {
                  ...value.presentation,
                  imageSide: e.target.value as 'left' | 'right' | 'background',
                },
              })
            }
          >
            {websiteSectionRegistry['image-with-text'].imageSides.map(
              (side) => (
                <option key={side} value={side}>
                  {side === 'background'
                    ? 'Full-width background with text overlay'
                    : side === 'left'
                      ? 'Left'
                      : 'Right'}
                </option>
              ),
            )}
          </SelectField>
        </>
      )}
      {!blockMode && (
        <>
          <Field
            id={`${value.id}-label`}
            label={
              value.type === 'image-with-text'
                ? 'Button label (optional)'
                : 'Button label'
            }
          >
            <Input
              id={`${value.id}-label`}
              value={content.label}
              maxLength={definition.limits.label}
              required={value.type === 'cta-banner'}
              onChange={(e) =>
                onChange(
                  withWebsiteSectionContent(value, { label: e.target.value }),
                )
              }
            />
          </Field>
          {destinationControl}
        </>
      )}
      {value.type === 'image-with-text' && (
        <>
          {value.presentation.imageSide !== 'background' && (
            <SelectField
              id={`${value.id}-ratio`}
              label="Column proportions (image / text)"
              value={
                value.presentation.sizing?.imageWidth !== undefined
                  ? 'custom'
                  : (value.presentation.columnRatio ??
                    (
                      {
                        small: '40-60',
                        medium: '50-50',
                        large: '60-40',
                      } as const
                    )[value.presentation.imageSize])
              }
              onChange={(e) =>
                onChange(
                  withWebsiteSectionPresentation(value, {
                    columnRatio: e.target.value as '50-50' | '40-60' | '60-40',
                    sizing: Object.fromEntries(
                      Object.entries(value.presentation.sizing ?? {}).filter(
                        ([key]) => key !== 'imageWidth',
                      ),
                    ),
                  }),
                )
              }
            >
              {value.presentation.sizing?.imageWidth !== undefined && (
                <option value="custom" disabled>
                  Custom width
                </option>
              )}
              <option value="50-50">50 / 50</option>
              <option value="40-60">40 / 60</option>
              <option value="60-40">60 / 40</option>
            </SelectField>
          )}
          <SelectField
            id={`${value.id}-vertical`}
            label="Text vertical alignment"
            value={value.presentation.verticalAlignment ?? 'center'}
            onChange={(e) =>
              onChange(
                withWebsiteSectionPresentation(value, {
                  verticalAlignment: e.target.value as
                    'top' | 'center' | 'bottom',
                }),
              )
            }
          >
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </SelectField>
          <SelectField
            id={`${value.id}-spacing`}
            label="Internal spacing"
            value={
              value.presentation.sizing?.gap !== undefined ||
              value.presentation.sizing?.padding !== undefined
                ? 'custom'
                : (value.presentation.spacing ?? 'balanced')
            }
            onChange={(e) =>
              onChange(
                withWebsiteSectionPresentation(value, {
                  sizing: Object.fromEntries(
                    Object.entries(value.presentation.sizing ?? {}).filter(
                      ([key]) => key !== 'gap' && key !== 'padding',
                    ),
                  ),
                  spacing: e.target.value as
                    'compact' | 'balanced' | 'spacious',
                }),
              )
            }
          >
            {(value.presentation.sizing?.gap !== undefined ||
              value.presentation.sizing?.padding !== undefined) && (
              <option value="custom" disabled>
                Custom spacing
              </option>
            )}
            <option value="compact">Compact</option>
            <option value="balanced">Balanced</option>
            <option value="spacious">Spacious</option>
          </SelectField>
        </>
      )}
      <SelectField
        id={`${value.id}-alignment`}
        label="Alignment"
        value={value.presentation.alignment}
        onChange={(e) =>
          onChange({
            ...value,
            presentation: { ...value.presentation, alignment: e.target.value },
          } as WebsiteSection)
        }
      >
        {definition.alignments.map((alignment) => (
          <option key={alignment} value={alignment}>
            {alignment[0]!.toUpperCase() + alignment.slice(1)}
          </option>
        ))}
      </SelectField>
      <SelectField
        id={`${value.id}-background`}
        label="Background color"
        value={value.presentation.background}
        onChange={(e) =>
          onChange(
            withWebsiteSectionPresentation(value, {
              background: e.target.value as 'paper' | 'surface' | 'ink',
            }),
          )
        }
      >
        {definition.backgrounds.map((background) => (
          <option key={background} value={background}>
            {
              { paper: 'Warm paper', surface: 'Light', ink: 'Theme color' }[
                background
              ]
            }
          </option>
        ))}
      </SelectField>
      <WebsiteSectionSizingEditor value={value} onChange={onChange} />
    </>
  );
}

export const websiteSectionEditors = {
  'harvest-expanded': WebsiteSectionEditor,
  text: WebsiteSectionEditor,
  'image-with-text': WebsiteSectionEditor,
  'cta-banner': WebsiteSectionEditor,
};
