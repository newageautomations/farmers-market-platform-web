/** Read-only source extraction. Never import vendure-config, plugin classes or a backend entry point. */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { mergeTypeDefs } from '@graphql-tools/merge';
import type { GraphQLSchema, DocumentNode } from 'graphql';

const backend = resolve(
  process.env.BACKEND_REFERENCE_PATH ?? '../farmers-market-platform',
);
const backendRequire = createRequire(join(backend, 'package.json'));
const gql = backendRequire('graphql') as typeof import('graphql');
const { defaultConfig } = backendRequire(
  '@vendure/core/dist/config/default-config.js',
) as { defaultConfig: Record<string, unknown> };
const { buildSchemaFromVendureConfig } = backendRequire(
  '@vendure/core/dist/api/config/get-final-vendure-schema.js',
) as {
  buildSchemaFromVendureConfig: (
    schema: GraphQLSchema,
    config: Record<string, unknown>,
    api: string,
  ) => GraphQLSchema;
};
const references: Record<string, string> = {};
function read(path: string) {
  const content = readFileSync(join(backend, path), 'utf8');
  references[path] = createHash('sha256').update(content).digest('hex');
  return content;
}
function source(path: string) {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true);
}
function declarations(file: ts.SourceFile) {
  const values = new Map<string, ts.Expression>();
  for (const statement of file.statements)
    if (ts.isVariableStatement(statement)) {
      for (const item of statement.declarationList.declarations)
        if (ts.isIdentifier(item.name) && item.initializer)
          values.set(item.name.text, item.initializer);
    }
  return values;
}
const metrics = declarations(source('src/plugins/analytics/types.ts'));
function literals(node: ts.Expression | undefined): string[] {
  if (!node) throw new Error('Missing source declaration');
  if (ts.isAsExpression(node)) return literals(node.expression);
  if (!ts.isArrayLiteralExpression(node))
    throw new Error('Only literal schema arrays are supported');
  return node.elements.flatMap((item) =>
    ts.isStringLiteral(item)
      ? [item.text]
      : ts.isSpreadElement(item) && ts.isIdentifier(item.expression)
        ? literals(metrics.get(item.expression.text))
        : (() => {
            throw new Error('Unsupported schema array');
          })(),
  );
}
const metricKeys = literals(metrics.get('metricKeys'));
function extract(path: string, name: string): string {
  const file = source(path),
    values = declarations(file);
  function evaluate(node: ts.Expression): string {
    if (ts.isTaggedTemplateExpression(node)) {
      if (!ts.isIdentifier(node.tag) || node.tag.text !== 'gql')
        throw new Error('Only gql tags supported');
      return evaluate(node.template);
    }
    if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node))
      return node.text;
    if (ts.isIdentifier(node)) {
      const value = values.get(node.text);
      if (!value) throw new Error(`Missing ${node.text}`);
      return evaluate(value);
    }
    if (ts.isTemplateExpression(node))
      return (
        node.head.text +
        node.templateSpans
          .map((span) => evaluate(span.expression) + span.literal.text)
          .join('')
      );
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'fields' &&
      node.arguments.length === 1
    ) {
      const key = node.arguments[0]!.getText(file);
      let names: string[];
      if (key === 'metricKeys') names = metricKeys;
      else {
        const expression = values.get(key);
        if (!expression) throw new Error('Missing metric declaration');
        if (ts.isArrayLiteralExpression(expression))
          names = literals(expression);
        else {
          const text = expression.getText(file);
          if (!text.startsWith('metricKeys.filter('))
            throw new Error('Unsupported metric expression');
          const excluded = [...text.matchAll(/'([^']+)'/g)].map(
            (match) => match[1]!,
          );
          names = metricKeys.filter((metric) => !excluded.includes(metric));
        }
      }
      return names.map((metric) => `${metric}:String!`).join(',');
    }
    throw new Error(`Unsupported schema expression: ${node.getText(file)}`);
  }
  const value = values.get(name);
  if (!value) throw new Error(`Missing schema ${name}`);
  return evaluate(value);
}

// Reviewed Phase 12 profile: nativeCommerce=true, paidAttribution=true, customerRelationships=true.
// Conditional runtime capabilities still require the actual backend flags and authorization.
const sharedExtensions = [
  ['src/plugins/market-operations/api.ts', 'operations'],
  ['src/plugins/marketplace-commerce/api.ts', 'commerce'],
  ['src/plugins/marketplace-commerce/commerce/topology.api.ts', 'topology'],
  ['src/plugins/marketplace-commerce/financial/financial.api.ts', 'financial'],
  [
    'src/plugins/marketplace-commerce/customer-relationships/api.ts',
    'customerRelationships',
  ],
  ['src/plugins/payments/api.ts', 'payments'],
  ['src/plugins/communications/api.ts', 'communication'],
] as const;
const permissionPaths = [
  'src/plugins/market-operations/permissions.ts',
  'src/plugins/platform-identity/permissions.ts',
  'src/plugins/billing-entitlements/authority.service.ts',
  'src/plugins/analytics/api.ts',
];
const permissionNames = [
  ...new Set(
    permissionPaths.flatMap((path) => {
      const names: string[] = [];
      function visit(node: ts.Node) {
        if (
          ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'PermissionDefinition'
        ) {
          const options = node.arguments?.[0];
          if (options && ts.isObjectLiteralExpression(options))
            for (const property of options.properties) {
              if (
                ts.isPropertyAssignment(property) &&
                property.name
                  .getText()
                  .replaceAll('"', '')
                  .replaceAll("'", '') === 'name' &&
                ts.isStringLiteral(property.initializer)
              )
                names.push(property.initializer.text);
            }
        }
        ts.forEachChild(node, visit);
      }
      visit(source(path));
      return names;
    }),
  ),
];
mkdirSync('packages/api/schema', { recursive: true });
for (const api of ['shop', 'admin'] as const) {
  const base = join(backend, 'node_modules/@vendure/core/dist/api/schema');
  const native = ['common', `${api}-api`].flatMap((dir) =>
    readdirSync(join(base, dir))
      .filter((name) => name.endsWith('.graphql'))
      .map((name) =>
        read(`node_modules/@vendure/core/dist/api/schema/${dir}/${name}`),
      ),
  );
  const nativeSchema = gql.buildASTSchema(
    mergeTypeDefs(native) as DocumentNode,
  );
  const built = buildSchemaFromVendureConfig(
    nativeSchema,
    { ...defaultConfig, plugins: [] },
    api,
  );
  const extensions = sharedExtensions.map(([path, prefix]) =>
    extract(path, `${prefix}${api === 'shop' ? 'Shop' : 'Admin'}Schema`),
  );
  if (api === 'shop')
    extensions.push(
      extract(
        'src/plugins/marketplace-commerce/customer-account/api.ts',
        'customerAccountShopSchema',
      ),
    );
  if (api === 'admin')
    extensions.push(
      extract('src/plugins/platform-identity/api.ts', 'identityAdminSchema'),
      extract(
        'src/plugins/farmers-market/api/admin-api.ts',
        'marketAdminSchema',
      ),
      extract('src/plugins/pos-integration/api.ts', 'posAdminSchema'),
      extract('src/plugins/billing-entitlements/api.ts', 'billingAdminSchema'),
      extract('src/plugins/analytics/api.ts', 'analyticsAdminSchema'),
      extract('src/plugins/platform-admin/api.ts', 'platformAdminSchema'),
      extract(
        'src/plugins/marketplace-commerce/owned-admin-reads.ts',
        'ownedReadsAdminSchema',
      ),
    );
  extensions.push(`extend enum Permission { ${permissionNames.join(' ')} }`);
  const schema = gql.extendSchema(
    built,
    mergeTypeDefs(extensions, { useSchemaDefinition: false }) as DocumentNode,
  );
  gql.assertValidSchema(schema);
  writeFileSync(
    `packages/api/schema/${api}.graphql`,
    gql.printSchema(schema) + '\n',
  );
}
const version = JSON.parse(read('node_modules/@vendure/core/package.json')) as {
  version: string;
};
writeFileSync(
  'packages/api/schema/provenance.json',
  JSON.stringify(
    {
      vendureVersion: version.version,
      profile: {
        nativeCommerce: true,
        paidAttribution: true,
        customerRelationships: true,
        customerAccounts: true,
      },
      method:
        'Native Vendure schema transforms plus bounded AST extraction of actual plugin SDL. No backend bootstrap, env or database.',
      limitations: [
        'Internal protected custom fields are intentionally excluded. No operation selects them.',
        'Optional extensions represent an enabled Phase 12 profile, not proof of live capability.',
        'Compare against approved live introspection before integration release.',
      ],
      sha256: references,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Extracted Shop/Admin schemas from backend source without bootstrap or database access.',
);
