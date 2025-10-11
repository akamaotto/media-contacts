import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  const artifactsDir = path.join(process.cwd(), 'test-results');
  
  // Clean up old test artifacts (keep last 5 runs)
  try {
    if (fs.existsSync(artifactsDir)) {
      const items = fs.readdirSync(artifactsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          name: dirent.name,
          time: fs.statSync(path.join(artifactsDir, dirent.name)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only the 5 most recent test runs
      const toDelete = items.slice(5);
      for (const item of toDelete) {
        const itemPath = path.join(artifactsDir, item.name);
        fs.rmSync(itemPath, { recursive: true, force: true });
        console.log(`🗑️  Cleaned up old test artifacts: ${item.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Error during artifact cleanup:', error);
  }
  
  // Generate test summary report
  try {
    const reportsDir = path.join(artifactsDir, 'reports');
    if (fs.existsSync(reportsDir)) {
      const resultsPath = path.join(reportsDir, 'results.json');
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Generate summary
        const summary = {
          timestamp: new Date().toISOString(),
          totalTests: results.suites?.reduce((acc: number, suite: any) => 
            acc + (suite.specs?.length || 0), 0) || 0,
          passed: results.suites?.reduce((acc: number, suite: any) => 
            acc + (suite.specs?.filter((spec: any) => spec.ok).length || 0), 0) || 0,
          failed: results.suites?.reduce((acc: number, suite: any) => 
            acc + (suite.specs?.filter((spec: any) => !spec.ok).length || 0), 0) || 0,
          duration: results.stats?.duration || 0,
          browsers: results.projects?.map((p: any) => p.name) || [],
        };
        
        const summaryPath = path.join(reportsDir, 'summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        console.log('📊 Test summary generated:', {
          total: summary.totalTests,
          passed: summary.passed,
          failed: summary.failed,
          duration: `${Math.round(summary.duration / 1000)}s`,
        });
      }
    }
  } catch (error) {
    console.warn('⚠️  Error generating test summary:', error);
  }
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;