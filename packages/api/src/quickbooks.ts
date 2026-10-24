export interface QuickBooksSettings {
  sources: string[];
  mappings: Record<string, string>;
  active: boolean;
  sales?: {
    itemId: string;
    customerId: string;
    taxCodeId: string;
    vendorResponsible: boolean;
  };
}
export interface QuickBooksSalesMappings {
  enabled: boolean;
  items: Array<{
    Id: string;
    Name: string;
    Active: boolean;
    Type: string;
    Taxable: boolean;
    IncomeAccountRef?: { value: string };
  }>;
  customers: Array<{
    Id: string;
    Name: string;
    Active: boolean;
    Taxable: boolean;
  }>;
  codes: Array<{ Id: string; Name: string; Active: boolean; Taxable: boolean }>;
}
export interface QuickBooksAmounts {
  merchandise: number;
  discount: number;
  tax: number;
  payment: number;
}
export interface QuickBooksStatus {
  environment: 'sandbox';
  configured: boolean;
  kind: 'VENDOR' | 'MARKET';
  status: string;
  realm: string | null;
  company: string | null;
  settings: QuickBooksSettings;
  lastSuccess: string | null;
  automation?: {
    state?:
      | 'OFF'
      | 'AWAITING_CONSENT'
      | 'RECONNECT'
      | 'REVIEW'
      | 'RETRY'
      | 'BLOCKED'
      | 'ON';
    enabled: boolean;
    since: string | null;
    lastCheck: string | null;
    error: string | null;
  };
  counts: Array<{ status: string; count: number }>;
}
/** Native receipt settings remain stored for historical intents; new sales use journals. */
export interface QuickBooksAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  TaxAccount?: boolean;
  TaxAgencyRef?: unknown;
  AgencyRef?: unknown;
  Active: boolean;
}
export interface QuickBooksItem {
  id: string;
  date: string;
  source: string;
  status: string;
  reason: string;
  payload?: unknown;
  entityType?: string;
  amounts?: QuickBooksAmounts;
  adjustment?: QuickBooksAdjustment;
}
export interface QuickBooksAdjustment {
  kind: 'REFUND' | 'EXPENSE_CORRECTION' | 'EXPENSE_VOID';
  original: {
    recordId: string;
    eventId: string;
    entityType: string;
    entityId: string;
    date: string;
  };
  previous?: { recordId: string; entityId: string };
  orderId?: string;
  refundOperationId?: string;
  originalAmount?: number;
  correctedAmount?: number;
  version?: number;
}
export interface QuickBooksRecord {
  id: string;
  event_id: string;
  source: string;
  event_date: string;
  status: string;
  entity_type: string;
  entity_id: string | null;
  attempts: number;
  error: string;
  realm: string;
  last_attempt: string | null;
  success_at: string | null;
  payload: unknown;
  amounts?: QuickBooksAmounts;
  adjustment?: QuickBooksAdjustment;
}
export interface QuickBooksRange {
  from: string;
  through: string;
  timezone: string;
}
export interface QuickBooksPreview {
  previewToken: string;
  items: QuickBooksItem[];
}
export interface QuickBooksSyncResult {
  completed: boolean;
  created: number;
  reconciled: number;
  failed: number;
  noOp: boolean;
}
export interface QuickBooksApi {
  status(): Promise<QuickBooksStatus>;
  prepareAutomation(): Promise<{ token: string; since: string }>;
  automation(input: {
    enabled: boolean;
    token?: string;
    acknowledgeDuplicates?: boolean;
  }): Promise<unknown>;
  begin(): Promise<{ url: string }>;
  complete(input: {
    state: string;
    code: string;
    realmId: string;
  }): Promise<unknown>;
  accounts(): Promise<QuickBooksAccount[]>;
  salesMappings(): Promise<QuickBooksSalesMappings>;
  save(input: QuickBooksSettings): Promise<unknown>;
  preview(input: QuickBooksRange): Promise<QuickBooksPreview>;
  sync(input: {
    range: QuickBooksRange;
    previewToken: string;
    confirmHistorical: boolean;
  }): Promise<QuickBooksSyncResult>;
  history(offset: number): Promise<QuickBooksRecord[]>;
  disconnect(): Promise<unknown>;
}
