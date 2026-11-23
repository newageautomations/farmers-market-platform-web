import { useState } from 'react';
import { safeStorefrontUrl } from '@market/api';
import { Badge, UtilityIcon } from '@market/ui';
import { FarmstandButton, FarmstandLink } from '@market/ui/farmstand';
import {
  applicationStateLabels,
  type ApplicationRow,
  type ApplicationState,
} from './applications-data';

export function ApplicationStateBadge({ state }: { state: ApplicationState }) {
  return (
    <Badge
      tone={
        state === 'PUBLISHED'
          ? 'success'
          : state === 'DRAFT'
            ? 'warning'
            : 'neutral'
      }
    >
      {applicationStateLabels[state]}
    </Badge>
  );
}

/** Who can open the application, in plain words. */
export function sharingLabel(row: ApplicationRow) {
  if (!row.published) return 'Not published yet';
  if (row.template.visibility === 'PRIVATE') return 'Private link only';
  return row.template.advertised
    ? 'Public, advertised on your storefront'
    : 'Public';
}

/**
 * Where a published application is live on the Market's storefront. Only a
 * server-owned storefront origin is used; undefined until it is published.
 */
export function liveApplicationUrl(
  origin: string | null | undefined,
  row: { state: ApplicationState; template: { slug: string } } | undefined,
) {
  const base = safeStorefrontUrl(origin ?? null);
  if (!base || !row || row.state !== 'PUBLISHED') return undefined;
  return new URL(`/apply/${encodeURIComponent(row.template.slug)}`, base).href;
}

/** The live link with Open and Copy, for the list, details and publish result. */
export function ApplicationLiveLink({
  url,
  compact = false,
}: {
  url: string;
  compact?: boolean;
}) {
  const [notice, setNotice] = useState('');
  return (
    <div className="application-live-link">
      <a
        className="application-live-url"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {url.replace(/^https?:\/\//, '')}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <div className="application-live-actions">
        <FarmstandButton
          variant="secondary"
          size={compact ? 'compact' : undefined}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setNotice('Link copied.');
            } catch {
              setNotice('Copy was unavailable. Select and copy the link.');
            }
          }}
        >
          <UtilityIcon name="copy" />
          Copy link
        </FarmstandButton>
        <FarmstandLink
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size={compact ? 'compact' : undefined}
        >
          <UtilityIcon name="external" />
          Open
          <span className="sr-only">
            {' '}
            live application (opens in a new tab)
          </span>
        </FarmstandLink>
      </div>
      <span className="application-live-notice" role="status">
        {notice}
      </span>
    </div>
  );
}
