/**
 * Performance Load Testing Script
 * Tests the application under various load conditions
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
  testDuration: parseInt(process.env.TEST_DURATION) || 30, // seconds
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 5, // seconds
  endpoints: [
    { path: '/api/health', method: 'GET', weight: 1 },
    { path: '/api/media-contacts?page=1&pageSize=10', method: 'GET', weight: 3 },
    { path: '/api/filters/countries?limit=20', method: 'GET', weight: 2 },
    { path: '/api/filters/beats?limit=20', method: 'GET', weight: 2 },
    { path: '/api/dashboard/metrics', method: 'GET', weight: 1 }
  ]
};

// Test results
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  endpointStats: {},
  startTime: null,
  endTime: null
};

// Utility functions
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const url = `${config.baseUrl}${endpoint.path}`;
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Load-Test-Script/1.0'
      }
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          dataSize: data.length,
          endpoint: endpoint.path
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      reject({
        error: error.message,
        responseTime,
        endpoint: endpoint.path
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        responseTime: 10000,
        endpoint: endpoint.path
      });
    });

    req.end();
  });
}

function selectWeightedEndpoint() {
  const totalWeight = config.endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of config.endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  
  return config.endpoints[0];
}

async function runUserTest(userId, startTime, endTime) {
  const userResults = {
    requests: 0,
    successful: 0,
    failed: 0,
    responseTimes: [],
    errors: []
  };

  // Ramp up delay
  const rampUpDelay = (config.rampUpTime / config.concurrentUsers) * userId * 1000;
  await new Promise(resolve => setTimeout(resolve, rampUpDelay));

  while (Date.now() < endTime) {
    try {
      const endpoint = selectWeightedEndpoint();
      const response = await makeRequest(endpoint);
      
      userResults.requests++;
      userResults.responseTimes.push(response.responseTime);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        userResults.successful++;
      } else {
        userResults.failed++;
        userResults.errors.push({
          endpoint: endpoint.path,
          statusCode: response.statusCode,
          error: `HTTP ${response.statusCode}`
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
    } catch (error) {
      userResults.requests++;
      userResults.failed++;
      userResults.responseTimes.push(error.responseTime);
      userResults.errors.push({
        endpoint: error.endpoint,
        error: error.error
      });
    }
  }

  return userResults;
}

function calculateStats(responseTimes) {
  if (responseTimes.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0
    };
  }

  const sorted = [...responseTimes].sort((a, b) => a - b);
  const len = sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: sorted.reduce((sum, time) => sum + time, 0) / len,
    p50: sorted[Math.floor(len * 0.5)],
    p90: sorted[Math.floor(len * 0.9)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)]
  };
}

function printResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const stats = calculateStats(results.responseTimes);
  
  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\nTest Configuration:`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Concurrent Users: ${config.concurrentUsers}`);
  console.log(`  Test Duration: ${config.testDuration}s`);
  console.log(`  Ramp-up Time: ${config.rampUpTime}s`);
  
  console.log(`\nOverall Results:`);
  console.log(`  Total Requests: ${results.totalRequests}`);
  console.log(`  Successful: ${results.successfulRequests}`);
  console.log(`  Failed: ${results.failedRequests}`);
  console.log(`  Success Rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`);
  console.log(`  Requests/sec: ${(results.totalRequests / duration).toFixed(2)}`);
  
  console.log(`\nResponse Times (ms):`);
  console.log(`  Min: ${stats.min.toFixed(2)}`);
  console.log(`  Max: ${stats.max.toFixed(2)}`);
  console.log(`  Avg: ${stats.avg.toFixed(2)}`);
  console.log(`  50th percentile: ${stats.p50.toFixed(2)}`);
  console.log(`  90th percentile: ${stats.p90.toFixed(2)}`);
  console.log(`  95th percentile: ${stats.p95.toFixed(2)}`);
  console.log(`  99th percentile: ${stats.p99.toFixed(2)}`);
  
  console.log(`\nEndpoint Statistics:`);
  Object.entries(results.endpointStats).forEach(([endpoint, stats]) => {
    const endpointStats = calculateStats(stats.responseTimes);
    console.log(`  ${endpoint}:`);
    console.log(`    Requests: ${stats.requests}`);
    console.log(`    Success Rate: ${((stats.successful / stats.requests) * 100).toFixed(2)}%`);
    console.log(`    Avg Response Time: ${endpointStats.avg.toFixed(2)}ms`);
    console.log(`    95th percentile: ${endpointStats.p95.toFixed(2)}ms`);
  });
  
  if (results.errors.length > 0) {
    console.log(`\nErrors (${results.errors.length}):`);
    const errorCounts = {};
    results.errors.forEach(error => {
      const key = `${error.endpoint}: ${error.error || error.statusCode}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }
  
  // Performance evaluation
  console.log(`\nPerformance Evaluation:`);
  
  const isGoodPerformance = 
    stats.avg < 500 && // Average response time under 500ms
    stats.p95 < 1000 && // 95th percentile under 1s
    (results.successfulRequests / results.totalRequests) > 0.95; // 95% success rate
  
  if (isGoodPerformance) {
    console.log(`  ✅ GOOD PERFORMANCE - All metrics within acceptable ranges`);
  } else {
    console.log(`  ⚠️  PERFORMANCE ISSUES DETECTED:`);
    
    if (stats.avg >= 500) {
      console.log(`    - Average response time (${stats.avg.toFixed(2)}ms) exceeds 500ms threshold`);
    }
    
    if (stats.p95 >= 1000) {
      console.log(`    - 95th percentile response time (${stats.p95.toFixed(2)}ms) exceeds 1s threshold`);
    }
    
    if ((results.successfulRequests / results.totalRequests) <= 0.95) {
      console.log(`    - Success rate (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%) below 95% threshold`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

// Main test execution
async function runLoadTest() {
  console.log('Starting load test...');
  console.log(`Configuration: ${JSON.stringify(config, null, 2)}`);
  
  results.startTime = Date.now();
  const endTime = results.startTime + (config.testDuration * 1000);
  
  // Start user tests
  const userPromises = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    userPromises.push(runUserTest(i, results.startTime, endTime));
  }
  
  // Wait for all users to complete
  const userResults = await Promise.all(userPromises);
  
  // Aggregate results
  results.endTime = Date.now();
  
  userResults.forEach(userResult => {
    results.totalRequests += userResult.requests;
    results.successfulRequests += userResult.successful;
    results.failedRequests += userResult.failed;
    results.responseTimes.push(...userResult.responseTimes);
    results.errors.push(...userResult.errors);
    
    // Aggregate endpoint stats
    userResult.errors.forEach(error => {
      if (!results.endpointStats[error.endpoint]) {
        results.endpointStats[error.endpoint] = {
          requests: 0,
          successful: 0,
          failed: 0,
          responseTimes: []
        };
      }
      
      results.endpointStats[error.endpoint].requests++;
      results.endpointStats[error.endpoint].failed++;
    });
  });
  
  printResults();
  
  // Exit with appropriate code
  const successRate = results.successfulRequests / results.totalRequests;
  const avgResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
  
  if (successRate < 0.95 || avgResponseTime > 500) {
    console.log('\n❌ Load test failed - Performance issues detected');
    process.exit(1);
  } else {
    console.log('\n✅ Load test passed - Performance is acceptable');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  runLoadTest().catch(error => {
    console.error('Load test failed:', error);
    process.exit(1);
  });
}

module.exports = { runLoadTest, config };