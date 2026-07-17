/**
 * ESLint configuration for CI — enforces zero warnings.
 * Item 74 of the PledgeStack roadmap.
 *
 * This config extends the base ESLint config and adds:
 * - PledgeStack security rules
 * - Zero-warning policy
 * - CI-specific overrides
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const ciEslintConfig: Record<string, any> = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'pledgestack'],
  rules: {
    // PledgeStack security rules (item 173)
    'pledgestack/no-eval': 'error',
    'pledgestack/no-implied-eval': 'error',
    'pledgestack/no-new-func': 'error',
    'pledgestack/no-dangerously-set-inner-html': 'error',
    'pledgestack/no-unsafe-fetch': 'warn',
    'pledgestack/no-secrets-in-client': 'error',
    'pledgestack/no-default-export-in-page': 'error',
    'pledgestack/no-default-export-in-layout': 'error',
    'pledgestack/no-async-in-client-component': 'error',
    'pledgestack/no-use-client-in-server': 'warn',

    // General quality rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  settings: {
    react: { version: 'detect' },
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      rules: {
        'pledgestack/no-eval': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['**/scripts/**'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};

export default ciEslintConfig;
