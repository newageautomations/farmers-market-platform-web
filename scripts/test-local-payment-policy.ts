import assert from 'node:assert/strict';
import { assertLocalTestPayments } from '../../farmers-market-platform/src/plugins/marketplace-commerce/commerce/local-test-payment-policy';
const base={LOCAL_TEST_PAYMENTS_ENABLED:'true',APP_ENV:'dev',NODE_ENV:'development',DB_HOST:'localhost',DB_NAME:'vendure_demo_market_ops',DB_SCHEMA:'public',DB_PORT:'5432',ENABLE_PAID_ATTRIBUTION:'true',REFUND_POLICY_VERSION:'local-demo-refunds-v1',ALLOW_VENDOR_REFUND_REQUESTS:'true',ALLOW_REFUND_UNFULFILLED_CANCELLATION:'false',REFUND_SHIPPING_SHARES:'false',STRIPE_ENABLED:'false'};
const onboarding={...base,DEMO_STRIPE_CONNECT_TEST:'true',STRIPE_ACCOUNT_ONBOARDING_ENABLED:'true',STRIPE_TEST_SECRET_KEY:'sk_test_offline',STRIPE_TEST_CLIENT_ID:'ca_fixture',STRIPE_TEST_PLATFORM_ACCOUNT_ID:'acct_fixture',STRIPE_SETTINGS_ORIGIN:'http://localhost:4322',STRIPE_TEST_REDIRECT_URI:'http://localhost:3000/payments/stripe/oauth/callback'};
assertLocalTestPayments(base);assertLocalTestPayments(onboarding);
const invoices = {...onboarding, STRIPE_TEST_INVOICE_ENABLED:'true',STRIPE_TEST_INVOICE_COLLECTION_AUTHORIZED:'true',STRIPE_TEST_INVOICE_FEE_POLICY:'booth-invoice-sandbox-5pct-v1',STRIPE_TEST_INVOICE_FEE_TAX_POLICY:'EXPLICIT_NO_FEE_TAX_TEST',STRIPE_TEST_PUBLISHABLE_KEY:'pk_test_fixture'};
assertLocalTestPayments(invoices);
for(const change of [{STRIPE_TEST_INVOICE_COLLECTION_AUTHORIZED:'false'},{STRIPE_TEST_INVOICE_FEE_POLICY:'unapproved'},{STRIPE_TEST_INVOICE_FEE_TAX_POLICY:'unapproved'},{STRIPE_TEST_PUBLISHABLE_KEY:'pk_live_no'},{DEMO_STRIPE_CONNECT_TEST:'false'}]) assert.throws(()=>assertLocalTestPayments({...invoices,...change}));
for(const change of [{STRIPE_ENABLED:'true'},{STRIPE_TEST_SECRET_KEY:'sk_live_bad'},{STRIPE_LIVE_SECRET_KEY:'sk_live_bad'},{STRIPE_SETTINGS_ORIGIN:'https://example.com'},{DEMO_STRIPE_CONNECT_TEST:'false'},{POS_ALLOW_NETWORK:'true'}]) assert.throws(()=>assertLocalTestPayments({...onboarding,...change}));
console.log('PASS local payments and test onboarding coexist; live/collection/foreign-provider configurations remain blocked');

