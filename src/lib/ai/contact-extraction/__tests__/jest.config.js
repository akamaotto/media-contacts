/**
 * Jest Configuration for Contact Extraction Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],

  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.test.js'
  ],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '../*.ts',
    '!../index.ts',
    '!../**/*.test.ts',
    '!../**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Module name mapping (for absolute imports)
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../$1'
  },

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../../../tsconfig.json'
    }
  }
};