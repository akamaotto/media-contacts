#!/usr/bin/env node

/**
 * Test Runner Script
 * Main entry point for running the comprehensive testing framework
 */

import { runTestPipeline, defaultPipelineConfig, PipelineConfig } from './test-pipeline';
import { testEnvironment } from './test-config';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1],
  coverage: !args.includes('--no-coverage'),
  parallel: !args.includes('--no-parallel'),
  watch: args.includes('--watch'),
  verbose: args.includes('--verbose'),
  bail: args.includes('--bail'),
  updateSnapshots: args.includes('--update-snapshots'),
  help: args.includes('--help') || args.includes('-h')
};

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
🧪 AI Media Contacts Testing Framework

Usage: npm run test [options]

Options:
  --suite=<name>        Run specific test suite (unit|integration|e2e|performance)
  --no-coverage         Disable coverage reporting
  --no-parallel         Run tests sequentially
  --watch              Watch mode - rerun tests on file changes
  --verbose            Verbose output
  --bail               Stop on first test failure
  --update-snapshots   Update test snapshots
  --help, -h           Show this help message

Examples:
  npm run test                           # Run all tests
  npm run test --suite=unit             # Run only unit tests
  npm run test --no-coverage --verbose  # Run without coverage, verbose output
  npm run test --watch                  # Run in watch mode
  npm run test --suite=e2e --bail       # Run E2E tests, stop on first failure

Test Suites:
  unit         - Unit tests for individual components
  integration  - Integration tests for API endpoints
  e2e          - End-to-end tests for user workflows
  performance  - Performance and load tests

Environment Variables:
  NODE_ENV=test                    # Set test environment
  TEST_DATABASE_URL=<url>          # Test database connection
  ENABLE_REAL_AI_TESTS=true       # Enable real AI API tests
  TEST_AI_API_KEY=<key>           # AI service API key for testing
  ENABLE_PERFORMANCE_TESTS=true   # Enable performance profiling
`);
}

/**
 * Create test configuration based on options
 */
function createTestConfig(): PipelineConfig {
  const config = { ...defaultPipelineConfig };

  // Filter suites if specific suite requested
  if (options.suite) {
    config.suites = config.suites.filter(suite => 
      suite.name.toLowerCase().includes(options.suite!.toLowerCase())
    );
    
    if (config.suites.length === 0) {
      console.error(`❌ No test suite found matching: ${options.suite}`);
      console.error('Available suites: unit, integration, e2e, performance');
      process.exit(1);
    }
  }

  // Configure coverage
  if (!options.coverage) {
    config.coverage.enabled = false;
  }

  // Configure parallelism
  if (!options.parallel) {
    config.parallel = false;
    config.suites.forEach(suite => {
      suite.parallel = false;
    });
  }

  // Configure bail behavior
  if (options.bail) {
    config.suites.forEach(suite => {
      suite.retries = 0;
    });
  }

  // Configure reporting
  if (options.verbose) {
    config.reporting.formats.push('console');
  }

  return config;
}

/**
 * Watch mode implementation
 */
async function runWatchMode(config: PipelineConfig): Promise<void> {
  console.log('👀 Starting watch mode...');
  console.log('Press Ctrl+C to exit');

  // Mock file watcher (in real implementation, use chokidar or similar)
  let isRunning = false;

  const runTests = async () => {
    if (isRunning) return;
    
    isRunning = true;
    console.log('\n🔄 Files changed, rerunning tests...');
    
    try {
      await runTestPipeline(config);
    } catch (error) {
      console.error('Test run failed:', error);
    } finally {
      isRunning = false;
    }
  };

  // Initial test run
  await runTests();

  // Mock file watching (in real implementation, watch actual files)
  setInterval(() => {
    // Simulate random file changes for demo
    if (Math.random() > 0.95) { // 5% chance every second
      runTests();
    }
  }, 1000);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Exiting watch mode...');
    process.exit(0);
  });
}

/**
 * Validate test environment
 */
async function validateEnvironment(): Promise<void> {
  console.log('🔍 Validating test environment...');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.warn(`⚠️ Node.js ${nodeVersion} detected. Recommended: Node.js 18+`);
  }

  // Check environment variables
  const requiredEnvVars = ['NODE_ENV'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingEnvVars.join(', ')}`);
  }

  // If NODE_ENV is not set, warn (do not assign as it's read-only in some setups)
  if (!process.env.NODE_ENV) {
    console.warn('⚠️ NODE_ENV is not set. Tests typically run with NODE_ENV="test".');
  }

  // Validate test environment setup
  try {
    await testEnvironment.setup();
    await testEnvironment.teardown();
    console.log('✅ Test environment validation passed');
  } catch (error) {
    console.error('❌ Test environment validation failed:', error);
    throw error;
  }
}

/**
 * Display test summary
 */
function displayTestInfo(config: PipelineConfig): void {
  console.log('🧪 AI Media Contacts Test Suite');
  console.log('================================');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Coverage: ${config.coverage.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`Parallel: ${config.parallel ? 'Enabled' : 'Disabled'}`);
  console.log(`Watch Mode: ${options.watch ? 'Enabled' : 'Disabled'}`);
  
  console.log('\nTest Suites:');
  config.suites.forEach(suite => {
    console.log(`  • ${suite.name} (${suite.type})`);
  });
  
  console.log('');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Show help if requested
    if (options.help) {
      showHelp();
      return;
    }

    // Validate environment
    await validateEnvironment();

    // Create test configuration
    const config = createTestConfig();

    // Display test information
    displayTestInfo(config);

    // Run tests
    if (options.watch) {
      await runWatchMode(config);
    } else {
      await runTestPipeline(config);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runTests };