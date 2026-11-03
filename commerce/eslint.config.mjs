import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', 'apps/api/src/generated/**', '**/next-env.d.ts', 'load-results/**', '**/playwright-report/**', '**/test-results/**']},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      'no-console': ['warn', {allow: ['warn', 'error']}],
    },
  },
  {files: ['apps/web/**/*.tsx', 'apps/web/**/*.ts'], plugins: {'react-hooks': reactHooks}, rules: {'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn'}},
  {files: ['**/scripts/**', '**/tests/**', 'apps/web/**'], rules: {'no-console': 'off'}},
  {files: ['scripts/**/*.mjs'], languageOptions: {globals: {process: 'readonly', console: 'readonly', fetch: 'readonly', performance: 'readonly', Buffer: 'readonly', URL: 'readonly', setTimeout: 'readonly'}}},
);
