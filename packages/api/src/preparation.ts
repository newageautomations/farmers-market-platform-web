import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
import type { VendorBoothAssignment } from './market-operations';
export type PreparationScope = 'VENDOR' | 'MANAGER';
export type Readiness =
  'Ready' | 'Not Ready' | 'Not Reported' | 'Needs Reconfirmation';
export interface PreparationTask {
  id: string;
  title: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PreparationTemplate {
  id: number;
  name: string;
  revision: number;
  titles: string[];
}
export interface PreparationVendor {
  vendorId: number | null;
  directoryId?: number;
  name: string;
  participation: string;
  readiness: Readiness | 'Not Applicable';
  confirmedAt: string | null;
  booths: string[];
  invoices: Array<{
    status: string;
    totalMinor: number;
    paidMinor: number;
    currency: string;
  }> | null;
  rentals: unknown[];
}
export interface PreparationView {
  operationsSummary?: {
    assignedBooths: number;
    unassignedBooths: number | null;
    outstandingInvoices: number | null;
  };
  occurrence: {
    id: number;
    marketName: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    venue: string;
    status: string;
  };
  sourceVersion?: string;
  privateMarket: boolean;
  participation: string | null;
  revision: number;
  tasks: PreparationTask[];
  appliedTemplates: string[];
  templates: PreparationTemplate[];
  readiness: Readiness;
  confirmedAt: string | null;
  editable: boolean;
  assignments?: VendorBoothAssignment[] | null;
  vendors?: PreparationVendor[];
}
export type PreparationCommand = { action: string; [key: string]: unknown };
function checked(value: unknown): PreparationView {
  if (
    !value ||
    typeof value !== 'object' ||
    !('revision' in value) ||
    !Number.isInteger(value.revision) ||
    !('tasks' in value) ||
    !Array.isArray(value.tasks) ||
    !('templates' in value) ||
    !Array.isArray(value.templates) ||
    !('occurrence' in value) ||
    !value.occurrence
  )
    throw new AppError('graphql');
  return value as PreparationView;
}
export function createPreparationApi(options: TransportOptions) {
  const execute = transport('admin', options);
  const readDocument = parse(
    'query OwnMarketPreparation($input: JSON!) { ownMarketPreparation(input: $input) }',
  ) as TypedDocumentNode<{ ownMarketPreparation: unknown }, { input: unknown }>;
  const commandDocument = parse(
    'mutation MarketPreparationCommand($input: JSON!) { marketPreparationCommand(input: $input) }',
  ) as TypedDocumentNode<
    { marketPreparationCommand: unknown },
    { input: unknown }
  >;
  return {
    async read(scope: PreparationScope, occurrenceId: number) {
      return checked(
        (
          await execute(
            { api: 'admin', document: readDocument },
            { input: { scope, occurrenceId } },
          )
        ).ownMarketPreparation,
      );
    },
    async command(
      scope: PreparationScope,
      occurrenceId: number,
      expectedRevision: number,
      command: PreparationCommand,
    ) {
      return checked(
        (
          await execute(
            { api: 'admin', document: commandDocument },
            { input: { ...command, scope, occurrenceId, expectedRevision } },
          )
        ).marketPreparationCommand,
      );
    },
  };
}
export type PreparationApi = ReturnType<typeof createPreparationApi>;
