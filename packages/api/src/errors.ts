import { applicationErrorMessages } from './application-rules';

const catalogMessages: Record<string, string> = {
  INVALID_REWARD_FIELD:
    'The reward form sent an unsupported field. Your progress is preserved. Return to Reward details and try saving again.',
  INVALID_REWARD_CONFIGURATION:
    'Check Reward details for the name, reward value and eligible product, then check Redemption rules for points, limits and dates.',
  REWARD_PRODUCT_UNAVAILABLE:
    'The selected product is disabled or unavailable. Return to Reward details and choose an enabled product and variant.',
  REWARD_NOT_EDITABLE:
    'This reward can no longer be edited. Close the editor and check its current status.',
  INVALID_VARIANT_SLUG:
    'Use lowercase letters, numbers and hyphens for the variant slug.',
  VARIANT_SLUG_ALREADY_EXISTS:
    'Another variant of this product already uses that slug. Choose a different slug.',
  PRODUCT_CATEGORY_REQUIRED:
    'Select a valid leaf category before enabling or publishing this product. If classification could not be loaded, retry the classification read first.',
  PRODUCT_CLASSIFICATION_PENDING:
    'Wait for category and tag checks to finish before saving.',
};
export type ErrorKind =
  | 'network'
  | 'graphql'
  | 'authentication'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'unavailable'
  | 'not-found'
  | 'entitlement'
  | 'unknown';
export const safeMessages: Record<ErrorKind, string> = {
  network: 'The connection was interrupted. Please try again.',
  graphql: 'The request could not be completed.',
  authentication: 'Sign in to continue.',
  forbidden: 'You do not have access to this area.',
  validation: 'Please check your information and try again.',
  conflict: 'This information has changed. Refresh and try again.',
  unavailable: 'The service is unavailable. Please try again later.',
  'not-found': 'This storefront could not be found.',
  entitlement: 'This optional feature is unavailable.',
  unknown: 'Something went wrong. Please try again.',
};
const taxMessages: Record<string, string> = {
  BOUNDED_SCHEDULE_RANGE_REQUIRED:
    'Choose a valid bounded date range. Recurring rules can cover up to one year.',
  SCHEDULE_RANGE_TOO_LARGE:
    'Choose a shorter range. Recurring rule previews support up to 128 market dates.',
  SCHEDULE_CONFIRM_REQUIRED:
    'Review and confirm the proposed scheduling change.',
  SCHEDULE_PREVIEW_CHANGED:
    'Scheduling information changed. Review a fresh preview before confirming.',
  RECURRING_RULE_CONFLICT:
    'Another recurring rule already covers this vendor or physical booth in the selected range.',
  RESOLVE_RULE_CONFLICTS_FIRST:
    'Resolve the blocked changes to existing assignments before changing this recurring rule.',
  RULE_VENDOR_IMMUTABLE:
    'Choose the existing rule’s vendor, or create a separate recurring assignment.',
  BOOTH_ABSENT_FROM_LAYOUT:
    'This booth does not exist in the selected date’s layout.',
  RESOLVE_ISSUED_INVOICES_FIRST:
    'Resolve issued or paid invoices through Booth billing before releasing this assignment or cancelling participation. No refund is automatic.',
  EXPLICIT_DRAFT_INVOICE_VOID_REQUIRED:
    'A draft invoice must be explicitly voided before releasing this booth. A manager with billing permission can confirm that option.',
  HISTORICAL_DATE_DECISION_IMMUTABLE:
    'This market date has started or attendance is frozen. Use the existing attendance correction workflow.',
  CONFIRMED_DATE_REQUIRED:
    'Confirm the vendor’s participation for this market date before assigning a booth.',
  BOOTH_ALREADY_ASSIGNED:
    'This booth is occupied. Refresh the schedule and review its current assignment.',
  BOOTH_SIZE_CONFLICT:
    'This booth does not meet the vendor’s space requirements.',
  BOOTH_AMENITY_CONFLICT:
    'This booth does not provide the vendor’s required amenities.',
  RENTAL_CAPACITY_CONFLICT:
    'The requested rentals exceed capacity for this market date.',
  PLATFORM_PARTICIPATION_UNAVAILABLE:
    'This vendor needs approved market membership and confirmed participation for this date.',
  PHYSICAL_BOOTH_IDENTITY_AUTOMATIC:
    'Booth identity is managed automatically. Refresh the layout before saving.',
  PHYSICAL_BOOTH_CONFIRMATION_REQUIRED:
    'Confirm the physical booth identity change before saving.',
  PHYSICAL_BOOTH_ALREADY_IN_LAYOUT:
    'This physical booth already has a representation in this layout. Remove the duplicate before saving.',
  ASSIGNED_BOOTH_IDENTITY_IMMUTABLE:
    'This booth has assignment history. Keep its identity and resolve the replacement separately.',
  ASSIGNED_BOOTH_CANNOT_BE_RETIRED:
    'Resolve active booth assignments before retiring this physical booth.',
  PHYSICAL_BOOTH_RETIRED:
    'This physical booth is retired. Use an active booth or create a new booth.',

  INVALID_PACKING_QUANTITY:
    'Enter a whole number from zero to one million. Reusing packed units cannot exceed the available quantity.',
  PACKING_CHECKLIST_INCOMPLETE:
    'Check every required item before marking this customer packed.',
  PACKING_OCCURRENCE_CANCELLED:
    'This market occurrence is cancelled. Packing cannot be changed.',
  ATTENDANCE_MARKET_NOT_ENDED:
    'Attendance can be finalized after the market ends in its configured time zone.',
  ATTENDANCE_WINDOW_CLOSED:
    'Self check-in is available only during the scheduled market hours.',
  ATTENDANCE_ALREADY_RECORDED:
    'Attendance has already been recorded. Refresh to see the current status.',
  ATTENDANCE_UNRESOLVED:
    'Resolve each awaiting arrival record before finalizing attendance.',
  ATTENDANCE_FINALIZED:
    'Attendance is finalized. Use the correction workflow and enter a reason.',
  ATTENDANCE_NOT_SCHEDULED:
    'This vendor is no longer scheduled for this occurrence. Refresh attendance.',
  OCCURRENCE_CANCELLED:
    'This market occurrence is cancelled. Attendance cannot be changed.',
  OCCURRENCE_NOT_STARTED:
    'Attendance can be recorded once the market occurrence starts.',

  VENDOR_TAX_RATE_REQUIRED:
    'A taxable product has no configured rate. The vendor must set a default, market rate, or product override before checkout.',
  VENDOR_TAX_RATE_INVALID:
    'Enter a tax percentage from 0 to 100 with at most two decimal places.',
  VENDOR_TAX_VERSION_CONFLICT: 'Tax settings changed. Reload and try again.',
};
export class AppError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly code?: string,
  ) {
    super(
      (code &&
        ((code.startsWith('APPLICATION_') && applicationErrorMessages[code]) ||
          taxMessages[code] ||
          catalogMessages[code])) ||
        safeMessages[kind],
    );
    this.name = 'AppError';
  }
}
const codes: Record<string, ErrorKind> = {
  INVALID_REWARD_FIELD: 'validation',
  INVALID_REWARD_CONFIGURATION: 'validation',
  REWARD_PRODUCT_UNAVAILABLE: 'validation',
  REWARD_NOT_EDITABLE: 'conflict',
  INVALID_VARIANT_SLUG: 'validation',
  VARIANT_SLUG_ALREADY_EXISTS: 'validation',
  INVALID_PACKING_QUANTITY: 'validation',
  PACKING_CHECKLIST_INCOMPLETE: 'validation',
  PACKING_OCCURRENCE_CANCELLED: 'validation',
  INVALID_PACKING_ACTION: 'validation',
  ATTENDANCE_MARKET_NOT_ENDED: 'validation',
  ATTENDANCE_WINDOW_CLOSED: 'validation',
  ATTENDANCE_ALREADY_RECORDED: 'conflict',
  ATTENDANCE_UNRESOLVED: 'validation',
  ATTENDANCE_FINALIZED: 'conflict',
  ATTENDANCE_NOT_SCHEDULED: 'validation',
  OCCURRENCE_CANCELLED: 'validation',
  OCCURRENCE_NOT_STARTED: 'validation',

  APPLICATION_CLOSED: 'validation',
  APPLICATION_NOT_YET_OPEN: 'validation',
  APPLICATION_CONDITION_INVALID: 'validation',
  APPLICATION_SCHEDULE_INVALID: 'validation',
  PREORDER_UNAVAILABLE: 'validation',
  NONEMPTY_CONTEXT_SWITCH_DENIED: 'conflict',
  PREORDER_OCCURRENCE_REQUIRED: 'validation',
  VENDOR_TAX_RATE_REQUIRED: 'validation',
  VENDOR_TAX_RATE_INVALID: 'validation',
  VENDOR_TAX_VERSION_CONFLICT: 'conflict',
  QBO_BUSY: 'conflict',
  QBO_PREVIEW_EXPIRED: 'conflict',
  QBO_SETTINGS_INVALID: 'validation',
  QBO_MAPPING_INVALID: 'validation',
  QBO_CONFIRM_REQUIRED: 'validation',
  QBO_ACTIVATION_REQUIRED: 'validation',
  QBO_RANGE_INVALID: 'validation',
  QBO_USE_SMALLER_RANGE: 'validation',
  QBO_CALLBACK_INVALID: 'validation',
  QBO_STATE_INVALID: 'validation',
  QBO_COMPANY_CHANGE_BLOCKED: 'validation',
  QBO_COMPANY_ALREADY_ASSIGNED: 'validation',
  QBO_US_COMPANY_REQUIRED: 'validation',
  QBO_USD_COMPANY_REQUIRED: 'validation',
  QBO_RECONNECT: 'unavailable',
  QBO_NOT_CONFIGURED: 'unavailable',
  QBO_PRODUCTION_DISABLED: 'unavailable',
  QBO_RATE_LIMIT: 'unavailable',
  QBO_NETWORK_UNCERTAIN: 'unavailable',
  QBO_PROVIDER_UNAVAILABLE: 'unavailable',
  QBO_OPERATION_FAILED: 'unavailable',
  FINANCE_INPUT_INVALID: 'validation',
  FINANCE_DATE_INVALID: 'validation',
  FINANCE_RANGE_INVALID: 'validation',
  FINANCE_SCOPE_INVALID: 'validation',
  FINANCE_USE_SHORTER_RANGE: 'validation',
  FINANCE_AMOUNT_OUT_OF_RANGE: 'validation',
  FINANCE_DUPLICATE_KEY: 'conflict',
  FINANCE_VERSION_CONFLICT: 'conflict',
  NOTIFICATION_INPUT_INVALID: 'validation',
  NOTIFICATION_VERSION_CONFLICT: 'conflict',
  DOCUMENT_INPUT_INVALID: 'validation',
  COMPLIANCE_EXPORT_LIMIT: 'validation',
  DOCUMENT_FORMAT_INVALID: 'validation',
  DOCUMENT_TOO_LARGE: 'validation',
  DOCUMENT_SENSITIVE_TYPE_PROHIBITED: 'validation',
  DOCUMENT_SCAN_FAILED: 'unavailable',
  DOCUMENT_MALWARE_DETECTED: 'validation',
  DOCUMENT_SCANNER_BUSY: 'unavailable',
  DOCUMENT_RATE_LIMIT: 'unavailable',
  DOCUMENT_VERSION_CONFLICT: 'conflict',
  DOCUMENT_FILE_UNAVAILABLE: 'validation',
  DOCUMENT_SERVICE_UNAVAILABLE: 'unavailable',
  DOCUMENT_EXPIRED: 'validation',
  DOCUMENT_REQUIREMENT_LIMIT: 'validation',
  DOCUMENT_ASSIGNMENT_LIMIT: 'validation',
  APPLICATION_DOCUMENTS_REQUIRED: 'validation',
  UNAUTHORIZED: 'authentication',
  FORBIDDEN: 'forbidden',
  SHOP_CONTEXT_REQUIRED: 'forbidden',
  MARKET_OCCURRENCE_REQUIRED: 'validation',
  MARKET_COMMERCE_NOT_ENABLED: 'forbidden',
  BAD_USER_INPUT: 'validation',
  INVALID_CREDENTIALS_ERROR: 'authentication',
  NOT_VERIFIED_ERROR: 'authentication',
  ENTITLEMENT_DENIED: 'entitlement',
  VERSION_CONFLICT: 'conflict',
  STALE_DOMAIN_VERSION: 'conflict',
  BOUNDED_SCHEDULE_RANGE_REQUIRED: 'validation',
  SCHEDULE_RANGE_TOO_LARGE: 'validation',
  SCHEDULE_CONFIRM_REQUIRED: 'validation',
  SCHEDULE_PREVIEW_CHANGED: 'validation',
  RECURRING_RULE_CONFLICT: 'validation',
  RESOLVE_RULE_CONFLICTS_FIRST: 'validation',
  RULE_VENDOR_IMMUTABLE: 'validation',
  BOOTH_ABSENT_FROM_LAYOUT: 'validation',
  RESOLVE_ISSUED_INVOICES_FIRST: 'validation',
  EXPLICIT_DRAFT_INVOICE_VOID_REQUIRED: 'validation',
  HISTORICAL_DATE_DECISION_IMMUTABLE: 'validation',
  CONFIRMED_DATE_REQUIRED: 'validation',
  PLATFORM_PARTICIPATION_UNAVAILABLE: 'validation',
  MARKET_OPERATIONS_UNAVAILABLE: 'unavailable',
  MARKET_OPERATIONS_INPUT_INVALID: 'validation',
  PHYSICAL_BOOTH_IDENTITY_AUTOMATIC: 'validation',
  PHYSICAL_BOOTH_CONFIRMATION_REQUIRED: 'validation',
  PHYSICAL_BOOTH_ALREADY_IN_LAYOUT: 'conflict',
  ASSIGNED_BOOTH_IDENTITY_IMMUTABLE: 'conflict',
  ASSIGNED_BOOTH_CANNOT_BE_RETIRED: 'conflict',
  PHYSICAL_BOOTH_RETIRED: 'validation',
  BOOTH_ALREADY_ASSIGNED: 'conflict',
  BOOTH_AMENITY_CONFLICT: 'validation',
  BOOTH_SIZE_CONFLICT: 'validation',
  RENTAL_CAPACITY_CONFLICT: 'conflict',
  CAPACITY_BELOW_COMMITTED_ALLOCATION: 'conflict',
  MULTIPLE_SPACES_REQUIRE_CONFIRMATION: 'validation',
  APPROVED_OCCURRENCE_AND_PLAN_REQUIRED: 'validation',
  APPLICATION_VERSION_CHANGED: 'conflict',
  APPLICATION_REQUIRED_ANSWER: 'validation',
  APPLICATION_DATE_INVALID: 'validation',
  APPLICATION_RATE_LIMIT: 'unavailable',
  MANUAL_PAYMENT_INVALID: 'validation',
  PAYMENT_IDEMPOTENCY_CONFLICT: 'conflict',
  ISSUED_INVOICE_REQUIRES_EXPLICIT_KEEP: 'conflict',
  MARKET_INVOICE_PROVIDER_NOT_CONFIGURED: 'unavailable',
  CONFLICT: 'conflict',
};
export function backendError(code: unknown, status?: number): AppError {
  if (typeof code === 'string' && codes[code])
    return new AppError(codes[code], code);
  if (status === 401) return new AppError('authentication');
  if (status === 403) return new AppError('forbidden');
  if (status === 409) return new AppError('conflict');
  if (status && status >= 500) return new AppError('unavailable');
  return new AppError('graphql');
}
export function safeError(error: unknown) {
  return error instanceof AppError ? error : new AppError('unknown');
}
