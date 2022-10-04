import type {Config} from 'jest';

const config: Config =
{
  "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": [
    "**/*.(t|j)s",
  ],
  "testPathIgnorePatterns": [
    "e2e\.spec",
  ],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "moduleDirectories": [
  "node_modules",
    "src"
  ]
}

export default config;
