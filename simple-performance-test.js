/**
 * Simple Performance Test
 */

import { getBeatsRepository } from './src/app/api/beats/factory';
import { performance } from 'perf_hooks';

async function runSimplePerformanceTest() {
  console.log('🚀 Simple Performance Test for Optimized Repository Pattern\n');
  
  const repository = getBeatsRepository();
  const iterations = 5;
  
  // Test optimized findAll
  console.log('📊 Testing Optimized findAll Performance:');
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await repository.findAll({}, { page: 1, pageSize: 10 });
    const end = performance.now();
    const duration = end - start;
    times.push(duration);
    
    console.log(`   Run ${i + 1}: ${duration.toFixed(2)}ms (${result.data.length} items, ${result.totalCount} total)`);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const bestTime = Math.min(...times);
  const worstTime = Math.max(...times);
  
  console.log(`\n📈 Results:`);
  console.log(`   Average: ${avgTime.toFixed(2)}ms`);
  console.log(`   Best: ${bestTime.toFixed(2)}ms`);
  console.log(`   Worst: ${worstTime.toFixed(2)}ms`);
  
  // Test search with caching
  console.log(`\n🔍 Testing Search Performance:`);
  const searchStart = performance.now();
  const searchResult1 = await repository.search('tech', 5);
  const searchTime1 = performance.now() - searchStart;
  
  const searchStart2 = performance.now();
  const searchResult2 = await repository.search('tech', 5); // Should hit cache
  const searchTime2 = performance.now() - searchStart2;
  
  console.log(`   First search: ${searchTime1.toFixed(2)}ms (${searchResult1.length} results)`);
  console.log(`   Cached search: ${searchTime2.toFixed(2)}ms (${searchResult2.length} results)`);
  console.log(`   Cache improvement: ${((searchTime1 - searchTime2) / searchTime1 * 100).toFixed(1)}%`);
  
  // Test stats query
  console.log(`\n📊 Testing Stats Query:`);
  const statsStart = performance.now();
  const stats = await repository.findWithStats();
  const statsTime = performance.now() - statsStart;
  
  console.log(`   Stats query: ${statsTime.toFixed(2)}ms (${stats.length} beats with stats)`);
  
  console.log(`\n🎯 Performance Summary:`);
  if (avgTime < 100) {
    console.log('   ✅ Excellent performance! Average query time under 100ms');
  } else if (avgTime < 300) {
    console.log('   ⚡ Good performance! Average query time under 300ms');
  } else {
    console.log('   ⚠️  Performance could be improved');
  }
  
  console.log(`\n🎉 Performance test completed!`);
}

runSimplePerformanceTest()
  .then(() => {
    console.log('\n✅ Performance test successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  });