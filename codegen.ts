import type { CodegenConfig } from '@graphql-codegen/cli';
const config: CodegenConfig = {
  generates: Object.fromEntries(
    ['shop', 'admin'].map((api) => [
      `packages/api/src/generated/${api}.ts`,
      {
        schema: `packages/api/schema/${api}.graphql`,
        documents:
          api === 'admin'
            ? [
                'packages/api/operations/admin.graphql',
                'packages/api/operations/market.graphql',
                'packages/api/operations/management.graphql',
                'packages/api/operations/market-operations.graphql',
              ]
            : [
                'packages/api/operations/shop.graphql',
                'packages/api/operations/checkout.graphql',
                'packages/api/operations/preferences.graphql',
                'packages/api/operations/public-market-operations.graphql',
              ],
        plugins: ['typescript-operations', 'typed-document-node'],
        config: {
          enumsAsTypes: true,
          useTypeImports: true,
          strictScalars: true,
          defaultScalarType: 'unknown',
          scalars: {
            DateTime: 'string',
            JSON: 'unknown',
            Money: 'number',
            Upload: 'unknown',
          },
          avoidOptionals:
            api === 'shop' ? { field: true, inputValue: false } : true,
          immutableTypes: true,
        },
      },
    ]),
  ),
};
export default config;
