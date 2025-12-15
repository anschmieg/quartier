// Simple ESLint configuration for ESLint v9+
// Note: TypeScript and Vue plugins are not configured here
// To enable full linting, install and configure:
// - @typescript-eslint/eslint-plugin
// - @typescript-eslint/parser
// - eslint-plugin-vue
// - vue-eslint-parser

export default [
  {
    ignores: ['dist', 'node_modules', '*.config.js', '*.config.cjs', '*.config.ts', 'functions'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Promise: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
]
