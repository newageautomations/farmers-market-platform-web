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
export class AppError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly code?: string,
  ) {
    super(safeMessages[kind]);
    this.name = 'AppError';
  }
}
const codes: Record<string, ErrorKind> = {
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
