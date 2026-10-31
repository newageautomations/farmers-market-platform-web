import type {
  MarketOperationsApi,
  MarketOperationsData,
  OperationsSection,
  ApplicationReviewInput,
} from '@market/api';
import { vi } from 'vitest';

export function applicationReviewApi(data: MarketOperationsData) {
  return {
    read: vi.fn(
      async (
        _section: OperationsSection,
        _occurrence?: number,
        input?: ApplicationReviewInput,
      ) =>
        input?.mode === 'DETAIL'
          ? {
              ...data,
              submissionDetail: data.submissions?.find(
                (s) => s.id === input.submissionId,
              ),
            }
          : {
              ...data,
              applicationPage: {
                items: (data.submissions ?? []).map((s) => ({
                  id: s.id,
                  businessName: s.applicant.businessName,
                  status: s.status,
                })),
                totalItems: data.submissions?.length ?? 0,
                skip: input?.skip ?? 0,
                take: 20,
                templates: data.templates ?? [],
                categories: ['Produce'],
                dates: data.occurrences,
              },
            },
    ),
    command: vi.fn(),
    vendorAssignments: vi.fn(),
  } satisfies MarketOperationsApi;
}
