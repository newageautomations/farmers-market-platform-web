import {
  safeStorefrontUrl,
  type ApplicantApplicationDetail,
  type ApplicantApplicationRow,
  type DiscoverableMarket,
} from '@market/api';
import type { ApplicantApplicationsApi } from '@market/api';

/** Discovery is a separate vendor-authorized read, never inferred from memberships or submissions. */
export type {
  DiscoverableMarket,
  MarketApplyState,
  MarketDiscoveryApi,
} from '@market/api';
export const applicationKey = (row: ApplicantApplicationRow) =>
  `${row.status === 'DRAFT' ? 'draft' : 'submission'}:${row.id}`;
export const applicationLocation = (row: ApplicantApplicationRow) =>
  [row.city, row.state].filter(Boolean).join(', ') || 'Location unavailable';
export const applicationDate = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date unavailable';
export function applicationHref(row: ApplicantApplicationRow) {
  const path =
    row.status === 'DRAFT'
      ? `/vendor/applications/drafts/${row.id}`
      : `/vendor/applications/${row.id}`;
  return (
    path +
    (row.vendorChannelId
      ? '?channel=' + encodeURIComponent(row.vendorChannelId)
      : '')
  );
}
export function localVendorDestination(value: string | null | undefined) {
  if (!value) return undefined;
  // Backend-owned handoff links must remain within the vendor workspace.
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith('/vendor/')
      ? url.pathname + url.search + url.hash
      : undefined;
  } catch {
    return undefined;
  }
}
export function safeMarketApplicationUrl(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return !url.username && !url.password && safeStorefrontUrl(url.origin)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
/**
 * Apply-column action for a discovery row, from the backend's advisory `applyState`.
 * Destinations are re-validated: storefront URLs by origin, workspace links by same-origin /vendor/ path.
 * Older servers omit `applyState`; their safe `applyUrl` keeps the original Apply behavior.
 */
export type DiscoveryAction =
  | { kind: 'apply'; label: string; href: string }
  | { kind: 'external'; label: string; href: string }
  | { kind: 'local'; label: string; href: string }
  | {
      kind: 'not-yet-open';
      label: string;
      opensAt: string | null;
      timezone?: string;
    }
  | { kind: 'unavailable'; label: string; reason: string };
export function discoveryAction(market: DiscoverableMarket): DiscoveryAction {
  const local = (label: string, value?: string | null) => {
    const href = localVendorDestination(value);
    return href
      ? ({ kind: 'local', label, href } as const)
      : ({
          kind: 'unavailable',
          label,
          reason: 'This record is unavailable here.',
        } as const);
  };
  switch (market.applyState) {
    case 'MEMBER':
      return local(
        'Membership',
        market.existingApplicationHref ?? '/vendor/markets',
      );
    case 'MEMBERSHIP_PENDING':
      return local(
        'Membership pending',
        market.existingApplicationHref ?? '/vendor/markets',
      );
    case 'APPLIED':
      return local('View application', market.existingApplicationHref);
    case 'DRAFT': {
      const external = safeMarketApplicationUrl(
        market.existingApplicationHref ?? null,
      );
      if (external)
        return { kind: 'external', label: 'Continue draft', href: external };
      return local('Continue draft', market.existingApplicationHref);
    }
    case 'NOT_YET_OPEN':
      return {
        kind: 'not-yet-open',
        label: 'Not yet open',
        opensAt: market.opensAt ?? null,
        timezone: market.timezone ?? market.deadline?.timezone,
      };
    default: {
      const href = safeMarketApplicationUrl(market.applyUrl);
      return href
        ? { kind: 'apply', label: 'Apply', href }
        : {
            kind: 'unavailable',
            label: 'Apply',
            reason:
              "Applications are unavailable until this market's website is active.",
          };
    }
  }
}
export function applicationNextStep(
  row: ApplicantApplicationRow,
  detail?: ApplicantApplicationDetail,
) {
  const fallback = {
    label: 'View application',
    href: applicationHref(row),
    detail: 'Open your application to review its current status.',
  };
  if (row.status === 'DRAFT') {
    const origin = safeStorefrontUrl(row.origin);
    return row.current && origin
      ? {
          label: 'Complete application',
          href: `${origin.replace(/\/$/, '')}/vendor/application-continue?draft=${row.id}&vendor=${row.vendorId ?? ''}&channel=${encodeURIComponent(row.vendorChannelId ?? '')}`,
          detail: 'Continue your saved draft and submit it to the market.',
        }
      : {
          ...fallback,
          label: 'View saved draft',
          detail:
            'This form has changed or is unavailable. Your saved work is retained. Contact the market before starting again.',
        };
  }
  const request = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'NEEDS_INFO',
    'WAITLISTED',
  ].includes(row.status)
    ? detail?.informationRequests?.find((r) => r.status === 'AWAITING_RESPONSE')
    : undefined;
  if (request)
    return {
      label: 'Provide information',
      href: applicationHref(row) + `#information-request-${request.id}`,
      detail:
        'The market has requested more information. Open the request to respond.',
    };
  if (row.status === 'NEEDS_INFO')
    return {
      ...fallback,
      label: 'Review request',
      detail:
        'The market needs more information. Open your application for guidance.',
    };
  if (row.status === 'ACCEPTED') {
    const step = detail?.onboarding?.steps.find(
      (s) => s.state === 'Action needed' && localVendorDestination(s.href),
    );
    if (step)
      return {
        label: `Open ${step.label.toLocaleLowerCase()}`,
        href: localVendorDestination(step.href)!,
        detail: step.detail,
      };
    return {
      ...fallback,
      label: 'Review acceptance',
      detail:
        'Review your acceptance and onboarding details. Membership, attendance and booth assignments each require separate approval.',
    };
  }
  if (row.status === 'WAITLISTED')
    return {
      ...fallback,
      label: 'View updates',
      detail:
        'You are on the waitlist. Check your application for updates from the market.',
    };
  if (['SUBMITTED', 'UNDER_REVIEW'].includes(row.status))
    return {
      ...fallback,
      label: 'Review status',
      detail:
        'Awaiting a decision from the market. You can review your submitted application.',
    };
  return fallback;
}
export async function readAllMarketApplications(
  api: ApplicantApplicationsApi,
  vendorId: number,
) {
  const rows = new Map<string, ApplicantApplicationRow>();
  let skip = 0;
  while (true) {
    const page = await api.read({ vendorId, skip });
    for (const row of [...page.drafts, ...page.items]) {
      const scoped = {
        ...row,
        vendorId: page.vendorId ?? vendorId,
        vendorChannelId: row.vendorChannelId ?? page.vendorChannelId,
      };
      rows.set(applicationKey(row), scoped);
    }
    skip += page.items.length;
    if (!page.items.length || skip >= page.totalItems) break;
  }
  return [...rows.values()];
}
export async function readApplicationSteps(
  api: ApplicantApplicationsApi,
  vendorId: number,
  rows: ApplicantApplicationRow[],
) {
  const details = new Map<string, ApplicantApplicationDetail>();
  for (let offset = 0; offset < rows.length; offset += 6) {
    const batch = rows
      .slice(offset, offset + 6)
      .filter((r) => r.status !== 'DRAFT');
    const results = await Promise.all(
      batch.map(async (row) => {
        const detail = await api.read<ApplicantApplicationDetail>({
          id: row.id,
          vendorId,
        });
        if (detail.id !== row.id || detail.marketId !== row.marketId)
          throw new Error('Application identity changed');
        return [applicationKey(row), detail] as const;
      }),
    );
    for (const [key, detail] of results) details.set(key, detail);
  }
  return details;
}
