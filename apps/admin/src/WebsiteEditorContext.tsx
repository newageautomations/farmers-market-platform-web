import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Feature-owned routing of existing inspectors; no business state lives in this context. */
export const WebsiteEditorContext = createContext<{
  inspector: HTMLElement | null;
  block?: { sectionId: string; blockId: string };
  selectBlock: (sectionId: string, blockId?: string) => void;
} | null>(null);
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
