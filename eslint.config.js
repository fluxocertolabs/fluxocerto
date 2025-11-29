import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', '**/*.d.ts', 'e2e/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
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
)
