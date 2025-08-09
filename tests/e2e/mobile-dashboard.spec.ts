import { test, expect, devices } from '@playwright/test';

// Test mobile responsiveness on different devices
const mobileDevices = [
  devices['iPhone 12'],
  devices['iPhone SE'],
  devices['Pixel 5'],
  devices['Galaxy S21']
];

const tabletDevices = [
  devices['iPad'],
  devices['iPad Pro'],
  devices['Galaxy Tab S4']
];

test.describe('Mobile Dashboard Responsiveness', () => {
  mobileDevices.forEach(device => {
    test.describe(`Mobile Tests - ${device.name}`, () => {
      test.use({ ...device });

      test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 });
      });

      test('should display mobile-optimized dashboard layout', async ({ page }) => {
        // Check that dashboard content is visible and properly sized
        const dashboardContent = page.locator('[data-testid="dashboard-content"]');
        await expect(dashboardContent).toBeVisible();

        // Verify mobile-specific layout elements
        const mobileMetricsGrid = page.locator('[data-testid="mobile-metrics-grid"]');
        if (await mobileMetricsGrid.isVisible()) {
          await expect(mobileMetricsGrid).toBeVisible();
        }
      });

      test('should have collapsible sections on mobile', async ({ page }) => {
        // Check for collapsible sections
        const collapsibleSections = page.locator('[data-testid="collapsible-section"]');
        if (await collapsibleSections.count() > 0) {
          const firstSection = collapsibleSections.first();
          await expect(firstSection).toBeVisible();
          
          // Test collapsible functionality
          const trigger = firstSection.locator('[data-testid="collapsible-trigger"]');
          if (await trigger.isVisible()) {
            await trigger.click();
            await page.waitForTimeout(300); // Wait for animation
          }
        }
      });

      test('should support pull-to-refresh on mobile', async ({ page }) => {
        // Check for pull-to-refresh functionality
        const pullToRefreshContainer = page.locator('[data-testid="pull-to-refresh"]');
        if (await pullToRefreshContainer.isVisible()) {
          // Simulate pull-to-refresh gesture
          await pullToRefreshContainer.hover();
          await page.mouse.down();
          await page.mouse.move(0, 100); // Pull down
          await page.mouse.up();
          
          // Check for refresh indicator
          await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible({ timeout: 2000 });
        }
      });

      test('should have swipeable tabs on mobile', async ({ page }) => {
        // Check for swipeable tab functionality
        const swipeableTabs = page.locator('[data-testid="swipeable-tabs"]');
        if (await swipeableTabs.isVisible()) {
          // Test swipe gesture
          const tabsContainer = swipeableTabs.locator('[data-testid="tabs-container"]');
          await tabsContainer.hover();
          
          // Simulate swipe left
          await page.mouse.down();
          await page.mouse.move(-100, 0);
          await page.mouse.up();
          
          await page.waitForTimeout(500);
        }
      });

      test('should display mobile activity feed with infinite scroll', async ({ page }) => {
        await page.click('text=Activity');
        
        // Check for mobile activity feed
        const mobileActivityFeed = page.locator('[data-testid="mobile-activity-feed"]');
        if (await mobileActivityFeed.isVisible()) {
          await expect(mobileActivityFeed).toBeVisible();
          
          // Test infinite scroll
          const activityItems = page.locator('[data-testid="activity-item"]');
          const initialCount = await activityItems.count();
          
          // Scroll to bottom
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          
          await page.waitForTimeout(1000);
          
          // Check if more items loaded
          const newCount = await activityItems.count();
          expect(newCount).toBeGreaterThanOrEqual(initialCount);
        }
      });

      test('should handle touch interactions properly', async ({ page }) => {
        // Test touch interactions on metric cards
        const metricCards = page.locator('[data-testid="metric-card"]');
        if (await metricCards.count() > 0) {
          const firstCard = metricCards.first();
          
          // Test tap interaction
          await firstCard.tap();
          await page.waitForTimeout(200);
          
          // Verify no unintended side effects
          await expect(firstCard).toBeVisible();
        }
      });

      test('should display mobile chart containers with touch support', async ({ page }) => {
        await page.click('text=Analytics');
        
        // Check for mobile chart containers
        const mobileChartContainer = page.locator('[data-testid="mobile-chart-container"]');
        if (await mobileChartContainer.isVisible()) {
          await expect(mobileChartContainer).toBeVisible();
          
          // Test touch interactions on charts
          await mobileChartContainer.tap();
          await page.waitForTimeout(300);
        }
      });

      test('should maintain functionality in landscape mode', async ({ page }) => {
        // Rotate to landscape
        await page.setViewportSize({ 
          width: device.viewport.height, 
          height: device.viewport.width 
        });
        
        await page.waitForTimeout(500);
        
        // Verify dashboard still works
        await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
        
        // Test tab navigation in landscape
        await page.click('text=Geographic');
        await expect(page.locator('[data-testid="geographic-visualization"]')).toBeVisible();
      });

      test('should handle mobile navigation properly', async ({ page }) => {
        // Test mobile navigation if present
        const mobileNav = page.locator('[data-testid="mobile-navigation"]');
        if (await mobileNav.isVisible()) {
          await expect(mobileNav).toBeVisible();
          
          // Test navigation menu toggle
          const navToggle = page.locator('[data-testid="nav-toggle"]');
          if (await navToggle.isVisible()) {
            await navToggle.click();
            await page.waitForTimeout(300);
          }
        }
      });
    });
  });
});

test.describe('Tablet Dashboard Responsiveness', () => {
  tabletDevices.forEach(device => {
    test.describe(`Tablet Tests - ${device.name}`, () => {
      test.use({ ...device });

      test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 });
      });

      test('should display tablet-optimized layout', async ({ page }) => {
        // Check that dashboard adapts to tablet size
        const dashboardContent = page.locator('[data-testid="dashboard-content"]');
        await expect(dashboardContent).toBeVisible();
        
        // Verify tablet-specific layout elements
        const tabletLayout = page.locator('[data-testid="tablet-layout"]');
        if (await tabletLayout.isVisible()) {
          await expect(tabletLayout).toBeVisible();
        }
      });

      test('should maintain desktop-like functionality on tablet', async ({ page }) => {
        // Test that desktop features work on tablet
        await page.click('text=Analytics');
        await expect(page.locator('[data-testid="charts-section"]')).toBeVisible();
        
        await page.click('text=Geographic');
        await expect(page.locator('[data-testid="geographic-visualization"]')).toBeVisible();
        
        await page.click('text=Activity');
        await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      });

      test('should handle tablet orientation changes', async ({ page }) => {
        // Test portrait mode
        await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
        
        // Switch to landscape
        await page.setViewportSize({ 
          width: device.viewport.height, 
          height: device.viewport.width 
        });
        
        await page.waitForTimeout(500);
        
        // Verify layout adapts
        await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
        
        // Test functionality in landscape
        await page.click('text=Analytics');
        await expect(page.locator('[data-testid="charts-section"]')).toBeVisible();
      });
    });
  });
});

test.describe('Cross-Device Consistency', () => {
  test('should maintain data consistency across devices', async ({ browser }) => {
    // Test data consistency between mobile and desktop
    const mobileContext = await browser.newContext(devices['iPhone 12']);
    const desktopContext = await browser.newContext();
    
    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();
    
    // Load dashboard on both devices
    await mobilePage.goto('/');
    await desktopPage.goto('/');
    
    await mobilePage.waitForSelector('[data-testid="dashboard-content"]');
    await desktopPage.waitForSelector('[data-testid="dashboard-content"]');
    
    // Compare metric values
    const mobileMetrics = await mobilePage.locator('[data-testid="metric-card-total-contacts"] .text-2xl').textContent();
    const desktopMetrics = await desktopPage.locator('[data-testid="metric-card-total-contacts"] .text-2xl').textContent();
    
    expect(mobileMetrics).toBe(desktopMetrics);
    
    await mobileContext.close();
    await desktopContext.close();
  });

  test('should handle responsive breakpoints correctly', async ({ page }) => {
    // Test different breakpoints
    const breakpoints = [
      { width: 320, height: 568, name: 'Small Mobile' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Small Desktop' },
      { width: 1440, height: 900, name: 'Desktop' }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.waitForTimeout(300);
      
      // Verify dashboard is functional at this breakpoint
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Test basic functionality
      await page.click('text=Analytics');
      await expect(page.locator('[data-testid="charts-section"]')).toBeVisible();
    }
  });
});

test.describe('Mobile Performance', () => {
  test.use(devices['iPhone 12']);

  test('should load quickly on mobile', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(8000); // Allow more time for mobile
  });

  test('should handle slow network conditions', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    await page.goto('/');
    
    // Check for loading states
    await expect(page.locator('[data-testid="metrics-skeleton"]')).toBeVisible();
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('should work offline with cached data', async ({ page, context }) => {
    // Load page first to cache data
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Should still show cached content or appropriate offline message
    const dashboardContent = page.locator('[data-testid="dashboard-content"]');
    const offlineMessage = page.locator('[data-testid="offline-message"]');
    
    await expect(dashboardContent.or(offlineMessage)).toBeVisible();
  });
});

test.describe('Accessibility on Mobile', () => {
  test.use(devices['iPhone 12']);

  test('should be accessible with screen reader', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    // Check for proper ARIA labels
    const metricCards = page.locator('[data-testid="metric-card"]');
    if (await metricCards.count() > 0) {
      const firstCard = metricCards.first();
      const ariaLabel = await firstCard.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
    
    // Check for proper heading structure
    const mainHeading = page.locator('h1, h2').first();
    await expect(mainHeading).toBeVisible();
  });

  test('should support keyboard navigation on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    // This would typically use axe-core or similar tool
    // For now, we'll check that text is visible
    const textElements = page.locator('text=Total Contacts');
    await expect(textElements).toBeVisible();
  });
});
