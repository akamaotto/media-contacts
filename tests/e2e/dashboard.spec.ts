import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - assume user is logged in
    await page.goto('/');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 });
  });

  test.describe('Dashboard Navigation', () => {
    test('should display main dashboard tabs', async ({ page }) => {
      // Check that all main tabs are present
      await expect(page.locator('text=Analytics')).toBeVisible();
      await expect(page.locator('text=Geographic')).toBeVisible();
      await expect(page.locator('text=Activity')).toBeVisible();
    });

    test('should switch between dashboard tabs', async ({ page }) => {
      // Click on Geographic tab
      await page.click('text=Geographic');
      await expect(page.locator('[data-testid="geographic-visualization"]')).toBeVisible();

      // Click on Activity tab
      await page.click('text=Activity');
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();

      // Click back to Analytics tab
      await page.click('text=Analytics');
      await expect(page.locator('[data-testid="charts-section"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Metrics', () => {
    test('should display dashboard metrics cards', async ({ page }) => {
      // Check for metrics cards
      await expect(page.locator('text=Total Contacts')).toBeVisible();
      await expect(page.locator('text=Total Publishers')).toBeVisible();
      await expect(page.locator('text=Total Outlets')).toBeVisible();
      await expect(page.locator('text=Verified Contacts')).toBeVisible();
    });

    test('should display metric values', async ({ page }) => {
      // Wait for metrics to load and check they have numeric values
      const totalContactsCard = page.locator('[data-testid="metric-card-total-contacts"]');
      await expect(totalContactsCard).toBeVisible();
      
      const contactsValue = await totalContactsCard.locator('.text-2xl').textContent();
      expect(contactsValue).toMatch(/^\d+$/); // Should be a number
    });

    test('should allow time range selection', async ({ page }) => {
      // Find and click time range selector
      const timeRangeSelector = page.locator('[data-testid="time-range-selector"]');
      await expect(timeRangeSelector).toBeVisible();
      
      // Click on 7 days option
      await page.click('text=7 days');
      
      // Verify metrics update (wait for loading to complete)
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="metric-card-total-contacts"]')).toBeVisible();
    });
  });

  test.describe('Charts Section', () => {
    test('should display charts in analytics tab', async ({ page }) => {
      // Ensure we're on Analytics tab
      await page.click('text=Analytics');
      
      // Check for chart containers
      await expect(page.locator('[data-testid="contacts-by-country-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="contacts-by-beat-chart"]')).toBeVisible();
    });

    test('should display chart data', async ({ page }) => {
      await page.click('text=Analytics');
      
      // Wait for charts to load
      await page.waitForSelector('[data-testid="contacts-by-country-chart"]');
      
      // Check that chart has data (SVG elements should be present)
      const chartSvg = page.locator('[data-testid="contacts-by-country-chart"] svg');
      await expect(chartSvg).toBeVisible();
    });
  });

  test.describe('Geographic Visualization', () => {
    test('should display geographic visualization', async ({ page }) => {
      await page.click('text=Geographic');
      
      // Wait for geographic visualization to load
      await expect(page.locator('[data-testid="geographic-visualization"]')).toBeVisible();
      
      // Check for map or geographic data display
      await expect(page.locator('[data-testid="geographic-chart"]')).toBeVisible();
    });

    test('should have geographic filters', async ({ page }) => {
      await page.click('text=Geographic');
      
      // Check for filter controls
      await expect(page.locator('[data-testid="geographic-filters"]')).toBeVisible();
    });
  });

  test.describe('Activity Feed', () => {
    test('should display activity feed', async ({ page }) => {
      await page.click('text=Activity');
      
      // Wait for activity feed to load
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      
      // Check for activity items
      const activityItems = page.locator('[data-testid="activity-item"]');
      await expect(activityItems.first()).toBeVisible();
    });

    test('should display activity filters', async ({ page }) => {
      await page.click('text=Activity');
      
      // Check for activity filters
      await expect(page.locator('[data-testid="activity-filters"]')).toBeVisible();
    });

    test('should filter activities by type', async ({ page }) => {
      await page.click('text=Activity');
      
      // Wait for activity feed to load
      await page.waitForSelector('[data-testid="activity-feed"]');
      
      // Click on a filter option (e.g., "Create" filter)
      const createFilter = page.locator('[data-testid="filter-create"]');
      if (await createFilter.isVisible()) {
        await createFilter.click();
        
        // Wait for filtered results
        await page.waitForTimeout(500);
        
        // Verify filtered results
        const activityItems = page.locator('[data-testid="activity-item"]');
        await expect(activityItems.first()).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('/api/dashboard/metrics', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.reload();
      
      // Check for error boundary or error message
      await expect(page.locator('text=Something went wrong')).toBeVisible({ timeout: 10000 });
    });

    test('should display loading states', async ({ page }) => {
      // Intercept API calls to delay responses
      await page.route('/api/dashboard/metrics', route => {
        setTimeout(() => {
          route.continue();
        }, 2000);
      });

      await page.reload();
      
      // Check for loading skeleton or spinner
      await expect(page.locator('[data-testid="metrics-skeleton"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that dashboard is still functional
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Check that tabs are accessible on mobile
      await expect(page.locator('text=Analytics')).toBeVisible();
      await page.click('text=Geographic');
      await expect(page.locator('[data-testid="geographic-visualization"]')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check that dashboard layout adapts
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Test tab navigation on tablet
      await page.click('text=Activity');
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle multiple tab switches efficiently', async ({ page }) => {
      // Rapidly switch between tabs
      for (let i = 0; i < 3; i++) {
        await page.click('text=Analytics');
        await page.waitForTimeout(100);
        await page.click('text=Geographic');
        await page.waitForTimeout(100);
        await page.click('text=Activity');
        await page.waitForTimeout(100);
      }
      
      // Verify final state is correct
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    });
  });
});

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('user-role', 'ADMIN');
    });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
  });

  test.describe('Admin Tab Visibility', () => {
    test('should show admin tab for admin users', async ({ page }) => {
      // Check that admin tab is visible
      await expect(page.locator('text=Admin')).toBeVisible();
    });

    test('should display admin dashboard content', async ({ page }) => {
      await page.click('text=Admin');
      
      // Wait for admin dashboard to load
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
      await expect(page.locator('text=Admin Only')).toBeVisible();
    });
  });

  test.describe('Admin Dashboard Tabs', () => {
    test('should display all admin dashboard tabs', async ({ page }) => {
      await page.click('text=Admin');
      
      // Check for admin dashboard tabs
      await expect(page.locator('text=System Health')).toBeVisible();
      await expect(page.locator('text=User Activity')).toBeVisible();
      await expect(page.locator('text=Database')).toBeVisible();
      await expect(page.locator('text=Performance')).toBeVisible();
    });

    test('should switch between admin dashboard tabs', async ({ page }) => {
      await page.click('text=Admin');
      
      // Test System Health tab
      await page.click('text=System Health');
      await expect(page.locator('text=System Uptime')).toBeVisible();
      await expect(page.locator('text=Memory Usage')).toBeVisible();
      
      // Test User Activity tab
      await page.click('text=User Activity');
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Most Active Users')).toBeVisible();
      
      // Test Database tab
      await page.click('text=Database');
      await expect(page.locator('text=Media Contacts')).toBeVisible();
      await expect(page.locator('text=Database Size')).toBeVisible();
      
      // Test Performance tab
      await page.click('text=Performance');
      await expect(page.locator('text=Avg Response Time')).toBeVisible();
      await expect(page.locator('text=API Endpoint Performance')).toBeVisible();
    });
  });

  test.describe('System Health Monitoring', () => {
    test('should display system health metrics', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=System Health');
      
      // Check for system health cards
      await expect(page.locator('text=System Uptime')).toBeVisible();
      await expect(page.locator('text=Memory Usage')).toBeVisible();
      await expect(page.locator('text=DB Connections')).toBeVisible();
      await expect(page.locator('text=Cache Status')).toBeVisible();
    });

    test('should show memory usage with progress bar', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=System Health');
      
      // Check for memory usage progress bar
      const memoryCard = page.locator('text=Memory Usage').locator('..');
      await expect(memoryCard.locator('[role="progressbar"]')).toBeVisible();
    });
  });

  test.describe('User Activity Monitoring', () => {
    test('should display user activity metrics', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=User Activity');
      
      // Check for user activity metrics
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Today')).toBeVisible();
      await expect(page.locator('text=Active This Week')).toBeVisible();
      await expect(page.locator('text=New This Month')).toBeVisible();
    });

    test('should display most active users list', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=User Activity');
      
      // Check for most active users section
      await expect(page.locator('text=Most Active Users')).toBeVisible();
      
      // Check for user entries (if any exist)
      const userEntries = page.locator('[data-testid="active-user-entry"]');
      if (await userEntries.count() > 0) {
        await expect(userEntries.first()).toBeVisible();
      }
    });
  });

  test.describe('Database Monitoring', () => {
    test('should display database metrics', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=Database');
      
      // Check for database record counts
      await expect(page.locator('text=Media Contacts')).toBeVisible();
      await expect(page.locator('text=Publishers')).toBeVisible();
      await expect(page.locator('text=Outlets')).toBeVisible();
    });

    test('should display database size information', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=Database');
      
      // Check for database size section
      await expect(page.locator('text=Database Size')).toBeVisible();
      await expect(page.locator('text=Total Size')).toBeVisible();
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should display performance metrics', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=Performance');
      
      // Check for performance metrics
      await expect(page.locator('text=Avg Response Time')).toBeVisible();
      await expect(page.locator('text=Error Rate')).toBeVisible();
      await expect(page.locator('text=Slow Queries')).toBeVisible();
    });

    test('should display API endpoint statistics', async ({ page }) => {
      await page.click('text=Admin');
      await page.click('text=Performance');
      
      // Check for API endpoint performance section
      await expect(page.locator('text=API Endpoint Performance')).toBeVisible();
    });
  });

  test.describe('Admin Dashboard Auto-refresh', () => {
    test('should auto-refresh admin metrics', async ({ page }) => {
      await page.click('text=Admin');
      
      // Mock API response to track refresh calls
      let apiCallCount = 0;
      await page.route('/api/dashboard/admin', route => {
        apiCallCount++;
        route.continue();
      });
      
      // Wait for initial load
      await page.waitForTimeout(1000);
      const initialCallCount = apiCallCount;
      
      // Wait for auto-refresh (2 minutes in real implementation, but we'll test with shorter interval)
      await page.waitForTimeout(3000);
      
      // Verify that additional API calls were made
      expect(apiCallCount).toBeGreaterThan(initialCallCount);
    });
  });
});
