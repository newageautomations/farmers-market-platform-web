import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import type { PreparationScope } from './preparation';
import { AppError } from './errors';
export interface AssistanceRequest {
  id: number;
  vendor: string;
  booth: string | null;
  category: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  revision: number;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: number | null;
}
export interface DayView {
  serverNow: string;
  canFinish: boolean;
  canWrite: boolean;
  completion: {
    revision: number;
    finished: boolean;
    history: Array<{
      action: 'FINISH' | 'REOPEN';
      actorId: number;
      at: string;
      revision: number;
    }>;
  };
  assistance: AssistanceRequest[];
}
export interface DayRecap {
  generatedAt: string;
  coverage: string;
  previousOccurrenceId: number | null;
  metrics: Array<{
    key: string;
    label: string;
    value: number | null;
    currency?: string;
    detail?: string;
    previous: number | null;
  }>;
}
export function createMarketDayApi(options: TransportOptions) {
  const execute = transport('admin', options);
  const request = async <T>(
    field: string,
    input: unknown,
    mutation = false,
  ) => {
    const document = parse(
      `${mutation ? 'mutation' : 'query'} MarketDay($input: JSON!) { ${field}(input: $input) }`,
    ) as TypedDocumentNode<Record<string, T>, { input: unknown }>;
    const value = (await execute({ api: 'admin', document }, { input }))[field];
    if (!value || typeof value !== 'object') throw new AppError('graphql');
    return value;
  };
  return {
    read: (scope: PreparationScope, occurrenceId: number) =>
      request<DayView>('ownMarketDay', { scope, occurrenceId }),
    recap: (scope: PreparationScope, occurrenceId: number) =>
      request<DayRecap>('ownMarketDayRecap', { scope, occurrenceId }),
    command: (
      scope: PreparationScope,
      occurrenceId: number,
      command: { action: string; commandKey: string; [key: string]: unknown },
    ) =>
      request<DayView>(
        'marketDayCommand',
        { ...command, scope, occurrenceId },
        true,
      ),
  };
}
export type MarketDayApi = ReturnType<typeof createMarketDayApi>;
