import typescriptEslint from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import js from '@eslint/js'
import {FlatCompat} from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

const defaultOptions = {
    plugins: {
        '@typescript-eslint': typescriptEslint,
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
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        'indent': ['warn', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'never'],
        'no-console': 1,
        'comma-dangle': ['warn', 'always-multiline'],
        'arrow-parens': [0],
        'object-curly-spacing': ['warn', 'never'],
        'array-bracket-spacing': ['warn', 'never'],
        'import/prefer-default-export': [0],
        '@typescript-eslint/no-unused-vars': 'off',
    },
}

export default [
    {
        ignores: [
            '**/node_modules',
            '**/dist',
        ],
    },
    ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
    defaultOptions,
]