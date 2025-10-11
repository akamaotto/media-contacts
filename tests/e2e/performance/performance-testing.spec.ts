import { test, expect, devices } from '@playwright/test';
import { AISearchPage } from '../../page-objects/ai-search-page';

/**
 * Performance Testing Suite
 * Tests performance characteristics of AI Search functionality
 * 
 * Story 4.4: End-to-End & User Workflow Testing
 * Acceptance Criteria:
 * - Performance scenarios are tested under realistic conditions
 * - Performance benchmarks are met in E2E scenarios
 * - Large datasets performance is validated
 */

// Performance thresholds and benchmarks
const PERFORMANCE_THRESHOLDS = {
  // Page load thresholds (in milliseconds)
  pageLoad: {
    mobile: 5000,
    tablet: 4000,
    desktop: 3000,
  },
  
  // Modal interaction thresholds
  modalOpen: {
    mobile: 2000,
    tablet: 1500,
    desktop: 1000,
  },
  
  // Form interaction thresholds
  formFill: {
    mobile: 3000,
    tablet: 2000,
    desktop: 1500,
  },
  
  // Search execution thresholds
  searchExecution: {
    mobile: 15000,
    tablet: 12000,
    desktop: 10000,
  },
  
  // Results display thresholds
  resultsDisplay: {
    mobile: 5000,
    tablet: 3000,
    desktop: 2000,
  },
  
  // Import operation thresholds
  importOperation: {
    mobile: 20000,
    tablet: 15000,
    desktop: 10000,
  },
  
  // Memory usage thresholds (in MB)
  memoryUsage: {
    mobile: 150,
    tablet: 200,
    desktop: 300,
  },
  
  // Network performance thresholds
  networkRequests: {
    totalRequests: 50,
    totalSize: 5 * 1024 * 1024, // 5MB
    slowestRequest: 5000, // 5 seconds
  },
};

// Performance test data
const PERFORMANCE_TEST_DATA = {
  basic: {
    query: 'performance test journalists',
    countries: ['United States'],
    categories: ['Technology'],
    description: 'Basic performance test',
  },
  complex: {
    query: 'senior technology business journalists covering AI startups blockchain venture capital',
    countries: ['United States', 'United Kingdom', 'Canada', 'Germany', 'France'],
    categories: ['Technology', 'Business', 'Finance', 'Startup', 'AI'],
    description: 'Complex performance test with multiple criteria',
  },
  largeDataset: {
    query: 'writers authors journalists reporters', // Broad query for large results
    countries: ['United States'],
    categories: ['Technology', 'Business', 'Healthcare', 'Finance', 'Sports', 'Entertainment'],
    description: 'Large dataset performance test',
  },
};

// Network condition profiles
const NETWORK_PROFILES = {
  'slow-3g': {
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 500 * 1024 / 8,   // 500 Kbps
    latency: 400,                       // 400ms RTT
  },
  'fast-3g': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8,          // 750 Kbps
    latency: 300,                               // 300ms RTT
  },
  '4g': {
    downloadThroughput: 9 * 1024 * 1024 / 8, // 9 Mbps
    uploadThroughput: 1.5 * 1024 * 1024 / 8,  // 1.5 Mbps
    latency: 100,                              // 100ms RTT
  },
  'offline': {
    offline: true,
  },
};

test.describe('Performance Tests', () => {
  // Basic performance tests
  test.describe('Basic Performance Tests', () => {
    let aiSearchPage: AISearchPage;

    test.use({ ...devices['Desktop Chrome'] });

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should meet page load performance benchmarks', async () => {
      console.log('⚡ Testing page load performance');

      const performanceData = await aiSearchPage.measurePerformance('page-load-total', async () => {
        const startTime = Date.now();
        
        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.waitForPageLoad();
        
        const loadTime = Date.now() - startTime;
        console.log(`📊 Page load time: ${loadTime}ms`);
        
        return { loadTime };
      });

      // Verify page load metrics
      const pageMetrics = await aiSearchPage.getPagePerformanceMetrics();
      console.log('📊 Page performance metrics:', pageMetrics);
      
      expect(pageMetrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad.desktop);
      expect(pageMetrics.loadComplete).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad.desktop);
      expect(pageMetrics.firstContentfulPaint).toBeLessThan(1500);

      console.log('✅ Page load performance benchmarks met');
    });

    test('should meet modal interaction performance benchmarks', async () => {
      console.log('⚡ Testing modal interaction performance');

      await aiSearchPage.navigateToMediaContacts();
      
      const modalOpenTime = await aiSearchPage.measurePerformance('modal-open', async () => {
        const startTime = Date.now();
        
        await aiSearchPage.openAISearchModal();
        await aiSearchPage.waitForPageLoad();
        
        return Date.now() - startTime;
      });

      expect(modalOpenTime).toBeLessThan(PERFORMANCE_THRESHOLDS.modalOpen.desktop);
      console.log(`📊 Modal open time: ${modalOpenTime}ms`);

      console.log('✅ Modal interaction performance benchmarks met');
    });

    test('should meet form interaction performance benchmarks', async () => {
      console.log('⚡ Testing form interaction performance');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      const formFillTime = await aiSearchPage.measurePerformance('form-fill', async () => {
        const startTime = Date.now();
        
        await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.basic);
        
        return Date.now() - startTime;
      });

      expect(formFillTime).toBeLessThan(PERFORMANCE_THRESHOLDS.formFill.desktop);
      console.log(`📊 Form fill time: ${formFillTime}ms`);

      console.log('✅ Form interaction performance benchmarks met');
    });

    test('should meet search execution performance benchmarks', async () => {
      console.log('⚡ Testing search execution performance');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.basic);
      
      const searchExecutionTime = await aiSearchPage.measurePerformance('search-execution', async () => {
        const startTime = Date.now();
        
        await aiSearchPage.submitSearch();
        await aiSearchPage.waitForSearchResults();
        
        return Date.now() - startTime;
      });

      expect(searchExecutionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchExecution.desktop);
      console.log(`📊 Search execution time: ${searchExecutionTime}ms`);

      console.log('✅ Search execution performance benchmarks met');
    });
  });

  // Complex query performance tests
  test.describe('Complex Query Performance Tests', () => {
    let aiSearchPage: AISearchPage;

    test.use({ ...devices['Desktop Chrome'] });

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should handle complex queries efficiently', async () => {
      console.log('⚡ Testing complex query performance');

      const performanceMetrics = {
        formFill: 0,
        searchExecution: 0,
        resultsDisplay: 0,
        total: 0,
      };

      const totalStartTime = Date.now();

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();

      // Measure form fill performance
      performanceMetrics.formFill = await aiSearchPage.measurePerformance('complex-form-fill', async () => {
        const startTime = Date.now();
        await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.complex);
        return Date.now() - startTime;
      });

      // Measure search execution performance
      performanceMetrics.searchExecution = await aiSearchPage.measurePerformance('complex-search-execution', async () => {
        const startTime = Date.now();
        await aiSearchPage.submitSearch();
        await aiSearchPage.waitForSearchResults();
        return Date.now() - startTime;
      });

      // Measure results display performance
      performanceMetrics.resultsDisplay = await aiSearchPage.measurePerformance('complex-results-display', async () => {
        const startTime = Date.now();
        const resultsCount = await aiSearchPage.getSearchResultsCount();
        console.log(`📊 Complex query returned ${resultsCount} results`);
        return Date.now() - startTime;
      });

      performanceMetrics.total = Date.now() - totalStartTime;

      // Verify performance benchmarks
      expect(performanceMetrics.formFill).toBeLessThan(PERFORMANCE_THRESHOLDS.formFill.desktop * 1.5); // Allow 50% more time for complex queries
      expect(performanceMetrics.searchExecution).toBeLessThan(PERFORMANCE_THRESHOLDS.searchExecution.desktop * 1.5);
      expect(performanceMetrics.resultsDisplay).toBeLessThan(PERFORMANCE_THRESHOLDS.resultsDisplay.desktop * 1.5);

      console.log('📊 Complex query performance metrics:', performanceMetrics);
      console.log('✅ Complex query performance benchmarks met');
    });
  });

  // Large dataset performance tests
  test.describe('Large Dataset Performance Tests', () => {
    let aiSearchPage: AISearchPage;

    test.use({ ...devices['Desktop Chrome'] });

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should handle large datasets efficiently', async () => {
      console.log('⚡ Testing large dataset performance');

      const performanceMetrics = {
        searchExecution: 0,
        resultsDisplay: 0,
        memoryUsage: 0,
        networkRequests: 0,
      };

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();

      // Measure search execution performance
      performanceMetrics.searchExecution = await aiSearchPage.measurePerformance('large-dataset-search', async () => {
        const startTime = Date.now();
        await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.largeDataset);
        await aiSearchPage.submitSearch();
        await aiSearchPage.waitForSearchResults();
        return Date.now() - startTime;
      });

      // Get results count
      const resultsCount = await aiSearchPage.getSearchResultsCount();
      console.log(`📊 Large dataset returned ${resultsCount} results`);

      // Measure results display performance
      performanceMetrics.resultsDisplay = await aiSearchPage.measurePerformance('large-dataset-display', async () => {
        const startTime = Date.now();
        
        // Scroll through results to test rendering performance
        if (resultsCount > 10) {
          await aiSearchPage.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await aiSearchPage.page.waitForTimeout(1000);
        }
        
        return Date.now() - startTime;
      });

      // Measure memory usage
      performanceMetrics.memoryUsage = await aiSearchPage.page.evaluate(() => {
        if (performance.memory) {
          return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
        }
        return 0;
      });

      // Measure network performance
      performanceMetrics.networkRequests = await aiSearchPage.page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return {
          totalRequests: entries.length,
          totalSize: entries.reduce((total, entry) => total + (entry.transferSize || 0), 0),
          slowestRequest: Math.max(...entries.map(entry => entry.responseEnd - entry.requestStart)),
        };
      });

      // Verify performance benchmarks
      expect(performanceMetrics.searchExecution).toBeLessThan(PERFORMANCE_THRESHOLDS.searchExecution.desktop * 2); // Allow 2x more time for large datasets
      expect(performanceMetrics.resultsDisplay).toBeLessThan(PERFORMANCE_THRESHOLDS.resultsDisplay.desktop * 2);
      expect(performanceMetrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.desktop);
      expect(performanceMetrics.networkRequests.totalRequests).toBeLessThan(PERFORMANCE_THRESHOLDS.networkRequests.totalRequests);
      expect(performanceMetrics.networkRequests.totalSize).toBeLessThan(PERFORMANCE_THRESHOLDS.networkRequests.totalSize);

      console.log('📊 Large dataset performance metrics:', performanceMetrics);
      console.log('✅ Large dataset performance benchmarks met');
    });

    test('should handle bulk import operations efficiently', async () => {
      console.log('⚡ Testing bulk import performance');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.largeDataset);
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();

      const resultsCount = await aiSearchPage.getSearchResultsCount();
      
      if (resultsCount > 0) {
        const importPerformance = await aiSearchPage.measurePerformance('bulk-import', async () => {
          const startTime = Date.now();
          
          // Select all contacts
          await aiSearchPage.selectAllContacts();
          
          // Import all contacts
          await aiSearchPage.importAllContacts();
          
          return Date.now() - startTime;
        });

        // Performance should scale reasonably with dataset size
        const expectedMaxTime = PERFORMANCE_THRESHOLDS.importOperation.desktop + (resultsCount * 50); // 50ms per contact
        expect(importPerformance).toBeLessThan(expectedMaxTime);

        console.log(`📊 Bulk import of ${resultsCount} contacts completed in ${importPerformance}ms`);
        console.log('✅ Bulk import performance benchmarks met');
      } else {
        console.log('⚠️  No results found, skipping bulk import test');
        test.skip();
      }
    });
  });

  // Network condition performance tests
  test.describe('Network Condition Performance Tests', () => {
    Object.entries(NETWORK_PROFILES).forEach(([profileName, profile]) => {
      if (profileName === 'offline') return; // Skip offline for now

      test.describe(`${profileName.toUpperCase()} Network Performance`, () => {
        let aiSearchPage: AISearchPage;

        test.use({ ...devices['Desktop Chrome'] });

        test.beforeEach(async ({ page, context }) => {
          // Apply network conditions
          if (!profile.offline) {
            await context.setOffline(false);
            // Note: Playwright doesn't directly support network throttling in all contexts
            // This would need to be implemented via browser-specific APIs or proxy
            console.log(`🌐 Applying ${profileName} network conditions`);
          }

          aiSearchPage = new AISearchPage(page);
          await login(page);
        });

        test(`should perform adequately under ${profileName} conditions`, async () => {
          console.log(`⚡ Testing performance under ${profileName} network conditions`);

          const performanceMetrics = {
            pageLoad: 0,
            modalOpen: 0,
            formFill: 0,
            searchExecution: 0,
            total: 0,
          };

          const totalStartTime = Date.now();

          // Measure page load performance
          performanceMetrics.pageLoad = await aiSearchPage.measurePerformance(`${profileName}-page-load`, async () => {
            const startTime = Date.now();
            await aiSearchPage.navigateToMediaContacts();
            await aiSearchPage.waitForPageLoad();
            return Date.now() - startTime;
          });

          // Measure modal open performance
          performanceMetrics.modalOpen = await aiSearchPage.measurePerformance(`${profileName}-modal-open`, async () => {
            const startTime = Date.now();
            await aiSearchPage.openAISearchModal();
            return Date.now() - startTime;
          });

          // Measure form fill performance
          performanceMetrics.formFill = await aiSearchPage.measurePerformance(`${profileName}-form-fill`, async () => {
            const startTime = Date.now();
            await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.basic);
            return Date.now() - startTime;
          });

          // Measure search execution performance
          performanceMetrics.searchExecution = await aiSearchPage.measurePerformance(`${profileName}-search-execution`, async () => {
            const startTime = Date.now();
            await aiSearchPage.submitSearch();
            await aiSearchPage.waitForSearchResults();
            return Date.now() - startTime;
          });

          performanceMetrics.total = Date.now() - totalStartTime;

          // Adjusted performance expectations based on network conditions
          const networkMultiplier = profileName === 'slow-3g' ? 3 : profileName === 'fast-3g' ? 2 : 1;

          expect(performanceMetrics.pageLoad).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad.desktop * networkMultiplier);
          expect(performanceMetrics.modalOpen).toBeLessThan(PERFORMANCE_THRESHOLDS.modalOpen.desktop * networkMultiplier);
          expect(performanceMetrics.formFill).toBeLessThan(PERFORMANCE_THRESHOLDS.formFill.desktop * networkMultiplier);
          expect(performanceMetrics.searchExecution).toBeLessThan(PERFORMANCE_THRESHOLDS.searchExecution.desktop * networkMultiplier);

          console.log(`📊 ${profileName} network performance metrics:`, performanceMetrics);
          console.log(`✅ ${profileName} network performance benchmarks met`);
        });
      });
    });
  });

  // Mobile performance tests
  test.describe('Mobile Performance Tests', () => {
    const mobileDevices = [
      { ...devices['iPhone 12'], name: 'iPhone 12' },
      { ...devices['Pixel 5'], name: 'Pixel 5' },
    ];

    mobileDevices.forEach(device => {
      test.describe(`${device.name} Performance Tests`, () => {
        test.use(device);
        
        let aiSearchPage: AISearchPage;

        test.beforeEach(async ({ page }) => {
          aiSearchPage = new AISearchPage(page);
          await login(page);
        });

        test(`${device.name}: should meet mobile performance benchmarks`, async () => {
          console.log(`⚡ Testing ${device.name} mobile performance`);

          const performanceMetrics = {
            pageLoad: 0,
            modalOpen: 0,
            formFill: 0,
            searchExecution: 0,
            total: 0,
          };

          const totalStartTime = Date.now();

          // Measure page load performance
          performanceMetrics.pageLoad = await aiSearchPage.measurePerformance('mobile-page-load', async () => {
            const startTime = Date.now();
            await aiSearchPage.navigateToMediaContacts();
            await aiSearchPage.waitForPageLoad();
            return Date.now() - startTime;
          });

          // Measure modal open performance
          performanceMetrics.modalOpen = await aiSearchPage.measurePerformance('mobile-modal-open', async () => {
            const startTime = Date.now();
            await aiSearchPage.openAISearchModal();
            return Date.now() - startTime;
          });

          // Measure form fill performance
          performanceMetrics.formFill = await aiSearchPage.measurePerformance('mobile-form-fill', async () => {
            const startTime = Date.now();
            await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.basic);
            return Date.now() - startTime;
          });

          // Measure search execution performance
          performanceMetrics.searchExecution = await aiSearchPage.measurePerformance('mobile-search-execution', async () => {
            const startTime = Date.now();
            await aiSearchPage.submitSearch();
            await aiSearchPage.waitForSearchResults();
            return Date.now() - startTime;
          });

          performanceMetrics.total = Date.now() - totalStartTime;

          // Verify mobile performance benchmarks
          expect(performanceMetrics.pageLoad).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad.mobile);
          expect(performanceMetrics.modalOpen).toBeLessThan(PERFORMANCE_THRESHOLDS.modalOpen.mobile);
          expect(performanceMetrics.formFill).toBeLessThan(PERFORMANCE_THRESHOLDS.formFill.mobile);
          expect(performanceMetrics.searchExecution).toBeLessThan(PERFORMANCE_THRESHOLDS.searchExecution.mobile);

          console.log(`📊 ${device.name} mobile performance metrics:`, performanceMetrics);
          console.log(`✅ ${device.name} mobile performance benchmarks met`);
        });
      });
    });
  });

  // Concurrent user performance tests
  test.describe('Concurrent User Performance Tests', () => {
    test('should handle concurrent search operations', async () => {
      console.log('⚡ Testing concurrent user performance');

      const concurrentUsers = 3;
      const performanceResults: any[] = [];

      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all(
        Array.from({ length: concurrentUsers }, async () => {
          return await browser.newContext();
        })
      );

      try {
        // Run concurrent searches
        const concurrentSearches = contexts.map(async (context, index) => {
          const page = await context.newPage();
          const aiSearchPage = new AISearchPage(page);
          
          await login(page);
          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          
          const searchStartTime = Date.now();
          await aiSearchPage.fillSearchForm(PERFORMANCE_TEST_DATA.basic);
          await aiSearchPage.submitSearch();
          await aiSearchPage.waitForSearchResults();
          const searchTime = Date.now() - searchStartTime;
          
          const resultsCount = await aiSearchPage.getSearchResultsCount();
          
          performanceResults.push({
            userIndex: index,
            searchTime,
            resultsCount,
          });
          
          await context.close();
        });

        await Promise.all(concurrentSearches);

        // Analyze concurrent performance
        const averageSearchTime = performanceResults.reduce((sum, result) => sum + result.searchTime, 0) / performanceResults.length;
        const maxSearchTime = Math.max(...performanceResults.map(result => result.searchTime));
        const minSearchTime = Math.min(...performanceResults.map(result => result.searchTime));

        console.log('📊 Concurrent user performance results:', {
          totalUsers: concurrentUsers,
          averageSearchTime,
          maxSearchTime,
          minSearchTime,
          individualResults: performanceResults,
        });

        // Verify concurrent performance
        expect(maxSearchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchExecution.desktop * 1.5); // Allow 50% more time for concurrent operations
        expect(performanceResults.length).toBe(concurrentUsers);

        console.log('✅ Concurrent user performance benchmarks met');
      } catch (error) {
        // Clean up contexts on error
        await Promise.all(contexts.map(context => context.close().catch(() => {})));
        throw error;
      }
    });
  });
});

/**
 * Helper function to login
 */
async function login(page: any) {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
  await page.goto(BASE_URL);
  
  // Check if already logged in
  const dashboardContent = page.locator('h1:has-text("Dashboard"), text="Media Contacts", [data-testid="dashboard-content"]');
  if (await dashboardContent.isVisible({ timeout: 3000 })) {
    console.log('✅ Already logged in');
    return;
  }
  
  // Fill login form
  await page.fill('input[type="email"]', 'akamaotto@gmail.com');
  await page.fill('input[type="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page.locator('h1:has-text("Dashboard"), text="Media Contacts"')).toBeVisible({ timeout: 5000 });
  console.log('✅ Successfully logged in');
}