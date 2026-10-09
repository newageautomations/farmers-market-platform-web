// Independent test servers preserve the user's occupied development ports.
export const testPortOffset = Number(
  process.env.FRONTEND_TEST_PORT_OFFSET ?? 0,
);
if (
  !Number.isInteger(testPortOffset) ||
  testPortOffset < 0 ||
  testPortOffset > 60000
)
  throw new Error('Invalid frontend test port offset');
export const reuseStorefront =
  process.env.FRONTEND_TEST_REUSE_STOREFRONT === 'true';
export const testPort = (port: number) =>
  port === 4321 && reuseStorefront ? port : port + testPortOffset;
export const testUrl = (port: number, host = '127.0.0.1') =>
  `http://${host}:${testPort(port)}`;
export const evidenceRoot =
  process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5';
