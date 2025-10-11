/**
 * Global Test Teardown
 * Runs once after all test suites
 */

import { Config } from '@jest/types';

const globalTeardown = async (globalConfig: Config.GlobalConfig) => {
  console.log('🧹 Cleaning up AI Search Test Environment');

  // Clean up any global state
  delete global.__TEST_ENVIRONMENT__;
  delete global.__TEST_TIMEOUT__;

  // Close database connections if needed
  // Clear any test data
  // Reset mocked services

  console.log('✅ Test environment cleanup complete');
};

export default globalTeardown;