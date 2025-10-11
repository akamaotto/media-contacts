/**
 * Custom Jest test sequencer for integration tests.
 * Ensures deterministic ordering based on file path while
 * keeping the default shard handling behavior.
 */

const Sequencer = require('@jest/test-sequencer').default;

class IntegrationTestSequencer extends Sequencer {
  /**
   * Sort tests deterministically by file path to avoid
   * nondeterministic ordering across runs.
   */
  sort(tests) {
    return Array.from(tests).sort((a, b) => a.path.localeCompare(b.path));
  }
}

module.exports = IntegrationTestSequencer;
