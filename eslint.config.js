import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '**/*.d.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    ignores: ['e2e/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Allow setState in effects for data synchronization patterns
      // These are legitimate use cases for syncing external data (props, subscriptions)
      // with local state. See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
      'react-hooks/set-state-in-effect': 'off',
      // Allow reading refs during render for specific patterns
      'react-hooks/refs': 'off',
    },
  },
  // E2E test files: lint for flaky patterns
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['e2e/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Disallow flaky Playwright patterns that cause test instability
      // NOTE: Set to 'warn' to surface issues without blocking CI. Upgrade to 'error' once
      // all existing violations are fixed. See docs/reference/KNOWLEDGE_BASE.md for patterns.
      'no-restricted-syntax': [
        'warn',
        {
          // Disallow page.waitForTimeout() - use assertion-based waits instead
          selector: 'CallExpression[callee.object.name="page"][callee.property.name="waitForTimeout"]',
          message: 'Avoid page.waitForTimeout() - use expect(locator).toBeVisible() or other assertion-based waits. Fixed sleeps cause flaky tests.',
        },
        {
          // Disallow locator.isVisible({ timeout }) conditionals - use strict assertions
          selector: 'CallExpression[callee.property.name="isVisible"] > ObjectExpression:has(Property[key.name="timeout"])',
          message: 'Avoid locator.isVisible({ timeout }) conditionals - use expect(locator).toBeVisible() for strict assertions. Conditional visibility checks can silently skip test logic.',
        },
      ],
      // Allow unused vars for destructuring patterns common in Playwright fixtures
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Relax `any` usage in E2E tests - test code often needs flexible typing for mocks/fixtures
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow empty patterns for unused fixture destructuring (e.g., `async ({ page }, testInfo) => {}`)
      'no-empty-pattern': 'off',
    },
  },
)
