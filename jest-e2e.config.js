process.env.NODE_JEST = true

module.exports =
{
  moduleFileExtensions: [
      'js',
      'json',
      'ts'
    ],
  rootDir: 'src',
  testRegex: '.*\\.e2e\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.jest.json'
      },
    ],
  },
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
  testRunner: 'jest-circus/runner',
  testEnvironment: '../jest-e2e-env-runtime.ts',
}
