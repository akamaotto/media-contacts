/**
 * Integration Test Runner Script
 * Executes all integration tests and generates coverage reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testDir: path.join(__dirname, '../'),
  coverageDir: path.join(__dirname, '../../../coverage/integration'),
  reportsDir: path.join(__dirname, '../../../reports/integration'),
  testPattern: '**/*.test.ts',
  timeout: 300000, // 5 minutes
  verbose: true,
  collectCoverage: true,
  coverageThreshold: 80
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${step}`, 'cyan');
  log('='.repeat(step.length), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Create directories if they don't exist
function ensureDirectories() {
  const dirs = [config.coverageDir, config.reportsDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logInfo(`Created directory: ${dir}`);
    }
  });
}

// Run Jest with specific configuration
function runJest(testPattern, extraOptions = []) {
  const jestOptions = [
    '--config=jest.config.js',
    `--testPathPattern=${testPattern}`,
    `--testTimeout=${config.timeout}`,
    '--verbose',
    '--detectOpenHandles',
    '--forceExit'
  ];

  if (config.collectCoverage) {
    jestOptions.push(
      '--coverage',
      `--coverageDirectory=${config.coverageDir}`,
      '--coverageReporters=text',
      '--coverageReporters=lcov',
      '--coverageReporters=html',
      '--coverageReporters=json'
    );
  }

  const options = [...jestOptions, ...extraOptions];
  const command = `npx jest ${options.join(' ')}`;

  logInfo(`Running command: ${command}`);

  try {
    const output = execSync(command, {
      cwd: config.testDir,
      encoding: 'utf8',
      stdio: config.verbose ? 'inherit' : 'pipe'
    });

    if (!config.verbose) {
      console.log(output);
    }

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.message,
      error: error.stderr || error.message
    };
  }
}

// Parse Jest coverage output
function parseCoverageResults(coverageJsonPath) {
  try {
    if (!fs.existsSync(coverageJsonPath)) {
      return null;
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
    const total = coverageData.total;

    return {
      lines: {
        covered: total.lines.covered,
        total: total.lines.total,
        percentage: total.lines.pct
      },
      functions: {
        covered: total.functions.covered,
        total: total.functions.total,
        percentage: total.functions.pct
      },
      branches: {
        covered: total.branches.covered,
        total: total.branches.total,
        percentage: total.branches.pct
      },
      statements: {
        covered: total.statements.covered,
        total: total.statements.total,
        percentage: total.statements.pct
      }
    };
  } catch (error) {
    logError(`Failed to parse coverage results: ${error.message}`);
    return null;
  }
}

// Generate test report
function generateTestReport(results, coverageData) {
  const reportPath = path.join(config.reportsDir, `integration-test-report-${Date.now()}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    results: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      successRate: results.total > 0 ? (results.passed / results.total * 100).toFixed(2) : 0
    },
    coverage: coverageData,
    config: {
      timeout: config.timeout,
      coverageThreshold: config.coverageThreshold
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logSuccess(`Test report generated: ${reportPath}`);
  
  return report;
}

// Main test runner function
async function runIntegrationTests() {
  logStep('Starting AI Search Integration Tests');
  
  const startTime = Date.now();
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Ensure directories exist
    ensureDirectories();

    // Run API endpoint tests
    logStep('Running API Endpoint Integration Tests');
    const apiTestsResult = runJest('api/**/*.test.ts');
    if (!apiTestsResult.success) {
      logError('API endpoint tests failed');
      testResults.failed += 1;
    } else {
      logSuccess('API endpoint tests passed');
      testResults.passed += 1;
    }
    testResults.total += 1;

    // Run database integration tests
    logStep('Running Database Integration Tests');
    const dbTestsResult = runJest('database/**/*.test.ts');
    if (!dbTestsResult.success) {
      logError('Database integration tests failed');
      testResults.failed += 1;
    } else {
      logSuccess('Database integration tests passed');
      testResults.passed += 1;
    }
    testResults.total += 1;

    // Run external service integration tests
    logStep('Running External Service Integration Tests');
    const externalTestsResult = runJest('external-services/**/*.test.ts');
    if (!externalTestsResult.success) {
      logError('External service integration tests failed');
      testResults.failed += 1;
    } else {
      logSuccess('External service integration tests passed');
      testResults.passed += 1;
    }
    testResults.total += 1;

    // Run real-time integration tests
    logStep('Running Real-time Integration Tests');
    const realtimeTestsResult = runJest('real-time/**/*.test.ts');
    if (!realtimeTestsResult.success) {
      logError('Real-time integration tests failed');
      testResults.failed += 1;
    } else {
      logSuccess('Real-time integration tests passed');
      testResults.passed += 1;
    }
    testResults.total += 1;

    // Parse coverage results
    let coverageData = null;
    if (config.collectCoverage) {
      logStep('Parsing Coverage Results');
      const coverageJsonPath = path.join(config.coverageDir, 'coverage-final.json');
      coverageData = parseCoverageResults(coverageJsonPath);
      
      if (coverageData) {
        logInfo(`Coverage - Lines: ${coverageData.lines.percentage}%, Functions: ${coverageData.functions.percentage}%, Branches: ${coverageData.branches.percentage}%, Statements: ${coverageData.statements.percentage}%`);
        
        // Check if coverage meets threshold
        const overallCoverage = coverageData.statements.percentage;
        if (overallCoverage < config.coverageThreshold) {
          logWarning(`Coverage (${overallCoverage}%) is below the threshold (${config.coverageThreshold}%)`);
        } else {
          logSuccess(`Coverage (${overallCoverage}%) meets the threshold (${config.coverageThreshold}%)`);
        }
      } else {
        logWarning('Could not parse coverage data');
      }
    }

    // Generate test report
    logStep('Generating Test Report');
    const report = generateTestReport(testResults, coverageData);

    // Calculate total execution time
    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(2);
    
    // Print summary
    logStep('Test Execution Summary');
    logInfo(`Total execution time: ${executionTime}s`);
    logInfo(`Total test suites: ${testResults.total}`);
    logInfo(`Passed: ${testResults.passed}`);
    logInfo(`Failed: ${testResults.failed}`);
    logInfo(`Success rate: ${report.results.successRate}%`);
    
    if (coverageData) {
      logInfo(`Overall coverage: ${coverageData.statements.percentage}%`);
    }

    // Exit with appropriate code
    if (testResults.failed > 0) {
      logError('Some integration tests failed');
      process.exit(1);
    } else if (coverageData && coverageData.statements.percentage < config.coverageThreshold) {
      logWarning('Integration tests passed but coverage is below threshold');
      process.exit(1);
    } else {
      logSuccess('All integration tests passed and coverage meets requirements');
      process.exit(0);
    }
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-coverage':
        config.collectCoverage = false;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i]) || 300000;
        break;
      case '--coverage-threshold':
        config.coverageThreshold = parseInt(args[++i]) || 80;
        break;
      case '--help':
        log('Integration Test Runner', 'bright');
        log('');
        log('Usage: node run-integration-tests.js [options]', 'cyan');
        log('');
        log('Options:', 'yellow');
        log('  --no-coverage          Disable coverage collection', 'white');
        log('  --verbose              Enable verbose output', 'white');
        log('  --timeout <ms>         Set test timeout in milliseconds (default: 300000)', 'white');
        log('  --coverage-threshold <%> Set coverage threshold percentage (default: 80)', 'white');
        log('  --help                 Show this help message', 'white');
        process.exit(0);
        break;
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  parseArguments();
  runIntegrationTests();
}

module.exports = {
  runIntegrationTests,
  config
};