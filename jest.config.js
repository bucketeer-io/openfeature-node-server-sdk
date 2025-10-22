module.exports = {
  transform: { '^.+\\.ts?$': 'ts-jest' },
  testMatch: ['**/*.test.ts?(x)'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
