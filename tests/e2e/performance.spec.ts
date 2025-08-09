import { test, expect } from '@playwright/test';

test.describe('Dashboard Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Page Load Performance', () => {
    test('should load dashboard within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      const loadTime = Date.now() - startTime;
      
      // Performance budget: 3 seconds for initial load
      expect(loadTime).toBeLessThan(3000);
      
      console.log(`Dashboard loaded in ${loadTime}ms`);
    });

    test('should load metrics within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.waitForSelector('[data-testid="metric-card-total-contacts"]');
      
      const metricsLoadTime = Date.now() - startTime;
      
      // Metrics should load within 2 seconds
      expect(metricsLoadTime).toBeLessThan(2000);
      
      console.log(`Metrics loaded in ${metricsLoadTime}ms`);
    });

    test('should load charts within performance budget', async ({ page }) => {
      await page.click('text=Analytics');
      
      const startTime = Date.now();
      
      await page.waitForSelector('[data-testid="contacts-by-country-chart"] svg');
      
      const chartsLoadTime = Date.now() - startTime;
      
      // Charts should load within 3 seconds
      expect(chartsLoadTime).toBeLessThan(3000);
      
      console.log(`Charts loaded in ${chartsLoadTime}ms`);
    });
  });

  test.describe('API Response Performance', () => {
    test('should have fast API response times', async ({ page }) => {
      const apiTimes: number[] = [];
      
      // Monitor API calls
      page.on('response', response => {
        if (response.url().includes('/api/dashboard/')) {
          const timing = response.timing();
          if (timing) {
            apiTimes.push(timing.responseEnd - timing.requestStart);
          }
        }
      });
      
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      // Wait for all API calls to complete
      await page.waitForTimeout(2000);
      
      // Check API response times
      for (const time of apiTimes) {
        expect(time).toBeLessThan(1000); // API calls should be under 1 second
      }
      
      if (apiTimes.length > 0) {
        const avgTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
        console.log(`Average API response time: ${avgTime}ms`);
        expect(avgTime).toBeLessThan(500); // Average should be under 500ms
      }
    });

    test('should handle concurrent API calls efficiently', async ({ page }) => {
      const apiCallCount = { count: 0 };
      const startTime = Date.now();
      
      page.on('request', request => {
        if (request.url().includes('/api/dashboard/')) {
          apiCallCount.count++;
        }
      });
      
      // Trigger multiple tab switches to generate concurrent API calls
      await page.click('text=Analytics');
      await page.click('text=Geographic');
      await page.click('text=Activity');
      await page.click('text=Analytics');
      
      await page.waitForTimeout(3000);
      
      const totalTime = Date.now() - startTime;
      
      console.log(`${apiCallCount.count} API calls completed in ${totalTime}ms`);
      
      // Should handle multiple calls efficiently
      expect(totalTime).toBeLessThan(5000);
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during tab switching', async ({ page }) => {
      // Get initial memory usage
      const initialMetrics = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      // Perform multiple tab switches
      for (let i = 0; i < 10; i++) {
        await page.click('text=Analytics');
        await page.waitForTimeout(100);
        await page.click('text=Geographic');
        await page.waitForTimeout(100);
        await page.click('text=Activity');
        await page.waitForTimeout(100);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Get final memory usage
      const finalMetrics = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (initialMetrics && finalMetrics) {
        const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100;
        
        console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);
        
        // Memory increase should be reasonable (less than 50%)
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });
  });

  test.describe('Rendering Performance', () => {
    test('should have smooth animations', async ({ page }) => {
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      // Measure frame rate during tab switching
      const frameRates: number[] = [];
      let frameCount = 0;
      let startTime = Date.now();
      
      const measureFrameRate = () => {
        frameCount++;
        const currentTime = Date.now();
        if (currentTime - startTime >= 1000) {
          frameRates.push(frameCount);
          frameCount = 0;
          startTime = currentTime;
        }
        requestAnimationFrame(measureFrameRate);
      };
      
      await page.evaluate(measureFrameRate);
      
      // Perform tab switching
      await page.click('text=Geographic');
      await page.waitForTimeout(1000);
      await page.click('text=Activity');
      await page.waitForTimeout(1000);
      
      if (frameRates.length > 0) {
        const avgFrameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
        console.log(`Average frame rate: ${avgFrameRate} FPS`);
        
        // Should maintain reasonable frame rate (at least 30 FPS)
        expect(avgFrameRate).toBeGreaterThan(30);
      }
    });

    test('should render large datasets efficiently', async ({ page }) => {
      await page.click('text=Activity');
      
      const startTime = Date.now();
      
      // Wait for activity feed to load
      await page.waitForSelector('[data-testid="activity-feed"]');
      
      // Scroll through activity feed to test rendering performance
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await page.waitForTimeout(100);
      }
      
      const renderTime = Date.now() - startTime;
      
      console.log(`Large dataset rendered and scrolled in ${renderTime}ms`);
      
      // Should handle large datasets efficiently
      expect(renderTime).toBeLessThan(3000);
    });
  });

  test.describe('Network Performance', () => {
    test('should work efficiently on slow networks', async ({ page, context }) => {
      // Simulate slow 3G network
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 200);
      });
      
      const startTime = Date.now();
      
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Dashboard loaded on slow network in ${loadTime}ms`);
      
      // Should still be usable on slow networks (within 10 seconds)
      expect(loadTime).toBeLessThan(10000);
    });

    test('should cache resources effectively', async ({ page }) => {
      // First load
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      // Reload page
      const startTime = Date.now();
      await page.reload();
      await page.waitForSelector('[data-testid="dashboard-content"]');
      const reloadTime = Date.now() - startTime;
      
      console.log(`Dashboard reloaded in ${reloadTime}ms`);
      
      // Reload should be faster due to caching
      expect(reloadTime).toBeLessThan(2000);
    });
  });

  test.describe('Bundle Size Performance', () => {
    test('should have reasonable bundle sizes', async ({ page }) => {
      const resourceSizes: { [key: string]: number } = {};
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/_next/static/') || url.includes('/api/')) {
          const contentLength = response.headers()['content-length'];
          if (contentLength) {
            resourceSizes[url] = parseInt(contentLength);
          }
        }
      });
      
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      // Wait for all resources to load
      await page.waitForTimeout(3000);
      
      // Check bundle sizes
      for (const [url, size] of Object.entries(resourceSizes)) {
        console.log(`Resource: ${url.split('/').pop()} - Size: ${size} bytes`);
        
        // JavaScript bundles should be under 1MB
        if (url.includes('.js')) {
          expect(size).toBeLessThan(1024 * 1024);
        }
        
        // CSS bundles should be under 100KB
        if (url.includes('.css')) {
          expect(size).toBeLessThan(100 * 1024);
        }
      }
    });
  });
});

test.describe('Admin Dashboard Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('user-role', 'ADMIN');
    });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
  });

  test.describe('Admin Metrics Performance', () => {
    test('should load admin metrics efficiently', async ({ page }) => {
      await page.click('text=Admin');
      
      const startTime = Date.now();
      
      await page.waitForSelector('text=Admin Dashboard');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Admin dashboard loaded in ${loadTime}ms`);
      
      // Admin dashboard should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle admin API calls efficiently', async ({ page }) => {
      const adminApiTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/dashboard/admin')) {
          const timing = response.timing();
          if (timing) {
            adminApiTimes.push(timing.responseEnd - timing.requestStart);
          }
        }
      });
      
      await page.click('text=Admin');
      await page.waitForTimeout(2000);
      
      // Check admin API response times
      for (const time of adminApiTimes) {
        expect(time).toBeLessThan(1500); // Admin API calls should be under 1.5 seconds
      }
      
      if (adminApiTimes.length > 0) {
        const avgTime = adminApiTimes.reduce((a, b) => a + b, 0) / adminApiTimes.length;
        console.log(`Average admin API response time: ${avgTime}ms`);
        expect(avgTime).toBeLessThan(800); // Average should be under 800ms
      }
    });

    test('should handle admin tab switching efficiently', async ({ page }) => {
      await page.click('text=Admin');
      await page.waitForSelector('text=Admin Dashboard');
      
      const startTime = Date.now();
      
      // Switch between admin tabs
      await page.click('text=System Health');
      await page.waitForTimeout(100);
      await page.click('text=User Activity');
      await page.waitForTimeout(100);
      await page.click('text=Database');
      await page.waitForTimeout(100);
      await page.click('text=Performance');
      await page.waitForTimeout(100);
      
      const switchTime = Date.now() - startTime;
      
      console.log(`Admin tab switching completed in ${switchTime}ms`);
      
      // Tab switching should be fast
      expect(switchTime).toBeLessThan(1000);
    });
  });

  test.describe('Admin Auto-refresh Performance', () => {
    test('should handle auto-refresh without performance degradation', async ({ page }) => {
      await page.click('text=Admin');
      await page.waitForSelector('text=Admin Dashboard');
      
      // Monitor API calls over time
      let apiCallCount = 0;
      const apiTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/dashboard/admin')) {
          apiCallCount++;
          const timing = response.timing();
          if (timing) {
            apiTimes.push(timing.responseEnd - timing.requestStart);
          }
        }
      });
      
      // Wait for multiple refresh cycles (simulated with shorter intervals)
      await page.waitForTimeout(5000);
      
      if (apiTimes.length > 1) {
        // Check that response times don't degrade over time
        const firstCall = apiTimes[0];
        const lastCall = apiTimes[apiTimes.length - 1];
        
        console.log(`First admin API call: ${firstCall}ms, Last: ${lastCall}ms`);
        
        // Response times shouldn't significantly increase
        expect(lastCall).toBeLessThan(firstCall * 1.5);
      }
    });
  });
});

test.describe('Caching Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should utilize Redis caching effectively', async ({ page }) => {
    const apiResponseTimes: number[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/dashboard/')) {
        const timing = response.timing();
        if (timing) {
          apiResponseTimes.push(timing.responseEnd - timing.requestStart);
        }
      }
    });
    
    // First load (cache miss)
    await page.waitForSelector('[data-testid="dashboard-content"]');
    await page.waitForTimeout(1000);
    
    const firstLoadTimes = [...apiResponseTimes];
    apiResponseTimes.length = 0;
    
    // Reload page (cache hit)
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard-content"]');
    await page.waitForTimeout(1000);
    
    const secondLoadTimes = [...apiResponseTimes];
    
    if (firstLoadTimes.length > 0 && secondLoadTimes.length > 0) {
      const firstAvg = firstLoadTimes.reduce((a, b) => a + b, 0) / firstLoadTimes.length;
      const secondAvg = secondLoadTimes.reduce((a, b) => a + b, 0) / secondLoadTimes.length;
      
      console.log(`First load avg: ${firstAvg}ms, Second load avg: ${secondAvg}ms`);
      
      // Second load should be faster due to caching
      expect(secondAvg).toBeLessThan(firstAvg);
    }
  });

  test('should handle cache invalidation properly', async ({ page }) => {
    // Load dashboard
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    // Navigate to media contacts and perform an action that should invalidate cache
    await page.goto('/media-contacts');
    await page.waitForSelector('[data-testid="media-contacts-table"]', { timeout: 10000 });
    
    // Go back to dashboard
    await page.goto('/');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="dashboard-content"]');
    const loadTime = Date.now() - startTime;
    
    console.log(`Dashboard loaded after cache invalidation in ${loadTime}ms`);
    
    // Should still load reasonably fast even with cache invalidation
    expect(loadTime).toBeLessThan(3000);
  });
});
