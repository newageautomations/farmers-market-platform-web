export interface AgreementPolicy {
  id: string;
  title: string;
  kind: string;
  draft?: string;
  required: boolean;
  affects_readiness: boolean;
  automatic: boolean;
  stage: string;
  due_on: string | null;
  revision: number;
  current_version: number | null;
  archived: boolean;
  market_name: string;
}
export interface AgreementListItem extends AgreementPolicy {
  assignment_id: string | null;
  version_id: string | null;
  assigned_version: number | null;
  acknowledged_at: string | null;
  assigned_count: number;
}
export interface AgreementAssignment {
  id: string;
  vendor_id: number;
  vendor_name: string;
  version_id: string;
  version: number;
  acknowledged_at: string | null;
  actor_id: number | null;
}
export interface AgreementVersion {
  id: string;
  number: number;
  title: string;
  hash: string;
  published_at: string;
  content?: string;
}
export interface AgreementDetail {
  policy: AgreementPolicy;
  version: AgreementVersion | null;
  versions: AgreementVersion[];
  assignments: AgreementAssignment[];
  history: Array<{
    id: string;
    vendor_name: string;
    version: number;
    actor_id: number;
    acknowledged_at: string;
    hash: string;
  }>;
  hasMore: boolean;
}
export interface ComplianceCatalog {
  documentTemplates: Array<{
    title: string;
    category: string;
    description: string;
    instructions: string;
    applicability: string;
    purpose: string;
    expirationRelevant: boolean;
  }>;
  agreementTemplates: Array<{
    title: string;
    kind: string;
    content: string;
    limitation: string;
  }>;
  guidance: Array<{
    id: string;
    jurisdiction: string;
    topic: string;
    summary: string;
    sourceName: string;
    sourceUrl: string;
    verifiedOn: string;
    limitations: string;
    category: string;
  }>;
  coverage: string[];
  limitation: string;
}
export interface ComplianceReport {
  acknowledgments?: {
    assigned: number;
    acknowledged: number;
    outstanding: number;
  };
  items: Array<Record<string, string | number | boolean | null>>;
  total: number;
  columns: string[];
  counts?: {
    total: number;
    ready: number;
    incomplete: number;
    pending: number;
    unknown: number;
  };
  context: string;
  generatedAt: string;
  exportLimit: number;
  csv?: string;
  dates: { start: string; end: string; historical: boolean };
}
export interface UpcomingCompliance {
  items: Array<{
    id: number;
    market_id: number;
    market_name: string;
    starts_on: string;
    ends_on: string;
    timezone: string;
    forecast: ComplianceReport['items'][number] | null;
  }>;
  hasMore: boolean;
}
export interface ComplianceExceptions {
  items: Array<{
    id: string;
    assignment_id: string;
    vendor_name: string;
    title: string;
    starts_on: string;
    ends_on: string;
    reason: string;
    actor_id: number;
    created_at: string;
    revoked_at: string | null;
    revocation_reason: string | null;
  }>;
  hasMore: boolean;
}
