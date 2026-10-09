import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory()
      ? files(join(dir, item.name))
      : /\.(js|mjs|html|css)$/.test(item.name)
        ? [join(dir, item.name)]
        : [],
  );
}
const targets = [...files('apps/storefront/dist'), ...files('apps/admin/dist')];
const forbidden = [
  /Bulverde Market Day/,
  /Synthetic Vendor Fixture/,
  /Synthetic Vendor [AB]/,
  /Synthetic Market [AB]/,
  /Synthetic [AB] (?:Product|Variant|Market|Customer|pavilion)/,
  /synthetic-[12]-[0-9]+@example\.invalid/,
  /sk_(?:live|test)_[A-Za-z0-9]{8,}/,
  /postgres(?:ql)?:\/\//,
  /BEGIN (?:RSA )?PRIVATE KEY/,
];
for (const file of targets)
  if (forbidden.some((pattern) => pattern.test(readFileSync(file, 'utf8'))))
    throw new Error(
      `Unexpected fixture or credential marker in production artifact: ${file}`,
    );
if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
  writeFileSync(
    join(
      process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5',
      'bundle-validation.json',
    ),
    JSON.stringify(
      {
        filesChecked: targets.length,
        fixtureNamesAbsent: true,
        credentialMarkersAbsent: true,
        scope:
          'Production js/mjs/html/css markers; no claim of exhaustive secret detection.',
      },
      null,
      2,
    ) + '\n',
  );
console.log(`Production artifact markers valid (${targets.length} files).`);
