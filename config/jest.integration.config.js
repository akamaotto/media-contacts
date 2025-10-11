/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/ai-test-setup.ts',
    '<rootDir>/src/__tests__/integration/setup/integration-setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/tests/(.*)$': '<rootDir>/src/__tests__/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.test.ts',
    '<rootDir>/src/__tests__/integration/**/*.test.tsx',
    '<rootDir>/src/app/api/ai/**/*.integration.test.ts',
    '<rootDir>/src/lib/ai/**/*.integration.test.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/app/api/ai/**/*.ts',
    'src/lib/ai/**/*.ts',
    '!src/lib/ai/**/*.d.ts',
    '!src/lib/ai/**/*.test.ts',
    '!src/lib/ai/**/*.test.tsx',
    '!src/lib/ai/**/__tests__/**',
    '!src/app/api/ai/**/*.test.ts',
    '!src/app/api/ai/**/*.test.tsx',
    '!src/app/api/ai/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/app/api/ai/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/lib/ai/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  testTimeout: 60000, // Increased timeout for integration tests
  maxWorkers: 2, // Limit workers to avoid database conflicts
  verbose: true,
  bail: false,
  forceExit: true,
  detectOpenHandles: true,
  errorOnDeprecated: true,
  testSequencer: '<rootDir>/src/__tests__/integration/setup/integration-sequencer.js',
  globalSetup: '<rootDir>/src/__tests__/integration/setup/global-integration-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/integration/setup/global-integration-teardown.ts',

  // Custom reporters for integration test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'integration-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'integration-test-report.html',
        expand: true
      }
    ]
  ],

  // Environment variables for integration tests
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Module path mappings for external dependencies
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],

  // Ignore patterns for files that shouldn't be tested
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/src/__tests__/unit/',
    '<rootDir>/src/__tests__/e2e/'
  ],

  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  // Setup for database testing
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json'
    }
  },

  // Custom matchers for integration testing
  setupFiles: [
    '<rootDir>/src/__tests__/integration/matchers/custom-matchers.ts'
  ]
};

module.exports = config;