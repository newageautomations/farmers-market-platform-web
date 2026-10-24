import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import a11y from 'eslint-plugin-jsx-a11y-x';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.astro/**',
      'node_modules/**',
      'packages/api/src/generated/**',
      'playwright-report/**',
      'test-results/**',
      'mobile/companion/android/**',
      'mobile/companion/ios/**',
      'mobile/companion/.expo/**',
      'mobile/companion/.stage-e-bundle/**',
      'mobile/companion/modules/clover-go/android/build/**',
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  {
    // Expo/Metro load these native build plugins through their CommonJS API.
    files: [
      'mobile/companion/metro.config.js',
      'mobile/companion/plugins/with-square.js',
    ],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-require-imports': [
        'error',
        {
          allow: [
            '^node:(?:fs|path)$',
            '^expo/(?:config-plugins|metro-config)$',
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'jsx-a11y-x': a11y, 'react-hooks': hooks },
    rules: {
      ...a11y.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
);
