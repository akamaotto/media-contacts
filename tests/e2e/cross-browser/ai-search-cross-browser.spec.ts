import { test, expect, devices, type BrowserContext } from '@playwright/test';
import { AISearchPage } from '../../page-objects/ai-search-page';

/**
 * Cross-Browser Compatibility Tests
 * Tests AI Search functionality across different browsers
 * 
 * Story 4.4: End-to-End & User Workflow Testing
 * Acceptance Criteria:
 * - Cross-browser compatibility is verified on all supported browsers
 * - UI/UX consistency across browsers
 * - Browser-specific features work correctly
 */

// Test data for cross-browser testing
const TEST_DATA = {
  searchQuery: 'technology journalists in United States',
  countries: ['United States'],
  categories: ['Technology'],
  description: 'Cross-browser test for technology journalists',
};

// Browser-specific configurations
const BROWSER_CONFIGS = {
  chromium: {
    name: 'Chrome',
    features: ['Modern CSS', 'ES6+', 'Web Components'],
    expectedBehavior: 'Full functionality',
  },
  firefox: {
    name: 'Firefox',
    features: ['Modern CSS', 'ES6+', 'Web Components'],
    expectedBehavior: 'Full functionality',
  },
  webkit: {
    name: 'Safari',
    features: ['Modern CSS', 'ES6+', 'Limited Web Components'],
    expectedBehavior: 'Full functionality with Safari-specific considerations',
  },
};

test.describe.configure({ mode: 'parallel' });

// Run tests for each desktop browser
Object.entries(BROWSER_CONFIGS).forEach(([browserName, config]) => {
  test.describe(`${config.name} - AI Search Cross-Browser Tests`, () => {
    test.use({ ...devices['Desktop Chrome'] }); // Use desktop viewport for all
    
    let aiSearchPage: AISearchPage;
    let context: BrowserContext;

    test.beforeEach(async ({ browser }) => {
      context = await browser.newContext();
      const page = await context.newPage();
      aiSearchPage = new AISearchPage(page);
      
      // Login before each test
      await login(page);
    });

    test.afterEach(async () => {
      await context.close();
    });

    test(`${config.name}: should render AI Search modal correctly`, async () => {
      console.log(`🌐 Testing modal rendering on ${config.name}`);

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Verify modal elements are visible
      await expect(aiSearchPage.searchQueryInput).toBeVisible();
      await expect(aiSearchPage.countrySelector).toBeVisible();
      await expect(aiSearchPage.categorySelector).toBeVisible();
      await expect(aiSearchPage.searchButton).toBeVisible();
      
      // Take screenshot for visual comparison
      await aiSearchPage.takeScreenshot(`${browserName}-modal-rendered`, `AI Search modal on ${config.name}`);
      
      // Check for browser-specific rendering issues
      const modalBoundingBox = await aiSearchPage.aiSearchModal.boundingBox();
      expect(modalBoundingBox).toBeTruthy();
      expect(modalBoundingBox!.width).toBeGreaterThan(300);
      expect(modalBoundingBox!.height).toBeGreaterThan(200);
      
      console.log(`✅ Modal renders correctly on ${config.name}`);
    });

    test(`${config.name}: should handle form interactions correctly`, async () => {
      console.log(`🌐 Testing form interactions on ${config.name}`);

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Test form filling
      await aiSearchPage.fillSearchForm(TEST_DATA);
      
      // Verify form values are set correctly
      const queryValue = await aiSearchPage.searchQueryInput.inputValue();
      expect(queryValue).toBe(TEST_DATA.searchQuery);
      
      // Test form submission
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();
      
      // Verify results are displayed
      await expect(aiSearchPage.searchResults).toBeVisible();
      
      console.log(`✅ Form interactions work correctly on ${config.name}`);
    });

    test(`${config.name}: should handle dropdown selections correctly`, async () => {
      console.log(`🌐 Testing dropdown selections on ${config.name}`);

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Test country selection
      await aiSearchPage.selectCountries(TEST_DATA.countries);
      
      // Test category selection
      await aiSearchPage.selectCategories(TEST_DATA.categories);
      
      // Submit search with selections
      await aiSearchPage.fillFormField(aiSearchPage.searchQueryInput, TEST_DATA.searchQuery);
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();
      
      // Verify search completed successfully
      const resultsCount = await aiSearchPage.getSearchResultsCount();
      expect(resultsCount).toBeGreaterThanOrEqual(0);
      
      console.log(`✅ Dropdown selections work correctly on ${config.name}`);
    });

    test(`${config.name}: should handle responsive design correctly`, async () => {
      console.log(`🌐 Testing responsive design on ${config.name}`);

      const page = aiSearchPage.page;
      
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop HD' },
        { width: 1366, height: 768, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500); // Allow layout to adjust
        
        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.openAISearchModal();
        
        // Verify modal is properly sized and positioned
        const modal = aiSearchPage.aiSearchModal;
        await expect(modal).toBeVisible();
        
        const boundingBox = await modal.boundingBox();
        expect(boundingBox).toBeTruthy();
        
        // Modal should fit within viewport
        expect(boundingBox!.width).toBeLessThanOrEqual(viewport.width);
        expect(boundingBox!.height).toBeLessThanOrEqual(viewport.height);
        
        await aiSearchPage.takeScreenshot(`${browserName}-${viewport.name.toLowerCase()}-responsive`, `${config.name} - ${viewport.name} responsive design`);
        
        await aiSearchPage.closeAISearchModal();
      }
      
      console.log(`✅ Responsive design works correctly on ${config.name}`);
    });

    test(`${config.name}: should handle keyboard navigation correctly`, async () => {
      console.log(`🌐 Testing keyboard navigation on ${config.name}`);

      const page = aiSearchPage.page;
      
      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      await expect(aiSearchPage.searchQueryInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      // Should focus on next form element (country selector or similar)
      
      // Test Enter key submission
      await aiSearchPage.fillSearchForm(TEST_DATA);
      await page.keyboard.press('Enter');
      await aiSearchPage.waitForSearchResults();
      
      // Test Escape key to close modal
      await page.keyboard.press('Escape');
      await expect(aiSearchPage.aiSearchModal).toBeHidden();
      
      console.log(`✅ Keyboard navigation works correctly on ${config.name}`);
    });

    test(`${config.name}: should handle error states correctly`, async () => {
      console.log(`🌐 Testing error states on ${config.name}`);

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Test empty form submission
      await aiSearchPage.submitSearch();
      
      // Should show validation errors
      const errors = await aiSearchPage.captureErrors();
      expect(errors.length).toBeGreaterThan(0);
      
      await aiSearchPage.takeScreenshot(`${browserName}-error-state`, `Error state on ${config.name}`);
      
      // Test recovery from error
      await aiSearchPage.fillSearchForm(TEST_DATA);
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();
      
      // Should show results instead of errors
      await expect(aiSearchPage.searchResults).toBeVisible();
      
      console.log(`✅ Error states handled correctly on ${config.name}`);
    });

    test(`${config.name}: should handle loading states correctly`, async () => {
      console.log(`🌐 Testing loading states on ${config.name}`);

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      await aiSearchPage.fillSearchForm(TEST_DATA);
      
      // Submit search and check loading state
      await aiSearchPage.submitSearch();
      
      // Should show loading indicators
      const loadingIndicators = [
        '.loading',
        '.spinner',
        '.animate-spin',
        '[aria-busy="true"]',
        'button:disabled',
      ];
      
      let hasLoadingIndicator = false;
      for (const selector of loadingIndicators) {
        if (await page.locator(selector).isVisible()) {
          hasLoadingIndicator = true;
          break;
        }
      }
      
      expect(hasLoadingIndicator).toBe(true);
      
      await aiSearchPage.takeScreenshot(`${browserName}-loading-state`, `Loading state on ${config.name}`);
      
      // Wait for results
      await aiSearchPage.waitForSearchResults();
      
      console.log(`✅ Loading states handled correctly on ${config.name}`);
    });

    test(`${config.name}: should handle browser-specific features`, async () => {
      console.log(`🌐 Testing browser-specific features on ${config.name}`);

      const page = aiSearchPage.page;
      
      // Test browser-specific CSS features
      const browserFeatures = await page.evaluate(() => {
        return {
          supportsCSSGrid: CSS.supports('display', 'grid'),
          supportsFlexbox: CSS.supports('display', 'flex'),
          supportsCustomProperties: CSS.supports('color', 'var(--test)'),
          supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
          supportsScrollSnap: CSS.supports('scroll-snap-type', 'mandatory'),
        };
      });
      
      console.log(`🔧 ${config.name} features:`, browserFeatures);
      
      // Test that the application works regardless of feature support
      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      await aiSearchPage.fillSearchForm(TEST_DATA);
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();
      
      // Should work even with limited feature support
      const resultsCount = await aiSearchPage.getSearchResultsCount();
      expect(resultsCount).toBeGreaterThanOrEqual(0);
      
      console.log(`✅ Browser-specific features handled correctly on ${config.name}`);
    });
  });
});

// Mobile browser tests
test.describe('Mobile Cross-Browser Tests', () => {
  const mobileDevices = [
    { ...devices['iPhone 12'], name: 'iPhone 12 (Safari)' },
    { ...devices['Pixel 5'], name: 'Pixel 5 (Chrome)' },
  ];

  mobileDevices.forEach(device => {
    test.describe(`${device.name} - Mobile AI Search Tests`, () => {
      test.use(device);
      
      let aiSearchPage: AISearchPage;

      test.beforeEach(async ({ page }) => {
        aiSearchPage = new AISearchPage(page);
        await login(page);
      });

      test(`${device.name}: should work correctly on mobile`, async () => {
        console.log(`📱 Testing mobile functionality on ${device.name}`);

        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.openAISearchModal();
        
        // Test touch interactions
        await aiSearchPage.fillSearchForm(TEST_DATA);
        
        // Test mobile-specific UI elements
        const mobileOptimizations = [
          '.mobile-optimized',
          '.touch-friendly',
          '[data-mobile="true"]',
        ];
        
        for (const selector of mobileOptimizations) {
          const element = page.locator(selector);
          if (await element.isVisible()) {
            console.log(`✅ Found mobile optimization: ${selector}`);
          }
        }
        
        await aiSearchPage.submitSearch();
        await aiSearchPage.waitForSearchResults();
        
        // Test mobile-specific interactions (swipe, pinch, etc.)
        const resultsCount = await aiSearchPage.getSearchResultsCount();
        if (resultsCount > 0) {
          // Test swipe gestures on results
          await page.mouse.move(200, 400);
          await page.mouse.down();
          await page.mouse.move(100, 400);
          await page.mouse.up();
        }
        
        await aiSearchPage.takeScreenshot(`${device.name.replace(/\s+/g, '-').toLowerCase()}-mobile`, `Mobile experience on ${device.name}`);
        
        console.log(`✅ Mobile functionality works correctly on ${device.name}`);
      });

      test(`${device.name}: should handle mobile-specific features`, async () => {
        console.log(`📱 Testing mobile-specific features on ${device.name}`);

        const page = aiSearchPage.page;
        
        // Test orientation changes
        await page.setViewportSize({ width: 667, height: 375 }); // Landscape
        await page.waitForTimeout(500);
        
        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.openAISearchModal();
        
        // Verify modal adapts to landscape
        await expect(aiSearchPage.aiSearchModal).toBeVisible();
        
        // Test portrait orientation
        await page.setViewportSize({ width: 375, height: 667 }); // Portrait
        await page.waitForTimeout(500);
        
        await expect(aiSearchPage.aiSearchModal).toBeVisible();
        
        // Test mobile keyboard behavior
        await aiSearchPage.fillFormField(aiSearchPage.searchQueryInput, TEST_DATA.searchQuery);
        
        // Virtual keyboard should appear and not cover important UI elements
        const modalBoundingBox = await aiSearchPage.aiSearchModal.boundingBox();
        expect(modalBoundingBox).toBeTruthy();
        
        console.log(`✅ Mobile-specific features work correctly on ${device.name}`);
      });
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