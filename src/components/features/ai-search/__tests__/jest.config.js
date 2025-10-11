/**
 * Jest Configuration for AI Search Components Tests
 */

module.exports = {
  displayName: 'ai-search-components',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../$1',
  },
  testMatch: [
    '<rootDir>/**/*.test.{ts,tsx}',
    '<rootDir>/**/*.spec.{ts,tsx}'
  ],
  collectCoverageFrom: [
    '../*.{ts,tsx}',
    '!../**/*.d.ts',
    '!../**/index.ts',
    '!../**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
};