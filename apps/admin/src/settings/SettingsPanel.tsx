import type { MouseEvent, ReactNode } from 'react';
import { FarmstandIcon, FarmstandLink } from '@market/ui/farmstand';
import { go } from '../vendor/common';
import '@market/ui/settings-panel.css';

/** Moved to `@market/ui/workspace` so the customer dashboard shares it. */
export { SettingsPanel } from '@market/ui/workspace';

/** In-app link that keeps native href semantics and leave guards. */
export function SettingsLink({
  to,
  children,
  appearance = 'text',
}: {
  to: string;
  children: ReactNode;
  appearance?: 'text' | 'button';
}) {
  return (
    <FarmstandLink
      href={to}
      appearance={appearance}
      variant="secondary"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (
          event.button === 0 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          go(to);
        }
      }}
    >
      {children}
      {appearance === 'button' && <FarmstandIcon name="arrow-right" />}
    </FarmstandLink>
  );
}
