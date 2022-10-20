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
    '^.+\\.(t|j)s$': [
      'esbuild-jest',
      {
        sourcemap: true,
        tsconfig: './tsconfig.jest.json'
      },
    ],
  },
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
}
