import tsEslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['dist/', '**/*.d.ts'],
  },
  // Spread recommended configs directly
  ...tsEslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        project: [`tsconfig.json`, `tsconfig.test.json`],
      },
      globals: {
        node: true,
      },
    },
    rules: {
      'no-multiple-empty-lines': 'error',
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      // semi: ['error', 'never'],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
    },
  },
];
