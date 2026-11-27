import { applicationErrorMessages } from './application-rules';

const marketGenerationMessages: Record<string, string> = {
  MARKET_GENERATION_INVALID_DATE: 'Enter valid start and end dates.',
  MARKET_GENERATION_INVALID_SELECTION:
    'Choose between one and 20 repeating schedules.',
  MARKET_GENERATION_REVERSED_RANGE:
    'Choose an end date on or after the start date.',
  MARKET_GENERATION_RANGE_TOO_LONG:
    'Choose a shorter date range and try again.',
  MARKET_GENERATION_OUTSIDE_HORIZON:
    'Choose dates closer to today and try again.',
  MARKET_GENERATION_INACTIVE:
    'The market must be active before dates can be generated.',
  MARKET_GENERATION_SCHEDULE_UNAVAILABLE:
    'A selected repeating schedule is no longer available. Reopen Generate occurrences and select the current schedules.',
  MARKET_GENERATION_LOCAL_TIME_EXCEPTION:
    'A schedule time is skipped or repeated during a clock change. Adjust the hours or leave that date out of this run.',
  MARKET_GENERATION_INVALID_SAVED_SCHEDULE:
    'Review the saved schedule dates, hours and market time zone, then try again.',
  MARKET_GENERATION_INVALID_HOURS:
    'Review the schedule hours and make sure the market ends after it starts.',
};

export const marketGenerationValidationCodes = Object.keys(
  marketGenerationMessages,
);

const catalogMessages: Record<string, string> = {
  ...marketGenerationMessages,
  STOREFRONT_ADDRESS_IN_USE:
    'That storefront address is already in use. Choose a different address.',
  STOREFRONT_ADDRESS_INVALID:
    'Use lowercase letters, numbers and single hyphens, up to 63 characters.',
  STOREFRONT_ADDRESS_RESERVED:
    'That address is reserved by the platform. Choose a different address.',
  STOREFRONT_ALREADY_CONFIGURED:
    'A storefront is already enabled for this business. Reload the page.',
  STOREFRONT_ADDRESSES_UNAVAILABLE:
    'Storefront addresses are not available in this environment.',
  VENDOR_TERMS_ACCEPTANCE_REQUIRED:
    'Review and accept the seller terms before placing your order.',
  VENDOR_TERMS_CHANGED:
    'The sellers or purchase terms changed. Review the updated terms and check the box again.',
  INVOICE_FINANCIAL_OPERATION_PENDING:
    'A payment or refund is unresolved. Wait for reconciliation before changing this invoice.',
  REFUND_REQUIRED_BEFORE_REDUCTION:
    'Return and record the excess payment before reducing the invoice below its net settled payments.',
  INVOICE_IDEMPOTENCY_CONFLICT:
    'This request reference already belongs to a different invoice change. Check the invoice history before starting another request.',
  REFUND_EXCEEDS_AVAILABLE_PAYMENT:
    'The refund exceeds the original payment remaining available, or an earlier refund is unresolved.',
  REFUND_ATTESTATION_REQUIRED:
    'Confirm the refund, its actual date and original payment method. Offline funds must already have been returned.',
  INVOICE_CANCELLATION_PENDING:
    'Finish returning the original payments before this cancellation can complete.',
  NON_MONETARY_SETTLEMENT_REQUIRES_REVIEW:
    'This invoice contains a waiver or complimentary settlement. It needs a separate non-monetary correction before cancellation.',

  INVOICE_ONLINE_PAYMENT_PENDING:
    'An online payment is reserved or being verified. Wait for it to resolve before recording a manual payment or replacing the invoice.',
  INVOICE_MARKET_ACCOUNT_NOT_READY:
    'The market must complete Stripe setup before this invoice can be paid online.',
  INVOICE_ORIGINAL_MARKET_ACCOUNT_NOT_READY:
    'The original market payment account is unavailable. Contact the market before making another payment.',
  INVOICE_NOT_PAYABLE:
    'This invoice is not eligible for an online payment. Check its issued status and remaining balance.',
  INVOICE_PAYMENT_PROCESSING:
    'This invoice payment is already being checked. Wait for the original payment result.',
  ONLY_UNPAID_MANUAL_INVOICE_CAN_BE_REPLACED:
    'Only an unpaid invoice without an unresolved online payment can be replaced. Recorded payments require an approved invoice credit policy.',
  ORIGINAL_REFUND_ACCOUNT_AUTHORITY_UNAVAILABLE:
    'The original payment account authority is unavailable. This refund needs operational review.',
  ORIGINAL_STRIPE_CHARGE_OR_FEE_ID_MISSING:
    'The original charge or application fee reference is missing. This refund needs operational review.',
  PREVIOUS_REFUND_RECONCILIATION_REQUIRED:
    'A previous refund is still being reconciled. Wait for its status before requesting another refund.',
  ORIGINAL_UNIT_ALREADY_RESERVED:
    'These purchased units already belong to a refund request. Check the original refund status.',
  CHECKOUT_COMPENSATION_CONFLICT:
    'This payment has checkout recovery activity. Resolve it before requesting another refund.',
  EXTERNAL_OR_MISMATCHED_STRIPE_REFUND_REVIEW_REQUIRED:
    'Stripe has refund activity that needs operational review before another refund can proceed.',

  PREORDER_FEE_REQUOTE_REQUIRED:
    'Your cart changed. Retry checkout to update its totals.',
  ACCOUNT_NOT_READY:
    'A vendor cannot accept online payments yet. The vendor must complete Stripe setup and refresh their payment account status before checkout can continue.',
  OAUTH_RECONCILIATION_REQUIRED:
    'Stripe authorization could not be confirmed. Start a fresh connection with Connect existing Stripe account. The previous authorization will not be submitted again.',
  OAUTH_STATE_ALREADY_USED:
    'This Stripe authorization has already been checked. Refresh the account status or start a fresh connection.',
  OAUTH_STATE_EXPIRED:
    'This Stripe authorization expired. Start a fresh connection with Connect existing Stripe account.',
  VENDOR_PICKUP_COVERAGE_REQUIRED:
    'Select pickup for every vendor to calculate your total.',
  STRIPE_ONBOARDING_NOT_CONFIGURED:
    'Stripe test onboarding is not configured. Ask an administrator to configure the platform identity, test keys and return origin.',
  STRIPE_ACCOUNT_CONFIGURATION_BLOCKED:
    'Stripe did not accept the required account configuration. Ask support to confirm Accounts v2 eligibility. No alternative liability configuration was used.',
  STRIPE_ONBOARDING_UNAVAILABLE:
    'Stripe setup could not be completed. Try resuming setup. The original creation identity is preserved.',
  ONBOARDING_CREATION_REVIEW_REQUIRED:
    'The original account creation needs reconciliation before another account can be created. Ask support to review the attempt.',
  ONBOARDING_STATE_EXPIRED_OR_USED:
    'This setup return has expired or was already checked. Use Continue Stripe setup to obtain a fresh link.',
  ONBOARDING_ACCOUNT_CHANGED:
    'The connected account changed. Return to the original workspace and refresh its status.',
  DISCONNECT_PENDING_OPERATIONS:
    'Resolve pending payments, refunds or reconciliation work before disconnecting Stripe.',
  STRIPE_PLATFORM_MISMATCH:
    'The configured Stripe platform does not match this connection. Ask support to review it.',
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
  CONFIRMED_CANONICAL_PARTICIPATION_REQUIRED:
    'This vendor has not confirmed attendance for this market date. Approve them after they confirm.',
  APPROVED_PLATFORM_MEMBERSHIP_REQUIRED:
    'This vendor needs an approved market membership before it can be approved for a date.',
  PLATFORM_PARTICIPATION_CANCELLED:
    'This vendor cancelled attendance for this market date.',
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

  PREORDER_CONFIGURATION_CHANGED:
    'These fee settings changed. Reload before saving again.',
  PREORDER_CUSTOM_AMOUNT_INVALID:
    'Enter a nonnegative USD amount with at most two decimal places.',
  PREORDER_CUSTOM_AMOUNT_TOO_LARGE:
    'The custom amount exceeds the platform configuration limit.',
  VENDOR_TAX_RATE_REQUIRED:
    'A taxable product has no configured rate. The vendor must set a default, market rate, or product override before checkout.',
  VENDOR_TAX_RATE_INVALID:
    'Enter a tax percentage from 0 to 100 with at most two decimal places.',
  VENDOR_TAX_VERSION_CONFLICT: 'Tax settings changed. Reload and try again.',
  VENDOR_STRIPE_SETUP_REQUIRED: 'This vendor cannot accept online orders right now.',
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
  STOREFRONT_ADDRESS_IN_USE: 'conflict',
  STOREFRONT_ADDRESS_INVALID: 'validation',
  STOREFRONT_ADDRESS_RESERVED: 'validation',
  STOREFRONT_ALREADY_CONFIGURED: 'conflict',
  STOREFRONT_ADDRESSES_UNAVAILABLE: 'unavailable',
  VENDOR_TERMS_ACCEPTANCE_REQUIRED: 'validation',
  VENDOR_TERMS_CHANGED: 'conflict',
  VENDOR_STRIPE_SETUP_REQUIRED: 'conflict',
  PREORDER_FEE_REQUOTE_REQUIRED: 'conflict',
  ACCOUNT_NOT_READY: 'validation',
  OAUTH_RECONCILIATION_REQUIRED: 'conflict',
  OAUTH_STATE_ALREADY_USED: 'conflict',
  OAUTH_STATE_EXPIRED: 'conflict',
  VENDOR_PICKUP_COVERAGE_REQUIRED: 'validation',
  STRIPE_ONBOARDING_NOT_CONFIGURED: 'unavailable',
  STRIPE_ACCOUNT_CONFIGURATION_BLOCKED: 'unavailable',
  STRIPE_ONBOARDING_UNAVAILABLE: 'unavailable',
  ONBOARDING_CREATION_REVIEW_REQUIRED: 'conflict',
  ONBOARDING_STATE_EXPIRED_OR_USED: 'conflict',
  ONBOARDING_ACCOUNT_CHANGED: 'conflict',
  DISCONNECT_PENDING_OPERATIONS: 'conflict',
  STRIPE_PLATFORM_MISMATCH: 'conflict',
  PREORDER_CONFIGURATION_CHANGED: 'conflict',
  PREORDER_CUSTOM_AMOUNT_INVALID: 'validation',
  PREORDER_CUSTOM_AMOUNT_TOO_LARGE: 'validation',
  PREORDER_CONFIGURATION_INVALID: 'validation',
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
  DOCUMENT_EXPIRATION_REQUIRED: 'validation',
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
  CONFIRMED_CANONICAL_PARTICIPATION_REQUIRED: 'validation',
  APPROVED_PLATFORM_MEMBERSHIP_REQUIRED: 'validation',
  PLATFORM_PARTICIPATION_CANCELLED: 'validation',
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
  INVOICE_FINANCIAL_OPERATION_PENDING: 'conflict',
  REFUND_REQUIRED_BEFORE_REDUCTION: 'validation',
  INVOICE_IDEMPOTENCY_CONFLICT: 'conflict',
  REFUND_EXCEEDS_AVAILABLE_PAYMENT: 'validation',
  REFUND_ATTESTATION_REQUIRED: 'validation',
  INVOICE_CANCELLATION_PENDING: 'conflict',
  NON_MONETARY_SETTLEMENT_REQUIRES_REVIEW: 'conflict',
  MANUAL_PAYMENT_INVALID: 'validation',
  PAYMENT_IDEMPOTENCY_CONFLICT: 'conflict',
  ISSUED_INVOICE_REQUIRES_EXPLICIT_KEEP: 'conflict',
  MARKET_INVOICE_PROVIDER_NOT_CONFIGURED: 'unavailable',
  CONFLICT: 'conflict',
};
export function backendError(code: unknown, status?: number): AppError {
  if (typeof code === 'string' && Object.hasOwn(marketGenerationMessages, code))
    return new AppError('validation', code);
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
