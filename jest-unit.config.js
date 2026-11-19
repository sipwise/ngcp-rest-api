const path = require('path')

process.env.NODE_JEST = true
process.env.API_LOG_LEVELS ??= 'log,warn,error,fatal'
// date tests (invoice periods, serials) use the CET month boundary and DST, independent of the host timezone
process.env.TZ = 'Europe/Vienna'

module.exports =
{
    moduleFileExtensions: [
        'js',
        'json',
        'ts',
    ],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': path.resolve(__dirname, 'jest-unit.transformer.js'),
    },
    // ESM-only packages are compiled to CommonJS: jest's ESM support
    // (--experimental-vm-modules) keeps every test file's modules in memory
    transformIgnorePatterns: [],
    collectCoverageFrom: [
        '**/*.(t|j)s',
    ],
    testPathIgnorePatterns: [
        'e2e\\.spec',
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    moduleDirectories: [
        'node_modules',
        'src',
    ],
    slowTestThreshold: 15,
    // each worker loads the whole app (up to ~1 GB)
    maxWorkers: 4,
    moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/$1',
    },
}
