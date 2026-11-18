import {
  websiteSizingLimits,
  withWebsiteSectionPresentation,
  type WebsiteSection,
  type WebsiteSectionSizing,
} from '@market/theme/storefront';
import { EditorRangeField } from './TextSizeControls';
import { Button } from '@market/ui';

/** Feature composition of the existing native range controls, shared by section and image inspectors. */
export function WebsiteSectionSizingEditor({
  value,
  onChange,
  imageOnly = false,
}: {
  value: WebsiteSection;
  onChange: (value: WebsiteSection) => void;
  imageOnly?: boolean;
}) {
  const sizing = value.presentation.sizing ?? {};
  const image =
    value.type === 'image-with-text' ? value.presentation : undefined;
  const controls: Array<
    readonly [keyof WebsiteSectionSizing, string, number, string]
  > = imageOnly
    ? []
    : [
        ['width', 'Content width', 100, '%'],
        ['height', 'Section minimum height', 0, 'px'],
        ['heading', 'Heading size', 100, '%'],
        ['paragraph', 'Paragraph size', 100, '%'],
        ...(value.type !== 'text'
          ? [['button', 'Button size', 100, '%'] as const]
          : []),
        [
          'gap',
          'Content spacing',
          image?.spacing === 'compact'
            ? 16
            : image?.spacing === 'spacious'
              ? 40
              : 28,
          'px',
        ],
        ['padding', 'Section padding', 48, 'px'],
      ];
  if (image && image.imageSide !== 'background')
    controls.push([
      'imageWidth',
      'Image width',
      image.columnRatio === '40-60'
        ? 40
        : image.columnRatio === '60-40'
          ? 60
          : image.columnRatio === '50-50'
            ? 50
            : image.imageSize === 'small'
              ? 40
              : image.imageSize === 'large'
                ? 60
                : 50,
      '%',
    ]);
  if (image) controls.push(['imageHeight', 'Image height', 440, 'px']);
  return (
    <>
      {controls.map(([key, label, fallback, unit]) => (
        <EditorRangeField
          key={key}
          id={`${value.id}-${imageOnly ? 'image-' : ''}sizing-${key}`}
          label={label}
          value={sizing[key] ?? fallback}
          min={websiteSizingLimits[key][0]}
          max={websiteSizingLimits[key][1]}
          unit={unit}
          onChange={(size) =>
            onChange(
              withWebsiteSectionPresentation(value, {
                sizing: { ...sizing, [key]: size },
              }),
            )
          }
        />
      ))}
      <Button
        variant="tertiary"
        size="compact"
        disabled={!controls.some(([key]) => sizing[key] !== undefined)}
        onClick={() =>
          onChange(
            withWebsiteSectionPresentation(value, {
              sizing: imageOnly
                ? Object.fromEntries(
                    Object.entries(sizing).filter(
                      ([key]) => key !== 'imageWidth' && key !== 'imageHeight',
                    ),
                  )
                : {},
            }),
          )
        }
      >
        Reset sizes
      </Button>
    </>
  );
}
