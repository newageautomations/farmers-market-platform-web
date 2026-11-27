import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SelectField } from '@market/ui';
import {
  themePageStructure,
  websiteSpaceBlockLimits,
  type StorefrontSiteKind,
  type SectionBackground,
  type WebsiteSection,
} from '@market/theme/storefront';
import { EditorRangeField } from './TextSizeControls';
import { PanelSection } from './market/phase14/LayoutEditorChrome';

/** Feature-owned routing of existing inspectors; no business state lives in this context. */
export const WebsiteEditorContext = createContext<{
  inspector: HTMLElement | null;
  block?: { sectionId: string; blockId: string };
  selectBlock: (sectionId: string, blockId?: string) => void;
  /** The website's own theme. Section targets can name a shared contract (Harvest) instead. */
  theme?: string;
  /** Market or vendor website: page rules differ on the themes both use. */
  kind?: StorefrontSiteKind;
  /** What each section background choice looks like on the current theme and palette. */
  backgrounds?: Record<SectionBackground, { color: string; label: string }>;
} | null>(null);

const fallbackBackgrounds: Record<
  SectionBackground,
  { color: string; label: string }
> = {
  paper: { color: '#f7f5ef', label: 'Page background' },
  surface: { color: '#fffefa', label: 'Light card' },
  ink: { color: '#355747', label: 'Theme color' },
};
/**
 * "Space above and below" slider for a custom section, on themes that give
 * every section default spacing. It shows the theme default until the manager
 * moves it.
 */
export function SectionSpaceField<T extends WebsiteSection>({
  value,
  theme,
  onChange,
}: {
  value: T;
  theme?: string;
  onChange: (value: T) => void;
}) {
  const workspace = useContext(WebsiteEditorContext);
  const fallback = themePageStructure(
    workspace?.theme ?? theme,
    workspace?.kind,
  ).sectionSpaceDefault;
  if (fallback === null) return null;
  return (
    <EditorRangeField
      id={`${value.id}-space-block`}
      label="Space above and below"
      min={websiteSpaceBlockLimits[0]}
      max={websiteSpaceBlockLimits[1]}
      step={4}
      unit="px"
      value={value.presentation.spaceBlock ?? fallback}
      onChange={(spaceBlock) =>
        onChange({
          ...value,
          presentation: { ...value.presentation, spaceBlock },
        })
      }
    />
  );
}
/**
 * Section background picker. Each choice shows the color it resolves to on the
 * selected theme and palette, using the palette select's swatch presentation.
 */
export function SectionBackgroundField({
  id,
  value,
  options = ['paper', 'surface', 'ink'],
  onChange,
}: {
  id: string;
  value: SectionBackground;
  options?: readonly SectionBackground[];
  onChange: (value: SectionBackground) => void;
}) {
  const backgrounds =
    useContext(WebsiteEditorContext)?.backgrounds ?? fallbackBackgrounds;
  return (
    <SelectField
      id={id}
      label="Background color"
      className="ui-palette-select"
      value={value}
      onChange={(event) => onChange(event.target.value as SectionBackground)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          <span className="ui-palette-option">
            <span className="ui-palette-option-label">
              {backgrounds[option].label}
            </span>
            <span className="ui-palette-swatches" aria-hidden="true">
              <span
                className="ui-palette-swatch"
                style={{ backgroundColor: backgrounds[option].color }}
              />
            </span>
          </span>
        </option>
      ))}
    </SelectField>
  );
}
export function WebsiteInspectorContent({ children }: { children: ReactNode }) {
  const workspace = useContext(WebsiteEditorContext);
  const content = (
    <div className="ui-disclosure-content visual-editor-section-content">
      {children}
    </div>
  );
  return workspace
    ? workspace.inspector && createPortal(content, workspace.inspector)
    : content;
}

/**
 * Collapsible settings group for the website inspector. Reuses the layout
 * editor's `PanelSection` (same dark editor chrome) instead of a new
 * disclosure; outside the website workspace the fields render ungrouped, so
 * other hosts of these editors are unchanged.
 */
export function InspectorGroup({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  const workspace = useContext(WebsiteEditorContext);
  if (!workspace) return <>{children}</>;
  return (
    <PanelSection
      title={title}
      defaultOpen={open}
      className="website-inspector-group"
    >
      {children}
    </PanelSection>
  );
}
