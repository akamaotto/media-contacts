/**
 * Jest Configuration for Integration Tests
 * Configures Jest for running integration tests with appropriate settings
 */

module.exports = {
  // Use the default preset for TypeScript projects
  preset: 'ts-jest',

  // Set the test environment to Node.js for integration tests
  testEnvironment: 'node',

  // Specify the root directory for integration tests
  roots: ['<rootDir>/src/__tests__/integration'],

  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.integration.ts'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Setup files to run before each test
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/integration/setup.ts'
  ],

  // Global variables available in tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Test timeout in milliseconds (5 minutes for integration tests)
  testTimeout: 300000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Detect open handles and warn about them
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Maximum number of workers (1 for integration tests to avoid conflicts)
  maxWorkers: 1,

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
    '!src/**/*.stories.tsx',
    '!src/**/*.config.{js,ts}',
    '!src/middleware.ts'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test result processor
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/integration',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/out/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ],

  // Module path ignore patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  // Error handling
  errorOnDeprecated: true,

  // Test sequencer
  testSequencer: '<rootDir>/src/__tests__/integration/test-sequencer.js',

  // Projects configuration for different test types
  projects: [
    {
      displayName: 'API Integration Tests',
      testMatch: ['<rootDir>/src/__tests__/integration/api/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/api/setup.ts']
    },
    {
      displayName: 'Database Integration Tests',
      testMatch: ['<rootDir>/src/__tests__/integration/database/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/database/setup.ts']
    },
    {
      displayName: 'External Services Integration Tests',
      testMatch: ['<rootDir>/src/__tests__/integration/external-services/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/external-services/setup.ts']
    },
    {
      displayName: 'Real-time Integration Tests',
      testMatch: ['<rootDir>/src/__tests__/integration/real-time/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/real-time/setup.ts']
    }
  ]
};