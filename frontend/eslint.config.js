// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      // L2-046 criterion 2: templates and styles live in their own files.
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        { template: 0, styles: 0, animations: 0 },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // Angular classes are configured by decorators, so an empty decorated class is normal.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // L2-047 criterion 3: RxJS stays at the HTTP boundary.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['rxjs', 'rxjs/*'],
              message: 'RxJS is confined to src/app/core/api (L2-047). Use signals.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/api/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },
  // Last, so lint never rules on layout (L2-055).
  prettier,
]);
