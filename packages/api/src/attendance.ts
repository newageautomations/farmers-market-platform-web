import {
  VendorSelfCheckInDocument as selfCheckIn,
  MarketAttendanceDocument as managerRead,
  VendorMarketDayAttendanceDocument as vendorRead,
  AttendanceCommandDocument as command,
} from './generated/admin';
import { AppError } from './errors';
import { transport, type TransportOptions } from './transport';
export type AttendanceStatus =
  'AWAITING' | 'CHECKED_IN' | 'EXCUSED' | 'NO_SHOW';
export interface AttendanceRow {
  id: number;
  occurrenceId: number;
  vendorId: number | null;
  directoryId: number | null;
  revision?: number;
  canSelfCheckIn?: boolean;
  checkInSource?: 'manager' | 'vendor' | null;
  status: AttendanceStatus;
  expected: boolean;
  snapshot: {
    marketName: string;
    businessName: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    venue: string;
    booth: string | null;
    bookingStatus: string;
  };
  checkedInAt: string | null;
  checkedInBy?: number | null;
  note?: string;
  finalizedAt: string | null;
  occurrenceStatus: string;
  audit?: Array<{
    id: number;
    createdAt: string;
    actorId: number;
    action: string;
    detail: {
      reason: string;
      before: { status: AttendanceStatus; note: string };
      after: { status: AttendanceStatus; note: string };
    };
  }>;
}
export interface AttendanceFilter {
  occurrenceId?: number;
  vendorId?: number;
  directoryId?: number;
  from?: string;
  through?: string;
  status?: string;
  skip?: number;
  take?: number;
}
export interface AttendancePage {
  items: AttendanceRow[];
  totalItems: number;
  counts: Record<string, number> | null;
  session: {
    revision: number;
    finalizedAt: string | null;
    finalizedBy: number | null;
    finalCounts: Record<string, number> | null;
  } | null;
  occurrence: {
    status: string;
    endsAt: string;
    startsAt: string;
    timezone: string;
  } | null;
  serverNow: string;
}
export interface AttendanceCommand {
  action: 'UPDATE' | 'CORRECT' | 'FINALIZE';
  occurrenceId: number;
  id?: number;
  expectedRevision: number;
  status?: AttendanceStatus;
  note?: string;
  reason?: string;
}
function page(value: unknown): AttendancePage {
  if (
    !value ||
    typeof value !== 'object' ||
    !('items' in value) ||
    !Array.isArray(value.items) ||
    !('totalItems' in value) ||
    !Number.isInteger(value.totalItems)
  )
    throw new AppError('graphql');
  return value as AttendancePage;
}
export function createAttendanceApi(options: TransportOptions) {
  const execute = transport('admin', options);
  return {
    read: async (input: AttendanceFilter = {}) =>
      page(
        (await execute({ api: 'admin', document: managerRead }, { input }))
          .ownMarketAttendance,
      ),
    vendor: async (input: AttendanceFilter = {}) =>
      page(
        (await execute({ api: 'admin', document: vendorRead }, { input }))
          .ownVendorAttendance,
      ),
    selfCheckIn: async (occurrenceId: number, expectedRevision: number) =>
      (
        await execute(
          { api: 'admin', document: selfCheckIn },
          { occurrenceId, expectedRevision },
        )
      ).vendorSelfCheckIn,
    command: async (input: AttendanceCommand) =>
      (await execute({ api: 'admin', document: command }, { input }))
        .marketAttendanceCommand,
  };
}
export type AttendanceApi = ReturnType<typeof createAttendanceApi>;
