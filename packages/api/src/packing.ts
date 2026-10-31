import {
  VendorPackingOccurrencesDocument,
  VendorMarketPackingDocument,
  UpdateVendorMarketPackingDocument,
} from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
export interface PackingOccurrence {
  id: number;
  marketName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venue: string;
  status: string;
}
export interface PackingProduct {
  variantId: string;
  name: string;
  planned: number;
  preorders: number;
  required: number;
  packed: number;
  status: string;
  image?: string | null;
  availablePacked?: number;
}
export interface PackingCustomer {
  key: string;
  name: string;
  orderCodes: string[];
  required: number;
  packed: number;
  completed: boolean;
  status: string;
  availablePacked?: number;
  items: Array<{
    lineId: string;
    variantId: string;
    name: string;
    quantity: number;
    checked: boolean;
    packed?: number;
    availablePacked?: number;
    image?: string | null;
    orderCode: string;
    pickup: {
      venue?: string;
      startsAt?: string;
      endsAt?: string;
      instructions?: string;
    };
  }>;
}
export interface PackingView {
  occurrence: PackingOccurrence;
  revision: number;
  sourceVersion: string;
  products: PackingProduct[];
  customers: PackingCustomer[];
  summary: {
    gathered?: number;
    distinct: number;
    fullyPacked: number;
    partiallyPacked: number;
    required: number;
    packed: number;
    progress: number;
    status: string;
    customersRemaining: number;
  };
}
export interface PackingCommand {
  action:
    | 'PLAN'
    | 'PACK'
    | 'CHECK'
    | 'PACK_LINE'
    | 'USE_PACKED'
    | 'COMPLETE'
    | 'REOPEN';
  variantId?: string;
  quantity?: number;
  lineId?: string;
  checked?: boolean;
  customerKey?: string;
}
function view(value: unknown): PackingView {
  if (
    !value ||
    typeof value !== 'object' ||
    !('products' in value) ||
    !Array.isArray(value.products) ||
    !('customers' in value) ||
    !Array.isArray(value.customers) ||
    !('revision' in value) ||
    !Number.isInteger(value.revision) ||
    !('sourceVersion' in value) ||
    typeof value.sourceVersion !== 'string' ||
    !('occurrence' in value) ||
    !value.occurrence ||
    typeof value.occurrence !== 'object' ||
    !('summary' in value) ||
    !value.summary ||
    typeof value.summary !== 'object'
  )
    throw new AppError('graphql');
  return value as PackingView;
}
export function createPackingApi(options: TransportOptions) {
  const execute = transport('admin', options);
  return {
    async occurrences(): Promise<PackingOccurrence[]> {
      const result = (
        await execute(
          { api: 'admin', document: VendorPackingOccurrencesDocument },
          {},
        )
      ).ownPackingOccurrences;
      if (!Array.isArray(result)) throw new AppError('graphql');
      return result as PackingOccurrence[];
    },
    async read(occurrenceId: number) {
      return view(
        (
          await execute(
            { api: 'admin', document: VendorMarketPackingDocument },
            { occurrenceId },
          )
        ).ownMarketPacking,
      );
    },
    async command(current: PackingView, command: PackingCommand) {
      return view(
        (
          await execute(
            { api: 'admin', document: UpdateVendorMarketPackingDocument },
            {
              input: {
                variantId: null,
                quantity: null,
                lineId: null,
                checked: null,
                customerKey: null,
                ...command,
                occurrenceId: current.occurrence.id,
                expectedRevision: current.revision,
                sourceVersion: current.sourceVersion,
              },
            },
          )
        ).updateOwnMarketPacking,
      );
    },
  };
}
export type PackingApi = ReturnType<typeof createPackingApi>;
