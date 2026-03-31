/**
 * eslint.config.mjs
 * ESLint Configuration for Dewa.fun Agent Backend
 * 
 * Provides comprehensive linting rules for:
 * - TypeScript code
 * - Best practices
 * - Security
 * - Performance
 */

import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginImport from 'eslint-plugin-import';

export default [
  // Base configurations
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  
  // Core ESLint recommended rules
  pluginJs.configs.recommended,
  
  // TypeScript ESLint configurations
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  
  // Import plugin for better module resolution
  {
    plugins: {
      import: pluginImport,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx'],
        },
      },
    },
    rules: {
      // Import/Export rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // TypeScript handles this
    },
  },
  
  // Custom rules override
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // ─── Code Quality ──────────────────────────────────────────────
      
      /**
       * Require explicit return types on functions
       * Helps with code readability and type safety
       */
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      
      /**
       * Require explicit module boundaries
       */
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      
      /**
       * Disallow unused variables
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      
      /**
       * Disallow unused imports (handled by TypeScript)
       */
      '@typescript-eslint/no-unused-imports': 'error',
      
      /**
       * Disallow require() - use import instead
       */
      '@typescript-eslint/no-var-requires': 'error',
      
      /**
       * Disallow non-null assertions (!.)
       * Prefer proper null checks or optional chaining
       */
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      /**
       * Disallow implicit any types
       */
      '@typescript-eslint/no-explicit-any': 'warn',
      
      /**
       * Require consistent type definitions
       */
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      
      /**
       * Disallow empty interfaces
       */
      '@typescript-eslint/no-empty-interface': [
        'error',
        {
          allowSingleExtends: true,
        },
      ],
      
      // ─── Best Practices ──────────────────────────────────────────────
      
      /**
       * Require curly braces for all control statements
       */
      curly: ['error', 'all'],
      
      /**
       * Disallow console.log in production code
       */
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      
      /**
       * Require const declarations for variables that are never reassigned
       */
      'prefer-const': 'error',
      
      /**
       * Disallow var - use let/const instead
       */
      'no-var': 'error',
      
      /**
       * Require arrow functions for simple callbacks
       */
      'prefer-arrow-callback': 'error',
      
      /**
       * Disallow multiple variable declarations in one statement
       */
      'one-var': ['error', 'never'],
      
      /**
       * Require template literals over string concatenation
       */
      'prefer-template': 'error',
      
      /**
       * Disallow else after return in if statements
       */
      'no-else-return': 'error',
      
      /**
       * Require early returns to reduce nesting
       */
      'no-lonely-if': 'error',
      
      // ─── Error Handling ──────────────────────────────────────────────
      
      /**
       * Require error handling in catch blocks
       */
      'no-empty': 'error',
      
      /**
       * Disallow throwing non-error values
       */
      'no-throw-literal': 'error',
      
      /**
       * Require await for promises
       */
      'require-await': 'error',
      
      // ─── Code Style ──────────────────────────────────────────────
      
      /**
       * Enforce semicolon usage
       */
      '@typescript-eslint/semi': ['error', 'always'],
      
      /**
       * Require single quotes
       */
      quotes: ['error', 'single', { avoidEscape: true }],
      
      /**
       * Disallow trailing commas in multiline objects
       */
      'comma-dangle': ['error', 'always-multiline'],
      
      /**
       * Require space before function parentheses
       */
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always',
        },
      ],
      
      /**
       * Require object shorthand properties
       */
      'object-shorthand': 'error',
      
      /**
       * Disallow unnecessary escape characters
       */
      'no-useless-escape': 'error',
      
      // ─── Security ──────────────────────────────────────────────
      
      /**
       * Disallow eval() - security risk
       */
      'no-eval': 'error',
      
      /**
       * Disallow implicit coercion
       */
      'no-implicit-coercion': 'error',
      
      /**
       * Disallow dangerous regex patterns
       */
      'no-control-regex': 'error',
      
      // ─── Performance ──────────────────────────────────────────────
      
      /**
       * Disallow unnecessary array spreading
       */
      'prefer-spread': 'error',
      
      /**
       * Disallow creating new instances of String/Number/Boolean
       */
      'no-new-wrappers': 'error',
    },
  },
  
  // Test file specific rules
  {
    files: ['tests/**/*.test.ts', '**/*.test.ts'],
    rules: {
      // Relax some rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
      'prefer-const': 'off',
      
      // Test-specific rules
      'no-empty': 'off', // Empty test blocks are okay during development
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.next/',
      '.turbo/',
      'coverage/',
      '*.js',
      '*.d.ts',
    ],
  },
];
