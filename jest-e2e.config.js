const path = require('path')

process.env.NODE_JEST = true
process.env.NODE_TEST_E2E = true
process.env.API_LOG_LEVELS ??= 'log,warn,error,fatal'

module.exports =
{
    moduleFileExtensions: [
        'js',
        'json',
        'ts',
    ],
    rootDir: 'src',
    testRegex: '.*\\.e2e\\.spec\\.ts$',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.jest.json',
            },
        ],
        '^.+\\.js$': path.resolve(__dirname, 'jest-unit.transformer.js'),
    },
    // ESM-only packages are compiled to CommonJS: jest's ESM support
    // (--experimental-vm-modules) keeps every test file's modules in memory
    transformIgnorePatterns: [],
    collectCoverageFrom: [
        '**/*.(t|j)s',
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    moduleDirectories: [
        'node_modules',
        'src',
    ],
    slowTestThreshold: 15,
    testTimeout: 60 * 1000,
    maxWorkers: 6,
    testRunner: 'jest-circus/runner',
    testEnvironment: '../jest-e2e-env-runtime.ts',
    globalSetup: '../jest-e2e-global-setup.js',
    moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/$1',
    },
}
