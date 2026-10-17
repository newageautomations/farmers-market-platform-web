import * as g from './generated/admin';
import { AppError } from './errors';
import { transport } from './transport';
import type { UpcomingCompliance } from './compliance-phase3';

export interface NotificationPreferencesData {
  scope: 'market' | 'vendor';
  vendorId: number | null;
  marketId: number | null;
  channel: 'console';
  revision: number;
  enabled: Record<string, boolean>;
  thresholds: number[];
  supported: string[];
}
export interface ComplianceCounts {
  total: number;
  complete: number;
  missing: number;
  pending: number;
  rejected: number;
  expired: number;
  expiringSoon: number;
  outstandingRequired: number;
}
export interface ComplianceSummaryData {
  scope: 'market' | 'vendor';
  totals: ComplianceCounts;
  marketTotals: {
    ready: number;
    incomplete: number;
    noRequirements: number;
    vendors: number;
  };
  library: { expired: number; expiringSoon: number } | null;
  vendorReadiness: Array<
    ComplianceCounts & { vendor_id: number; status: string }
  >;
  markets: Array<
    ComplianceCounts & {
      market_id: number;
      market_name: string;
      status: string;
    }
  >;
  truncated: boolean;
}
export function createNotificationsApi(options: {
  endpoint: string;
  channelToken: string;
  onAuthorityFailure?: () => void;
  fetch?: typeof fetch;
}) {
  const run = transport('admin', options);
  function handle(error: unknown): never {
    if (
      error instanceof AppError &&
      ['authentication', 'forbidden'].includes(error.kind)
    )
      options.onAuthorityFailure?.();
    throw error;
  }
  return {
    upcoming: () =>
      run(
        { api: 'admin', document: g.OwnAdvancedComplianceDocument },
        { input: { view: 'upcoming' } },
      )
        .then((r) => r.ownAdvancedCompliance as UpcomingCompliance)
        .catch(handle),
    preferences: () =>
      run({ api: 'admin', document: g.OwnNotificationPreferencesDocument }, {})
        .then(
          (r) => r.ownNotificationPreferences as NotificationPreferencesData,
        )
        .catch(handle),
    save: (
      input: Pick<NotificationPreferencesData, 'enabled' | 'thresholds'> & {
        expectedRevision: number;
      },
    ) =>
      run(
        { api: 'admin', document: g.SetOwnNotificationPreferencesDocument },
        { input },
      )
        .then(
          (r) => r.setOwnNotificationPreferences as NotificationPreferencesData,
        )
        .catch(handle),
    summary: (vendorIds: number[] = []) =>
      run(
        { api: 'admin', document: g.OwnComplianceSummaryDocument },
        { vendorIds },
      )
        .then((r) => r.ownComplianceSummary as ComplianceSummaryData)
        .catch(handle),
  };
}
export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
