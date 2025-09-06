/**
 * Performance Test for Repository Pattern Optimizations
 */

import { getBeatsRepository } from './src/app/api/beats/factory';
import { performance } from 'perf_hooks';
import { cacheService } from './src/app/api/shared/cache-service';
import { queryOptimizer } from './src/app/api/shared/query-optimizer';

async function runPerformanceTests() {
  console.log('🚀 Performance Optimization Test Suite\n');
  
  const repository = getBeatsRepository();
  const iterations = 10;
  
  // Test 1: Basic findAll performance
  console.log('📊 Test 1: Basic findAll Performance');
  const findAllTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await repository.findAll({}, { page: 1, pageSize: 10 });
    const end = performance.now();
    findAllTimes.push(end - start);
    
    if (i === 0) {
      console.log(`   First run (cold): ${(end - start).toFixed(2)}ms`);
    }
  }
  
  const avgFindAll = findAllTimes.reduce((a, b) => a + b, 0) / findAllTimes.length;
  console.log(`   Average: ${avgFindAll.toFixed(2)}ms`);
  console.log(`   Best: ${Math.min(...findAllTimes).toFixed(2)}ms`);
  console.log(`   Worst: ${Math.max(...findAllTimes).toFixed(2)}ms`);
  
  // Test 2: Search performance with caching
  console.log('\n📊 Test 2: Search Performance with Caching');
  const searchTerms = ['ai', 'tech', 'business', 'health', 'sports'];
  
  for (const term of searchTerms) {
    const firstRun = performance.now();
    await repository.search(term, 5);
    const firstTime = performance.now() - firstRun;
    
    const secondRun = performance.now();
    await repository.search(term, 5); // Should hit cache
    const secondTime = performance.now() - secondRun;
    
    const improvement = ((firstTime - secondTime) / firstTime * 100).toFixed(1);
    console.log(`   "${term}": ${firstTime.toFixed(2)}ms → ${secondTime.toFixed(2)}ms (${improvement}% faster)`);
  }
  
  // Test 3: Pagination performance
  console.log('\n📊 Test 3: Pagination Performance');
  const pages = [1, 2, 5, 10];
  
  for (const page of pages) {
    const start = performance.now();
    const result = await repository.findAll({}, { page, pageSize: 10 });
    const end = performance.now();
    
    console.log(`   Page ${page}: ${(end - start).toFixed(2)}ms (${result.data.length} items)`);
  }
  
  // Test 4: Stats query performance
  console.log('\n📊 Test 4: Stats Query Performance');
  const statsRuns = [];
  
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await repository.findWithStats();
    const end = performance.now();
    statsRuns.push(end - start);
    
    if (i === 0) {
      console.log(`   First run (cold): ${(end - start).toFixed(2)}ms`);
    }
  }
  
  const avgStats = statsRuns.reduce((a, b) => a + b, 0) / statsRuns.length;
  console.log(`   Average: ${avgStats.toFixed(2)}ms`);
  
  // Test 5: Cache effectiveness
  console.log('\n📊 Test 5: Cache Effectiveness');
  const cacheStats = cacheService.getStats();
  console.log(`   Cache items: ${cacheStats.totalItems}`);
  console.log(`   Hit rate: ${cacheStats.hitRate.toFixed(2)}`);
  console.log(`   Memory usage: ${(cacheStats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  
  // Test 6: Query optimization stats
  console.log('\n📊 Test 6: Query Optimization Analysis');
  const perfStats = queryOptimizer.getPerformanceStats();
  console.log(`   Total queries: ${perfStats.totalQueries}`);
  console.log(`   Average query time: ${perfStats.averageQueryTime.toFixed(2)}ms`);
  console.log(`   Slow queries: ${perfStats.slowQueries.length}`);
  
  // Performance summary
  console.log('\n🎯 Performance Summary:');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│                OPTIMIZATION RESULTS                 │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Average Query Time:    ${avgFindAll.toFixed(2)}ms                  │`);
  console.log(`│ Best Query Time:       ${Math.min(...findAllTimes).toFixed(2)}ms                  │`);
  console.log(`│ Cache Hit Rate:        ${cacheStats.hitRate.toFixed(2)}                      │`);
  console.log(`│ Memory Usage:          ${(cacheStats.memoryUsage / 1024 / 1024).toFixed(2)}MB                  │`);
  console.log('└─────────────────────────────────────────────────────┘\n');
  
  console.log('\n🎉 Performance test completed!');
}

// Run the tests
runPerformanceTests()
  .then(() => {
    console.log('\n✅ All performance tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Performance tests failed:', error);
    process.exit(1);
  });