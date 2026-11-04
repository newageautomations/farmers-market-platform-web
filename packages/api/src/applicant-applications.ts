import { transport, type TransportOptions } from './transport';
import {
  ApplicantApplicationsDocument as ShopRead,
  ApplicantApplicationCommandDocument as ShopCommand,
} from './generated/shop';
import {
  ApplicantApplicationsDocument as AdminRead,
  ApplicantApplicationCommandDocument as AdminCommand,
} from './generated/admin';
import type {
  ApplicationDefinition,
  PublicApplication,
  RentalSnapshot,
} from './market-operations';
import type { DocumentationReadiness } from './documents';
export interface ApplicantApplicationRow {
  id: number;
  revision?: number;
  vendorId?: number;
  vendorChannelId?: string;
  marketId: number;
  marketName: string;
  /** Optional discovery metadata. Older servers omit these fields. */
  city?: string | null;
  state?: string | null;
  name: string;
  slug: string;
  origin: string | null;
  current: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface ApplicantApplicationList {
  vendorId: number;
  vendorChannelId: string;
  drafts: ApplicantApplicationRow[];
  items: ApplicantApplicationRow[];
  totalItems: number;
  skip: number;
}
export interface ApplicantApplicationDetail extends ApplicantApplicationRow {
  onboarding?:
    import('./market-operations').ApplicationOnboardingSummary | null;
  informationRequests?: ApplicationInformationRequest[];
  definition: ApplicationDefinition;
  answers: Record<string, unknown>;
  rentalRequests: RentalSnapshot[];
  canWithdraw: boolean;
  vendorId: number;
  documentation?: DocumentationReadiness | null;
  dates: Array<{
    id: number;
    startsAt?: string;
    venue?: string;
    status?: string;
    decision: string;
  }>;
  history: Array<{
    at: string;
    status: string;
    event?: string;
    occurrenceId?: number | null;
  }>;
}
export interface ApplicationInformationRequest {
  id: number;
  revision: number;
  createdAt: string;
  status: 'AWAITING_RESPONSE' | 'RESPONDED' | 'RESOLVED' | 'CANCELLED';
  definition: ApplicationDefinition;
  references: Record<string, string>;
  documents: Array<{ id: string; title: string; status?: string }>;
  reviewedAt: string | null;
  response: {
    id: number;
    revision: number;
    answers: Record<string, unknown>;
    updatedAt: string;
    submittedAt: string | null;
  } | null;
}
export interface ApplicantDraftDetail {
  vendor: { id: number; channelId: string; name: string };
  definition: ApplicationDefinition;
  marketId: number;
  current: boolean;
  origin: string | null;
  marketName: string;
  name: string;
  application: PublicApplication | null;
  draft: {
    submissionId?: number | null;
    id: number;
    revision: number;
    templateVersionId: number;
    vendorId: number | null;
    updatedAt: string;
    progress: {
      answers: Record<string, unknown>;
      occurrenceIds: number[];
      rentals: Array<{ optionId: number; quantity: number }>;
    };
  };
}
export interface ApplicantApplicationsApi {
  read: <T = ApplicantApplicationList>(input?: {
    id?: number;
    draftId?: number;
    skip?: number;
    vendorId?: number;
  }) => Promise<T>;
  command: <T = Record<string, unknown>>(
    action: string,
    input: Record<string, unknown>,
  ) => Promise<T>;
}
export function createApplicantApplicationsApi(
  options: TransportOptions,
  api: 'shop' | 'admin' = 'shop',
): ApplicantApplicationsApi {
  const shop = transport('shop', options),
    admin = transport('admin', options);
  return {
    read: async <T>(input = {}) =>
      (api === 'shop'
        ? (await shop({ api: 'shop', document: ShopRead }, { input }))
            .applicantApplications
        : (await admin({ api: 'admin', document: AdminRead }, { input }))
            .applicantApplications) as T,
    command: async <T>(action: string, input: Record<string, unknown>) =>
      (api === 'shop'
        ? (
            await shop(
              { api: 'shop', document: ShopCommand },
              { action, input },
            )
          ).applicantApplicationCommand
        : (
            await admin(
              { api: 'admin', document: AdminCommand },
              { action, input },
            )
          ).applicantApplicationCommand) as T,
  };
}
