import { randomBytes } from 'node:crypto';
export function syntheticProductionEnvironment() {
  const env: Record<string, string> = {
    APP_ENV: 'production',
    NODE_ENV: 'production',
    FRONTEND_FIXTURE_MODE: 'false',
    COOKIE_SECRET: randomBytes(48).toString('base64url'),
    PLATFORM_ACCOUNT_BRIDGE_KEY: randomBytes(48).toString('base64url'),
    SUPERADMIN_USERNAME: 'identity-regression-superadmin',
    SUPERADMIN_PASSWORD: 'local-identity-regression-only-password',
    API_ORIGIN: 'https://api.platform.localhost:4343',
    ADMIN_ORIGIN: 'https://admin.platform.localhost:4341',
    PLATFORM_ACCOUNT_ORIGIN: 'https://auth.platform.localhost:4340',
    PLATFORM_STOREFRONT_LOCAL_PORT: '4340',
    CORS_ORIGINS: 'https://admin.platform.localhost:4341',
    COMMUNICATION_FINGERPRINT_KEY: randomBytes(48).toString('base64url'),
    SHOP_API_URL: 'https://api.platform.localhost:4343/shop-api',
    PUBLIC_ADMIN_API_URL: 'https://api.platform.localhost:4343/admin-api',
    ASSET_URL_PREFIX: 'https://api.platform.localhost:4343/assets/',
    DB_TRANSPORT_POLICY: 'plaintext-private',
    DB_NAME: 'vendure_test_build_only',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_SCHEMA: 'public',
    DB_POOL_MAX: '5',
    VENDURE_DISABLE_TELEMETRY: 'true',
    TRUSTED_PROXY_CIDRS: 'disabled',
    ENABLE_LOCAL_VERIFIED_CHECKOUT: 'false',
    ENABLE_LOCAL_REFUNDS: 'false',
    ENABLE_PAID_ATTRIBUTION: 'true',
    REFUND_POLICY_VERSION: 'test-unit-refunds-v1',
    ALLOW_VENDOR_REFUND_REQUESTS: 'false',
    ALLOW_REFUND_UNFULFILLED_CANCELLATION: 'false',
    REFUND_SHIPPING_SHARES: 'false',
    ACCOUNT_EMAIL_ENABLED: 'false',
    STRIPE_ENABLED: 'false',
    SAAS_BILLING_ENABLED: 'false',
    POS_ALLOW_NETWORK: 'false',
    COMMUNICATIONS_ENABLED: 'false',
    COMMUNICATION_ALLOW_NETWORK: 'false',
    SAAS_BILLING_ALLOW_NETWORK: 'false',
  };
  // Empty optional credentials stop dotenv from adopting any configured real provider values.
  for (const key of [
    'RESEND_API_KEY',
    'RESEND_FROM_TRANSACTIONAL',
    'RESEND_FROM_MARKETING',
    'RESEND_WEBHOOK_SECRET',
    'RESEND_CONFIG_VERSION',
    'RESEND_ACCOUNT_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY',
    'TWILIO_API_SECRET',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_MESSAGING_SERVICE_SID',
    'TWILIO_STATUS_CALLBACK_URL',
    'TWILIO_CONFIG_VERSION',
    'STRIPE_TEST_SECRET_KEY',
    'STRIPE_TEST_CLIENT_ID',
    'STRIPE_TEST_REDIRECT_URI',
    'STRIPE_TEST_PLATFORM_WEBHOOK_SECRETS',
    'STRIPE_TEST_CONNECTED_WEBHOOK_SECRETS',
    'SAAS_STRIPE_TEST_SECRET_KEY',
    'SAAS_STRIPE_TEST_WEBHOOK_SECRET',
    'SAAS_STRIPE_TEST_ACCOUNT_KEY',
    'POS_PROVIDER_CONFIGURATION',
    'POS_CREDENTIAL_KEYRING',
  ])
    env[key] = '';
  return env as Record<string, string> & {
    API_ORIGIN: string;
    ADMIN_ORIGIN: string;
    PLATFORM_ACCOUNT_ORIGIN: string;
    PUBLIC_ADMIN_API_URL: string;
    SHOP_API_URL: string;
    COOKIE_SECRET: string;
    PLATFORM_ACCOUNT_BRIDGE_KEY: string;
    SUPERADMIN_USERNAME: string;
    SUPERADMIN_PASSWORD: string;
  };
}
