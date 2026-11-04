import {
  safeStorefrontUrl,
  type ApplicantApplicationDetail,
  type ApplicantApplicationRow,
} from '@market/api';
import type { ApplicantApplicationsApi } from '@market/api';

/** Discovery is a separate public read, never inferred from memberships or submissions. */
export interface DiscoverableMarket {
  id: string;
  name: string;
  city: string;
  state: string;
  website: string | null;
  applyUrl: string | null;
  nextMarket: { startsAt: string; timezone: string } | null;
  deadline: { closesAt: string; timezone: string } | null;
}
/** Adapter contract pending a vendor-authorized discovery endpoint. */
export interface MarketDiscoveryApi {
  cities: () => Promise<Array<{ value: string; label: string }>>;
  search: (input: {
    search: string;
    city: string;
    skip: number;
    take: number;
  }) => Promise<{
    items: DiscoverableMarket[];
    totalItems: number;
  }>;
}
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
