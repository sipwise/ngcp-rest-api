import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import-x'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

const defaultOptions = {
    plugins: {
        '@typescript-eslint': typescriptEslint,
        'unused-imports': unusedImports,
        'no-relative-import-paths': noRelativeImportPaths,
        'import-x': importPlugin,
    },
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.mocha,
            Atomics: 'readonly',
            SharedArrayBuffer: 'readonly',
        },
        parser: tsParser,
        parserOptions: {
            project: './tsconfig.json',
            tsconfigRootDir: import.meta.dirname,
        },
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        'indent': ['error', 4, {
            'SwitchCase': 1,
        }],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'never'],
        'no-console': 2,
        'comma-dangle': ['error', 'always-multiline'],
        'arrow-parens': [0],
        'object-curly-spacing': ['error', 'never'],
        'array-bracket-spacing': ['error', 'never'],
        'import-x/prefer-default-export': [0],
        'unused-imports/no-unused-imports': 'error',
        'import-x/order': [
            'error',
            {
                'groups': [
                    'builtin',
                    'external',
                    'internal',
                    'sibling',
                    'parent',
                    'index',
                ],
                'newlines-between': 'always',
                'named': true,
                'alphabetize': {
                    order: 'asc',
                    caseInsensitive: false,
                    orderImportKind: 'asc',
                },
            },
        ],
        'no-relative-import-paths/no-relative-import-paths': [
            'error',
            {
                'allowSameFolder': true,
                'rootDir': 'src',
                'prefix': '~',
            },
        ],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                args: 'all',
                argsIgnorePattern: '^_',
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        '@typescript-eslint/explicit-function-return-type': ['error'],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-empty-function': 'error',
        '@typescript-eslint/no-empty-interface': 'error',
        '@typescript-eslint/no-unsafe-return': 'error',
        '@typescript-eslint/prefer-readonly': 'warn',
        '@typescript-eslint/await-thenable': 'warn',
    },
}

export default [
    {
        ignores: ['**/node_modules', '**/dist'],
    },
    js.configs.recommended,
    ...typescriptEslint.configs['flat/recommended'],
    defaultOptions,
]
