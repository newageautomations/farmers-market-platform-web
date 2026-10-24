/* Local registry audit. No server connection or database access. */
/* eslint-disable @typescript-eslint/no-require-imports */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { writeFileSync } = require('node:fs');
const backend = resolve('../farmers-market-platform');
const backendRequire = createRequire(resolve(backend, 'package.json'));
backendRequire('ts-node').register({
  project: resolve(backend, 'tsconfig.json'),
  transpileOnly: true,
});
const { inboxTypes, activeInboxTypes, inboxEvents } = backendRequire(
  resolve(backend, 'src/plugins/platform-notifications/inbox-registry.ts'),
);
const escape = (value) =>
  String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
const decision = {
  KEEP: 'KEEP: Essential active notification',
  DISABLE: 'DISABLE: Unnecessary informational or confirmation notification',
  COVERED: 'COVERED: Meaning delivered by another essential type',
  FUTURE: 'FUTURE: Corresponding business feature or policy absent',
};
const stopped = inboxTypes.filter(
  (t) => t.status === 'integrated' && t.delivery !== 'KEEP',
);
const counts = Object.fromEntries(
  Object.keys(decision).map((key) => [
    key,
    inboxTypes.filter((t) => t.delivery === key).length,
  ]),
);
const rows = inboxTypes.map(
  (t) =>
    `| ${[t.id, t.name, t.contexts.join(', '), t.severity, t.mandatory ? 'Required' : 'Optional', t.event ? inboxEvents(t).join(', ') : t.reason, decision[t.delivery], t.deliveryReason, t.coveredBy ?? '', t.delivery === 'KEEP' ? (t.mandatory ? 'No unsubscribe' : 'Optional type/category/source/workspace suppression') : 'Inactive; existing preference history retained', t.delivery === 'KEEP' ? (t.id === 'market.readiness.digest' ? 'Daily Market-local, unresolved items only' : t.id === 'market.day.checklist' ? 'Once per occurrence/local date' : t.reminder ? 'Existing domain timing and revalidation' : 'Individual durable delivery') : 'No new inbox records'].map(escape).join(' | ')} |`,
);
const content = `# Notification event catalog

Generated from the authoritative backend registry by \`npm run notifications:catalog\`. All ${inboxTypes.length} contracts are audited. Before: 82 integrated delivery types. After: **${activeInboxTypes.length} active delivery types**, with ${stopped.length} formerly integrated types stopped. Decisions across all contracts: ${Object.entries(
  counts,
)
  .map(([k, v]) => `${v} ${k}`)
  .join(', ')}.

Only KEEP types can create inbox records, including through direct replay and storage. Integrated source adapters remain implemented independently of the active-delivery policy. No contracts were added. Domain events, console/email/SMS processing, historical inbox state and existing preference records remain intact. Required security and transactional policy is unchanged.

Specific actionable intents replace generic compliance activity. A required request, a rejected submission and a new required policy version are independent actions. Form applications and explicit membership requests are distinct workflows. Daily readiness summaries require current unresolved items. The day-of checklist remains available independently of inbox delivery.

| Type | Name | Receiving context | Severity | Policy | Authoritative source or gap | Decision | Reason and retained scope | Covered by | Preferences | Cadence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Formerly integrated types stopped

${stopped.map((t) => `- \`${t.id}\`: ${t.delivery}. ${t.deliveryReason}`).join('\n')}

## Essential active types

${activeInboxTypes.map((t) => `- \`${t.id}\`: ${t.deliveryReason}`).join('\n')}

## Qualification

An implemented adapter is not an active-delivery approval. Originating-source checks and cleanup-specific persisted-row qualification are documented in the [implementation report](NOTIFICATIONS_IMPLEMENTATION_REPORT.md). No external provider, general grouping engine, new scheduling policy, missing source feature or marketing consent is enabled by a registry contract.
`;
require('prettier')
  .format(content, { parser: 'markdown' })
  .then((formatted) => {
    writeFileSync(resolve('docs/NOTIFICATION_EVENT_CATALOG.md'), formatted);
    console.log(
      `Wrote ${inboxTypes.length} contracts: ${activeInboxTypes.length} active, ${stopped.length} previously integrated stopped. ${JSON.stringify(counts)}`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
