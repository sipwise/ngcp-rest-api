const path = require('path')

process.env.NODE_JEST = true

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
    transformIgnorePatterns: [
        'node_modules/(?!(otplib|@otplib|@noble|@scure|uuid)/)',
    ],
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
    moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/$1',
    },
}
