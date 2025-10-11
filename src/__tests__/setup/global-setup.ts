/**
 * Global Test Setup
 * Runs once before all test suites
 */

import { Config } from '@jest/types';

const globalSetup = async (globalConfig: Config.GlobalConfig) => {
  console.log('🚀 Setting up AI Search Test Environment');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise

  // Mock any global configurations
  global.__TEST_ENVIRONMENT__ = true;
  global.__TEST_TIMEOUT__ = 30000;

  // Initialize test database connection if needed
  // This would connect to a test database instance
  console.log('✅ Test environment setup complete');
};

export default globalSetup;