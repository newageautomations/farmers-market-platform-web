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
    super((code && taxMessages[code]) || safeMessages[kind]);
    this.name = 'AppError';
  }
}
const codes: Record<string, ErrorKind> = {
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
  MARKET_OPERATIONS_UNAVAILABLE: 'unavailable',
  MARKET_OPERATIONS_INPUT_INVALID: 'validation',
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
