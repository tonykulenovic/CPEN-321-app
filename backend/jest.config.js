/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/controllers/friends.controller.ts',
    'src/controllers/location.controller.ts',
    'src/controllers/badge.controller.ts',
    'src/routes/friends.routes.ts',
    'src/routes/location.routes.ts',
    'src/routes/badge.routes.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
