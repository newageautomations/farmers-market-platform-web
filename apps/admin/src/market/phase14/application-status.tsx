import { Badge } from '@market/ui';
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
