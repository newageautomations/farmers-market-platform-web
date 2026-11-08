import { useCallback } from 'react';
import type {
  ComplianceData,
  ComplianceRequest,
  ComplianceSummaryData,
  DirectoryEntry,
  DocumentsApi,
  NotificationsApi,
} from '@market/api';
import { Badge, Spinner } from '@market/ui';
import { DocumentStatus } from '@market/ui/documents';
import { FarmstandIcon } from '@market/ui/farmstand';
import { date, useRead } from './common';

/**
 * Vendor document compliance shared by the Vendors list side panel and the
 * Vendor detail page. Counts come from the compliance summary; per-request
 * titles come from the read-only documents read when it is permitted.
 */
export type Readiness = ComplianceSummaryData['vendorReadiness'][number];
const READINESS_LIMIT = 50;
const complete = ['Approved', 'Waived', 'Manager exception'];
/** Most urgent first: nothing on file, then refused or lapsed, then waiting. */
const urgency = [
  'Missing',
  'Access revoked',
  'Rejected',
  'Expired',
  'Not yet valid',
  'Unknown',
  'Pending review',
];

export const linkLabels: Record<string, string> = {
  EXTERNAL: 'External',
  LINK_PENDING: 'Link pending',
  LINK_VERIFIED: 'Platform Vendor',
  LEGACY_UNVERIFIED: 'Unverified link',
  LINK_REVOKED: 'Link revoked',
};
const linkTones = {
  LINK_VERIFIED: 'success',
  LINK_PENDING: 'warning',
  LEGACY_UNVERIFIED: 'warning',
  LINK_REVOKED: 'danger',
} as const;
export function linkState(d: DirectoryEntry) {
  return d.linkState ?? (d.linkedVendorId ? 'LEGACY_UNVERIFIED' : 'EXTERNAL');
}
export function verifiedVendor(d: DirectoryEntry) {
  return d.linkState === 'LINK_VERIFIED' && d.linkedVendorId
    ? Number(d.linkedVendorId)
    : undefined;
}
export function AccountBadge({ state }: { state: string }) {
  return (
    <Badge tone={linkTones[state as keyof typeof linkTones]}>
      {linkLabels[state] ?? state}
    </Badge>
  );
}
export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : /s$/.test(word) ? 'es' : 's'}`;
}
/** Plain-language list of what is still outstanding, from summary counts. */
export function outstanding(r: Readiness) {
  return [
    r.missing && `${r.missing} missing`,
    r.rejected && `${r.rejected} rejected`,
    r.expired && `${r.expired} expired`,
    r.pending && `${r.pending} pending review`,
  ].filter(Boolean) as string[];
}
export function needsAttention(r?: Readiness) {
  return !!r && ['Incomplete', 'Pending review', 'Unknown'].includes(r.status);
}

export interface ComplianceReads {
  readiness: (vendorId?: number) => Readiness | undefined;
  loading: boolean;
  error?: unknown;
  refresh: () => void;
  limited: boolean;
  requests: { data?: ComplianceData; loading: boolean; error?: unknown };
}
/** Reads compliance for up to 50 Vendors plus their document requests. */
export function useVendorCompliance(
  key: string,
  vendorIds: number[],
  notifications?: NotificationsApi,
  documents?: Pick<DocumentsApi, 'read'>,
): ComplianceReads {
  const ids = [...new Set(vendorIds)].sort((a, b) => a - b);
  const vendorKey = ids.slice(0, READINESS_LIMIT).join(',');
  const summaryRead = useCallback(
    () =>
      notifications!.summary(vendorKey ? vendorKey.split(',').map(Number) : []),
    [notifications, vendorKey],
  );
  const summary = useRead(
    `${key}:compliance:${vendorKey}`,
    summaryRead,
    !!notifications && !!vendorKey,
  );
  const documentsRead = useCallback(() => documents!.read(0), [documents]);
  const requests = useRead(
    `${key}:documents`,
    documentsRead,
    !!documents && !!ids.length,
  );
  return {
    readiness: (vendorId) =>
      vendorId === undefined
        ? undefined
        : summary.data?.vendorReadiness.find((r) => r.vendor_id === vendorId),
    loading: summary.loading,
    error: summary.error,
    refresh: summary.refresh,
    limited: ids.length > READINESS_LIMIT,
    requests,
  };
}

/** Compliance meter and the list of each outstanding item for one Vendor. */
export function ComplianceSummary({
  vendor,
  compliance,
  untracked,
}: {
  vendor?: number;
  compliance: ComplianceReads;
  /** Shown when there is no verified platform Vendor to track. */
  untracked: string;
}) {
  if (vendor === undefined)
    return <p className="market-application-guidance">{untracked}</p>;
  const readiness = compliance.readiness(vendor);
  const { requests } = compliance;
  const items = (requests.data?.requests ?? []).filter(
    (r) => r.vendor_id === vendor,
  );
  const open = items
    .filter((r) => !complete.includes(r.status))
    .sort(
      (a, b) =>
        Number(b.required) - Number(a.required) ||
        rank(a.status) - rank(b.status),
    );
  const expiring = items.filter(
    (r) => complete.includes(r.status) && r.expiration === 'Expiring Soon',
  );
  const total = readiness?.total ?? items.length;
  const done = readiness?.complete ?? items.length - open.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="vendor-compliance">
      {compliance.loading && !readiness ? (
        <Spinner label="Checking compliance" />
      ) : readiness?.status === 'No requirements' ? (
        <p className="market-application-guidance">
          No documents are required from this Vendor.
        </p>
      ) : !readiness && !items.length ? (
        <p className="market-application-guidance">
          Compliance is unavailable for this Vendor. Open Documents to review
          it.
        </p>
      ) : (
        <div className="occurrence-booth-meter">
          <div>
            <strong>
              {done} / {total} complete
            </strong>
            <span>
              {readiness?.outstandingRequired
                ? `${readiness.outstandingRequired} required outstanding`
                : 'Nothing required outstanding'}
            </span>
          </div>
          <progress max={100} value={percent} aria-label="Documents complete" />
        </div>
      )}
      {requests.loading ? (
        <Spinner label="Loading document requests" />
      ) : requests.data ? (
        open.length || expiring.length ? (
          <ul className="vendor-gaps" aria-label="What is missing">
            {open.map((r) => (
              <Gap key={r.id} request={r} />
            ))}
            {expiring.map((r) => (
              <Gap key={r.id} request={r} status="Expiring Soon" />
            ))}
          </ul>
        ) : (
          items.length > 0 && (
            <p className="vendor-gaps-done">
              <FarmstandIcon name="circle-check" />
              Every requested document is complete.
            </p>
          )
        )
      ) : (
        readiness &&
        outstanding(readiness).length > 0 && (
          <p className="market-application-guidance">
            {outstanding(readiness).join(' · ')}. Open Documents to see each
            item.
          </p>
        )
      )}
      {requests.data?.truncated && (
        <p className="markets-muted">
          Some requests may be omitted. Open Documents for the full list.
        </p>
      )}
    </div>
  );
}
export function ComplianceCell({
  vendor,
  compliance,
}: {
  vendor?: number;
  compliance: ComplianceReads;
}) {
  if (vendor === undefined)
    return <span className="markets-muted">Not tracked</span>;
  const ready = compliance.readiness(vendor);
  if (!ready)
    return (
      <span className="markets-muted">
        {compliance.loading ? 'Checking…' : 'Unavailable'}
      </span>
    );
  const gaps = outstanding(ready);
  return (
    <div className="vendor-compliance-cell">
      <DocumentStatus value={ready.status} />
      {gaps.length > 0 && <small>{gaps.join(' · ')}</small>}
    </div>
  );
}
function rank(status: string) {
  const index = urgency.indexOf(status);
  return index < 0 ? urgency.length : index;
}
/** One outstanding item: its colour, name, due date while missing, and status. */
function Gap({
  request,
  status = request.status,
}: {
  request: ComplianceRequest;
  status?: string;
}) {
  const due =
    ['Missing', 'Access revoked'].includes(status) && request.due_on
      ? `Due ${date(request.due_on)}`
      : null;
  return (
    <li
      data-tone={
        status === 'Pending review' || status === 'Expiring Soon'
          ? 'warning'
          : 'danger'
      }
    >
      <span>
        <strong>{request.title}</strong>
        {due && <small>{due}</small>}
      </span>
      <DocumentStatus value={status} />
    </li>
  );
}
