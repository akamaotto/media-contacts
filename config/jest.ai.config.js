/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '<rootDir>/src/__tests__/setup/ai-test-setup.ts'],
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
    '<rootDir>/src/lib/ai/**/*.test.ts',
    '<rootDir>/src/app/api/ai/**/*.test.ts',
    '<rootDir>/src/lib/ai/**/*.test.tsx',
    '<rootDir>/src/app/api/ai/**/*.test.tsx',
    '<rootDir>/src/__tests__/ai/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/lib/ai/**/*.ts',
    'src/app/api/ai/**/*.ts',
    '!src/lib/ai/**/*.d.ts',
    '!src/lib/ai/**/*.test.ts',
    '!src/lib/ai/**/*.test.tsx',
    '!src/app/api/ai/**/*.test.ts',
    '!src/app/api/ai/**/*.test.tsx',
    '!src/lib/ai/**/__tests__/**',
    '!src/app/api/ai/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/lib/ai/services/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/lib/ai/query-generation/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/lib/ai/contact-extraction/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/lib/ai/search-orchestration/': {
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
    'json'
  ],
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true,
  bail: false,
  forceExit: false,
  detectOpenHandles: true,
  errorOnDeprecated: true,
  testSequencer: '@jest/test-sequencer',
  globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts'
};

module.exports = config;