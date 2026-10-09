import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
import {
  OwnMarketOperationsDocument,
  MarketOperationsCommandDocument,
  OwnVendorBoothAssignmentsDocument,
} from './generated/admin';
import {
  PublicMarketApplicationDocument,
  PublicMarketOccurrenceMapDocument,
  SubmitMarketApplicationDocument,
} from './generated/shop';

export type OperationsSection =
  'APPLICATIONS' | 'DIRECTORY' | 'LAYOUTS' | 'ASSIGNMENTS' | 'BILLING' | 'DAY';
export type OperationsAction =
  | 'CREATE_APPLICATION'
  | 'SAVE_APPLICATION'
  | 'CLONE_APPLICATION'
  | 'PUBLISH_APPLICATION'
  | 'RETIRE_APPLICATION'
  | 'REVIEW_APPLICATION'
  | 'ACCEPT_ASSIGN'
  | 'SAVE_DIRECTORY'
  | 'SAVE_RENTAL'
  | 'CREATE_LAYOUT'
  | 'SAVE_LAYOUT'
  | 'CLONE_LAYOUT'
  | 'PUBLISH_LAYOUT'
  | 'SET_PLAN'
  | 'APPROVE_OCCURRENCE'
  | 'ASSIGN'
  | 'COPY_ASSIGNMENTS'
  | 'PUBLISH_MAP'
  | 'ISSUE_INVOICE'
  | 'VOID_REISSUE'
  | 'RECORD_PAYMENT'
  | 'DAY_UPDATE'
  | 'CLOSE_DAY';
export const applicationQuestionTypes = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'BOOLEAN',
  'NUMBER',
  'SINGLE_SELECT',
  'DROPDOWN',
  'MULTI_SELECT',
  'DATE',
  'TIME',
  'EMAIL',
  'PHONE',
  'URL',
  'INFO',
] as const;
export type QuestionType = (typeof applicationQuestionTypes)[number];
export interface ApplicationQuestion {
  id: string;
  semantic?: string;
  section: string;
  label: string;
  help: string;
  type: QuestionType;
  required: boolean;
  hidden: boolean;
  options: string[];
}
export interface ApplicationDefinition {
  sections: string[];
  questions: ApplicationQuestion[];
  occurrenceIds: number[];
  rentalIds: number[];
}
export interface MapElement {
  id: string;
  areaId: string;
  type:
    'SPACE' | 'RECTANGLE' | 'CIRCLE' | 'TRIANGLE' | 'LINE' | 'TEXT' | 'IMAGE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  text: string;
  fill: string;
  imageUrl?: string;
}
export interface MapDefinition {
  pixelsPerFoot: number;
  areas: Array<{ id: string; name: string }>;
  elements: MapElement[];
}
export interface SpaceDetails {
  label: string;
  widthFeet: number;
  depthFeet: number;
  spaceType: string;
  description: string;
  amenities: string[];
  feeMinor: number;
  currency: string;
  preferredDirectoryId: number | null;
  managerNotes: string;
}
export interface RentalDetails {
  name: string;
  description: string;
  enabled: boolean;
  priceMinor: number;
  currency: string;
  defaultQuantity: number;
  maxQuantity: number;
  capacity: number | null;
  requiredAmenity: string | null;
  sortOrder: number;
}
export interface ApplicantContact {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  description: string;
  category: string;
}
export interface RentalSnapshot {
  optionId: number;
  quantity: number;
  unitMinor: number;
  currency: string;
  name: string;
  requiredAmenity: string | null;
}
export interface OperationsRecord {
  id: number;
  revision: number;
  marketId: number;
}
export interface ApplicationTemplate extends OperationsRecord {
  name: string;
  slug: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'RETIRED';
  advertised: boolean;
}
export interface ApplicationVersion extends OperationsRecord {
  templateId: number;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  definition: ApplicationDefinition;
}
export interface ApplicationSubmission extends OperationsRecord {
  status: string;
  applicant: ApplicantContact;
  answers: Record<string, unknown>;
  definitionSnapshot: ApplicationDefinition;
  requestedOccurrenceIds: number[];
  approvedOccurrenceIds: number[];
  rentalRequests: RentalSnapshot[];
  managerNotes: string;
  directoryId: number | null;
  requirements: {
    widthFeet: number;
    depthFeet: number;
    electricity: boolean;
    vehicle: boolean;
    foodTruck: boolean;
  };
}
export interface DirectoryEntry extends OperationsRecord {
  contact: ApplicantContact;
  kind: 'EXTERNAL' | 'PLATFORM_LINKED';
  linkedVendorId: number | null;
  managerNotes: string;
}
export interface RentalOption extends OperationsRecord {
  details: RentalDetails;
}
export interface Layout extends OperationsRecord {
  name: string;
}
export interface LayoutVersion extends OperationsRecord {
  layoutId: number;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  definition: MapDefinition;
}
export interface MarketSpace extends OperationsRecord {
  layoutVersionId: number;
  elementId: string;
  details: SpaceDetails;
}
export interface OccurrencePlan extends OperationsRecord {
  occurrenceId: number;
  layoutVersionId: number;
  state: 'DRAFT' | 'PUBLISHED';
  operationsComplete: boolean;
  publicInstructions: string;
}
export interface OccurrenceApproval extends OperationsRecord {
  occurrenceId: number;
  directoryId: number;
  submissionId: number | null;
  checkIn: 'CHECKED_IN' | 'NOT_CHECKED_IN';
  attendance:
    | 'ATTENDED'
    | 'APPROVED_ABSENCE'
    | 'UNAPPROVED_ABSENCE'
    | 'NO_SHOW'
    | 'NOT_RECORDED';
  managerNotes: string;
}
export interface SpaceAssignment extends OperationsRecord {
  occurrenceId: number;
  spaceId: number;
  directoryId: number;
  approvalId: number;
  spaceSnapshot: SpaceDetails;
  businessSnapshot: Pick<
    ApplicantContact,
    'businessName' | 'description' | 'category'
  >;
}
export interface RentalAllocation extends OperationsRecord {
  assignmentId: number;
  occurrenceId: number;
  optionId: number;
  quantity: number;
  snapshot: RentalSnapshot;
}
export interface BoothInvoice extends OperationsRecord {
  assignmentId: number;
  occurrenceId: number;
  directoryId: number;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';
  billingStatus?:
    'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'PAST_DUE' | 'COMPLIMENTARY';
  lines: Array<{
    description: string;
    quantity: number;
    unitMinor: number;
    lineMinor: number;
    currency: string;
  }>;
  currency: string;
  totalMinor: number;
  paidMinor: number;
  dueAt: string | null;
  recipientSnapshot: ApplicantContact;
}
export interface MarketOperationsData {
  selectedOccurrenceId?: number | null;
  marketId: number;
  providerState: 'NOT_CONFIGURED';
  fundsFlowPolicy: 'NOT_CONFIGURED';
  occurrences: Array<{
    id: number;
    startsAt: string;
    endsAt: string;
    venue: string;
    status: string;
  }>;
  templates?: ApplicationTemplate[];
  versions?: ApplicationVersion[];
  submissions?: ApplicationSubmission[];
  directory?: DirectoryEntry[];
  rentals?: RentalOption[];
  eligibleVendors?: Array<{ id: number; name: string; slug: string }>;
  layouts?: Layout[];
  layoutVersions?: LayoutVersion[];
  spaces?: MarketSpace[];
  plans?: OccurrencePlan[];
  assignments?: SpaceAssignment[];
  approvals?: OccurrenceApproval[];
  allocations?: RentalAllocation[];
  invoices?: BoothInvoice[];
  daySummary?: {
    expected: number;
    assigned: number;
    unassigned: number;
    checkedIn: number;
    notCheckedIn: number;
    attendance: Record<string, number>;
    rentalQuantities: Record<string, number>;
    notes: number;
  };
  billingSummary?: {
    paid: number;
    open: number;
    draft: number;
    complimentary: number;
    pastDue: number;
    byCurrency: Record<
      string,
      {
        expectedMinor: number;
        collectedMinor: number;
        waivedMinor: number;
        outstandingMinor: number;
      }
    >;
  };
}
export interface PublicOccurrenceMap {
  occurrenceId: number;
  publicInstructions: string;
  definition: MapDefinition;
  spaces: Array<{
    elementId: string;
    label: string;
    widthFeet: number;
    depthFeet: number;
    amenities: string[];
    vendor: Pick<
      ApplicantContact,
      'businessName' | 'description' | 'category'
    > | null;
  }>;
}
export interface PublicApplication {
  slug: string;
  name: string;
  versionId: number;
  definition: ApplicationDefinition;
  occurrences: Array<{
    id: number;
    startsAt: string;
    endsAt: string;
    venue: string;
  }>;
  rentals: Array<{
    id: number;
    name: string;
    priceMinor: number;
    currency: string;
    maxQuantity: number;
    defaultQuantity: number;
  }>;
}
export interface VendorBoothAssignment {
  occurrenceId: number;
  startsAt: string;
  space: {
    label: string;
    widthFeet: number;
    depthFeet: number;
    amenities: string[];
  };
  elementId: string;
  map: PublicOccurrenceMap | null;
  publicInstructions: string;
  rentals: RentalSnapshot[];
  invoices: Array<{
    id: number;
    status: string;
    currency: string;
    totalMinor: number;
    paidMinor: number;
  }>;
}
export interface OperationsCommand {
  action: OperationsAction;
  id?: number;
  expectedRevision?: number;
  data: Record<string, unknown>;
}
function object<T>(value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AppError('graphql');
  return value as T;
}
export function createMarketOperationsApi(options: TransportOptions) {
  const execute = transport('admin', options);
  return {
    read: async (section: OperationsSection, occurrenceId?: number) =>
      object<MarketOperationsData>(
        (
          await execute(
            { api: 'admin', document: OwnMarketOperationsDocument },
            { section, occurrenceId: occurrenceId ?? null },
          )
        ).ownMarketOperations,
      ),
    command: async (input: OperationsCommand) =>
      (
        await execute(
          { api: 'admin', document: MarketOperationsCommandDocument },
          {
            input: {
              ...input,
              id: input.id ?? null,
              expectedRevision: input.expectedRevision ?? null,
            },
          },
        )
      ).marketOperationsCommand,
    vendorAssignments: async () => {
      const value = (
        await execute(
          { api: 'admin', document: OwnVendorBoothAssignmentsDocument },
          {},
        )
      ).ownVendorBoothAssignments;
      if (!Array.isArray(value)) throw new AppError('graphql');
      return value as VendorBoothAssignment[];
    },
  };
}
export type MarketOperationsApi = ReturnType<typeof createMarketOperationsApi>;
export function createPublicMarketOperationsApi(options: TransportOptions) {
  const execute = transport('shop', options);
  return {
    application: async (slug?: string) =>
      object<PublicApplication>(
        (
          await execute(
            { api: 'shop', document: PublicMarketApplicationDocument },
            { slug: slug ?? null },
          )
        ).publicMarketApplication,
      ),
    map: async (occurrenceId: number) =>
      object<PublicOccurrenceMap>(
        (
          await execute(
            { api: 'shop', document: PublicMarketOccurrenceMapDocument },
            { occurrenceId },
          )
        ).publicMarketOccurrenceMap,
      ),
    submit: async (input: {
      slug: string;
      versionId: number;
      answers: Record<string, unknown>;
      occurrenceIds: number[];
      rentals: Array<{ optionId: number; quantity: number }>;
      idempotencyKey: string;
    }) =>
      object<{ submitted: boolean }>(
        (
          await execute(
            { api: 'shop', document: SubmitMarketApplicationDocument },
            { input },
          )
        ).submitMarketApplication,
      ),
  };
}
