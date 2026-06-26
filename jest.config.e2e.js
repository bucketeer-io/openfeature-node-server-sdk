module.exports = {
  transform: { '^.+\\.ts?$': ['ts-jest', { tsconfig: 'e2e/tsconfig.json' }] },
  testMatch: ['**/e2e/**/*.test.ts?(x)'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
