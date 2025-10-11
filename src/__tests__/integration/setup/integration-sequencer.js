/**
 * Integration Test Sequencer
 * Controls the execution order of integration tests to ensure proper setup and dependencies
 */

const Sequencer = require('@jest/test-sequencer').default;

class IntegrationTestSequencer extends Sequencer {
  /**
   * Sort tests to ensure proper execution order
   * 1. Database and setup tests first
   * 2. API endpoint tests
   * 3. Integration workflow tests
   * 4. Performance and error handling tests
   */
  sort(tests) {
    const testOrder = [
      // Database and setup tests
      'database',
      'setup',
      'config',

      // Authentication tests
      'auth',
      'session',

      // Basic API endpoints
      'health',
      'api',
      'route',

      // Core AI functionality
      'search',
      'query',
      'extraction',
      'contact',

      // Integration workflows
      'workflow',
      'orchestration',
      'integration',

      // External services
      'external',
      'service',

      // Real-time features
      'realtime',
      'websocket',
      'sse',

      // File operations
      'file',
      'upload',
      'download',
      'import',
      'export',

      // Error handling and edge cases
      'error',
      'failure',
      'recovery',

      // Performance and load testing
      'performance',
      'load',
      'stress',

      // Security and rate limiting
      'security',
      'rate',
      'limit'
    ];

    return Array.from(tests).sort((testA, testB) => {
      const priorityA = this.getTestPriority(testA.path, testOrder);
      const priorityB = this.getTestPriority(testB.path, testOrder);

      // Sort by priority (lower number = higher priority)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort by test filename
      const nameA = testA.path.split('/').pop();
      const nameB = testB.path.split('/').pop();
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get priority for a test based on its path
   */
  getTestPriority(testPath, testOrder) {
    const normalizedPath = testPath.toLowerCase();

    for (let i = 0; i < testOrder.length; i++) {
      if (normalizedPath.includes(testOrder[i])) {
        return i;
      }
    }

    // Tests not matching any pattern get lowest priority
    return testOrder.length;
  }

  /**
   * Shard tests for parallel execution
   */
  shard(tests, shardIndex, shardCount) {
    // Ensure setup and database tests run in the first shard
    if (shardIndex === 0) {
      const setupTests = tests.filter(test => {
        const path = test.path.toLowerCase();
        return path.includes('setup') || path.includes('database') || path.includes('config');
      });

      const otherTests = tests.filter(test => !setupTests.includes(test));

      // Sort setup tests first, then other tests
      return [...this.sort(setupTests), ...this.sort(otherTests)];
    }

    // Other shards get sorted tests (excluding setup tests)
    const filteredTests = tests.filter(test => {
      const path = test.path.toLowerCase();
      return !path.includes('setup') && !path.includes('database') && !path.includes('config');
    });

    return this.sort(filteredTests);
  }
}

module.exports = IntegrationTestSequencer;