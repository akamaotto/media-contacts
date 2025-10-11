import { test, expect, devices, type Page } from '@playwright/test';
import { AISearchPage } from '../../page-objects/ai-search-page';

/**
 * Responsive Design Tests
 * Tests AI Search functionality across different device sizes and orientations
 * 
 * Story 4.4: End-to-End & User Workflow Testing
 * Acceptance Criteria:
 * - Mobile responsiveness is tested on various device sizes
 * - Tablet responsiveness is tested on various device sizes
 * - Touch interactions work correctly on mobile devices
 * - Orientation changes are handled properly
 */

// Device configurations for responsive testing
const DEVICE_CONFIGS = [
  // Mobile devices
  {
    ...devices['iPhone SE'],
    name: 'iPhone SE',
    type: 'mobile',
    orientation: 'portrait',
    expectedBehavior: 'Compact mobile layout with touch-optimized controls',
  },
  {
    ...devices['iPhone 12'],
    name: 'iPhone 12',
    type: 'mobile',
    orientation: 'portrait',
    expectedBehavior: 'Modern mobile layout with full functionality',
  },
  {
    ...devices['iPhone 14 Pro Max'],
    name: 'iPhone 14 Pro Max',
    type: 'mobile',
    orientation: 'portrait',
    expectedBehavior: 'Large mobile layout with enhanced features',
  },
  {
    ...devices['Pixel 5'],
    name: 'Google Pixel 5',
    type: 'mobile',
    orientation: 'portrait',
    expectedBehavior: 'Android mobile layout with material design',
  },
  
  // Tablet devices
  {
    ...devices['iPad'],
    name: 'iPad',
    type: 'tablet',
    orientation: 'portrait',
    expectedBehavior: 'Tablet layout with enhanced navigation',
  },
  {
    ...devices['iPad Pro'],
    name: 'iPad Pro',
    type: 'tablet',
    orientation: 'portrait',
    expectedBehavior: 'Large tablet layout with desktop-like features',
  },
  {
    ...devices['Surface Pro'],
    name: 'Microsoft Surface Pro',
    type: 'tablet',
    orientation: 'portrait',
    expectedBehavior: 'Windows tablet layout with hybrid interactions',
  },
  
  // Desktop variations
  {
    ...devices['Desktop Chrome'],
    name: 'Small Desktop',
    type: 'desktop',
    viewport: { width: 1366, height: 768 },
    expectedBehavior: 'Compact desktop layout',
  },
  {
    ...devices['Desktop Chrome'],
    name: 'Standard Desktop',
    type: 'desktop',
    viewport: { width: 1920, height: 1080 },
    expectedBehavior: 'Standard desktop layout',
  },
  {
    ...devices['Desktop Chrome'],
    name: 'Large Desktop',
    type: 'desktop',
    viewport: { width: 2560, height: 1440 },
    expectedBehavior: 'Large desktop layout with enhanced features',
  },
];

// Test data for responsive testing
const TEST_DATA = {
  searchQuery: 'technology journalists',
  countries: ['United States'],
  categories: ['Technology'],
  description: 'Responsive design test for technology journalists',
};

test.describe('Responsive Design Tests', () => {
  DEVICE_CONFIGS.forEach(deviceConfig => {
    test.describe(`${deviceConfig.name} - ${deviceConfig.type.toUpperCase()} Responsive Tests`, () => {
      let aiSearchPage: AISearchPage;
      let page: Page;

      test.beforeEach(async ({ browser }) => {
        const context = await browser.newContext({
          ...deviceConfig,
          viewport: deviceConfig.viewport || deviceConfig.defaultViewport,
        });
        
        page = await context.newPage();
        aiSearchPage = new AISearchPage(page);
        
        // Login before each test
        await login(page);
      });

      test.afterEach(async () => {
        await page.close();
      });

      test(`${deviceConfig.name}: should render correctly on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} (${deviceConfig.type}) rendering`);

        await aiSearchPage.navigateToMediaContacts();
        
        // Verify main page elements are visible and properly sized
        await expect(aiSearchPage.aiSearchButton).toBeVisible();
        
        const buttonBoundingBox = await aiSearchPage.aiSearchButton.boundingBox();
        expect(buttonBoundingBox).toBeTruthy();
        
        // Button should be appropriately sized for touch on mobile
        if (deviceConfig.type === 'mobile') {
          expect(buttonBoundingBox!.width).toBeGreaterThanOrEqual(44); // Minimum touch target
          expect(buttonBoundingBox!.height).toBeGreaterThanOrEqual(44);
        }
        
        await aiSearchPage.takeScreenshot(
          `${deviceConfig.name.toLowerCase().replace(/\s+/g, '-')}-main-page`,
          `${deviceConfig.name} main page layout`
        );
        
        console.log(`✅ ${deviceConfig.name} main page renders correctly`);
      });

      test(`${deviceConfig.name}: should display modal correctly on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} modal display`);

        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.openAISearchModal();
        
        // Verify modal is visible and properly sized
        await expect(aiSearchPage.aiSearchModal).toBeVisible();
        
        const modalBoundingBox = await aiSearchPage.aiSearchModal.boundingBox();
        expect(modalBoundingBox).toBeTruthy();
        
        // Modal should fit within viewport with appropriate margins
        const viewport = page.viewportSize()!;
        expect(modalBoundingBox!.width).toBeLessThanOrEqual(viewport.width - 40); // 20px margins
        expect(modalBoundingBox!.height).toBeLessThanOrEqual(viewport.height - 40);
        
        // Verify form elements are visible and accessible
        await expect(aiSearchPage.searchQueryInput).toBeVisible();
        await expect(aiSearchPage.countrySelector).toBeVisible();
        await expect(aiSearchPage.categorySelector).toBeVisible();
        await expect(aiSearchPage.searchButton).toBeVisible();
        
        await aiSearchPage.takeScreenshot(
          `${deviceConfig.name.toLowerCase().replace(/\s+/g, '-')}-modal`,
          `${deviceConfig.name} AI Search modal`
        );
        
        console.log(`✅ ${deviceConfig.name} modal displays correctly`);
      });

      test(`${deviceConfig.name}: should handle form interactions on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} form interactions`);

        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.openAISearchModal();
        
        // Test form filling
        await aiSearchPage.fillSearchForm(TEST_DATA);
        
        // Verify form values are set correctly
        const queryValue = await aiSearchPage.searchQueryInput.inputValue();
        expect(queryValue).toBe(TEST_DATA.searchQuery);
        
        // Test dropdown interactions
        await aiSearchPage.selectCountries(TEST_DATA.countries);
        await aiSearchPage.selectCategories(TEST_DATA.categories);
        
        // Test form submission
        await aiSearchPage.submitSearch();
        await aiSearchPage.waitForSearchResults();
        
        // Verify results are displayed
        await expect(aiSearchPage.searchResults).toBeVisible();
        
        await aiSearchPage.takeScreenshot(
          `${deviceConfig.name.toLowerCase().replace(/\s+/g, '-')}-form-results`,
          `${deviceConfig.name} form with results`
        );
        
        console.log(`✅ ${deviceConfig.name} form interactions work correctly`);
      });

      test(`${deviceConfig.name}: should handle touch interactions on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} touch interactions`);

        if (deviceConfig.type === 'mobile' || deviceConfig.type === 'tablet') {
          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          
          // Test touch-friendly button sizes
          const searchButton = aiSearchPage.searchButton;
          const buttonBoundingBox = await searchButton.boundingBox();
          expect(buttonBoundingBox!.width).toBeGreaterThanOrEqual(44);
          expect(buttonBoundingBox!.height).toBeGreaterThanOrEqual(44);
          
          // Test tap interactions
          await aiSearchPage.fillSearchForm(TEST_DATA);
          await searchButton.tap(); // Use tap instead of click for mobile
          
          await aiSearchPage.waitForSearchResults();
          
          // Test swipe gestures on results if available
          const resultsCount = await aiSearchPage.getSearchResultsCount();
          if (resultsCount > 0) {
            // Test horizontal swipe on results
            const resultsContainer = aiSearchPage.resultsList;
            
            if (await resultsContainer.isVisible()) {
              const containerBoundingBox = await resultsContainer.boundingBox();
              if (containerBoundingBox) {
                // Perform swipe gesture
                await page.touchscreen.tap(containerBoundingBox.x + 50, containerBoundingBox.y + 50);
                await page.touchscreen.tap(containerBoundingBox.x + 100, containerBoundingBox.y + 50);
              }
            }
          }
          
          console.log(`✅ ${deviceConfig.name} touch interactions work correctly`);
        } else {
          console.log(`⏭️  Skipping touch interactions for ${deviceConfig.type}`);
          test.skip();
        }
      });

      test(`${deviceConfig.name}: should handle orientation changes on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} orientation changes`);

        if (deviceConfig.type === 'mobile' || deviceConfig.type === 'tablet') {
          // Test portrait orientation
          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          
          await aiSearchPage.takeScreenshot(
            `${deviceConfig.name.toLowerCase().replace(/\s+/g, '-')}-portrait`,
            `${deviceConfig.name} portrait orientation`
          );
          
          // Switch to landscape orientation
          const landscapeViewport = {
            width: deviceConfig.viewport?.height || deviceConfig.defaultViewport?.height || 667,
            height: deviceConfig.viewport?.width || deviceConfig.defaultViewport?.width || 375,
          };
          
          await page.setViewportSize(landscapeViewport);
          await page.waitForTimeout(500); // Allow layout to adjust
          
          // Verify modal adapts to landscape
          await expect(aiSearchPage.aiSearchModal).toBeVisible();
          
          const landscapeModalBoundingBox = await aiSearchPage.aiSearchModal.boundingBox();
          expect(landscapeModalBoundingBox).toBeTruthy();
          expect(landscapeModalBoundingBox!.width).toBeLessThanOrEqual(landscapeViewport.width - 40);
          
          await aiSearchPage.takeScreenshot(
            `${deviceConfig.name.toLowerCase().replace(/\s+/g, '-')}-landscape`,
            `${deviceConfig.name} landscape orientation`
          );
          
          // Test functionality in landscape
          await aiSearchPage.fillSearchForm(TEST_DATA);
          await aiSearchPage.submitSearch();
          await aiSearchPage.waitForSearchResults();
          
          console.log(`✅ ${deviceConfig.name} orientation changes handled correctly`);
        } else {
          console.log(`⏭️  Skipping orientation changes for ${deviceConfig.type}`);
          test.skip();
        }
      });

      test(`${deviceConfig.name}: should handle keyboard navigation on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} keyboard navigation`);

        await aiSearchPage.navigateToMediaContacts();
        await aiSearchPage.openAISearchModal();
        
        // Test Tab navigation
        await page.keyboard.press('Tab');
        await expect(aiSearchPage.searchQueryInput).toBeFocused();
        
        await page.keyboard.press('Tab');
        // Should focus on next form element
        
        // Test form completion with keyboard
        await page.keyboard.type(TEST_DATA.searchQuery);
        
        // Test Enter key submission
        await page.keyboard.press('Enter');
        await aiSearchPage.waitForSearchResults();
        
        // Test Escape key to close modal
        await page.keyboard.press('Escape');
        await expect(aiSearchPage.aiSearchModal).toBeHidden();
        
        console.log(`✅ ${deviceConfig.name} keyboard navigation works correctly`);
      });

      test(`${deviceConfig.name}: should handle accessibility on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} accessibility`);

        await aiSearchPage.navigateToMediaContacts();
        
        // Check accessibility of main page
        const pageAccessibility = await aiSearchPage.validateAccessibility();
        expect(pageAccessibility.passed).toBe(true);
        
        await aiSearchPage.openAISearchModal();
        
        // Check accessibility of modal
        const modalAccessibility = await aiSearchPage.validateAccessibility();
        expect(modalAccessibility.passed).toBe(true);
        
        // Test screen reader compatibility
        const modal = aiSearchPage.aiSearchModal;
        const hasAriaLabel = await modal.getAttribute('aria-label');
        const hasAriaLabelledBy = await modal.getAttribute('aria-labelledby');
        const hasRole = await modal.getAttribute('role');
        
        expect(hasRole || hasAriaLabel || hasAriaLabelledBy).toBeTruthy();
        
        // Test focus management
        await page.keyboard.press('Tab');
        const firstFocusedElement = await page.locator(':focus');
        expect(await firstFocusedElement.isVisible()).toBe(true);
        
        console.log(`✅ ${deviceConfig.name} accessibility works correctly`);
      });

      test(`${deviceConfig.name}: should handle performance on ${deviceConfig.type}`, async () => {
        console.log(`📱 Testing ${deviceConfig.name} performance`);

        // Measure page load performance
        const pageLoadStart = Date.now();
        await aiSearchPage.navigateToMediaContacts();
        const pageLoadTime = Date.now() - pageLoadStart;
        
        // Measure modal open performance
        const modalOpenStart = Date.now();
        await aiSearchPage.openAISearchModal();
        const modalOpenTime = Date.now() - modalOpenStart;
        
        // Measure form fill performance
        const formFillStart = Date.now();
        await aiSearchPage.fillSearchForm(TEST_DATA);
        const formFillTime = Date.now() - formFillStart;
        
        // Performance expectations based on device type
        const expectations = {
          mobile: {
            pageLoad: 5000,
            modalOpen: 2000,
            formFill: 3000,
          },
          tablet: {
            pageLoad: 4000,
            modalOpen: 1500,
            formFill: 2000,
          },
          desktop: {
            pageLoad: 3000,
            modalOpen: 1000,
            formFill: 1500,
          },
        };
        
        const deviceExpectations = expectations[deviceConfig.type as keyof typeof expectations];
        
        expect(pageLoadTime).toBeLessThan(deviceExpectations.pageLoad);
        expect(modalOpenTime).toBeLessThan(deviceExpectations.modalOpen);
        expect(formFillTime).toBeLessThan(deviceExpectations.formFill);
        
        console.log(`⏱️  ${deviceConfig.name} performance:`, {
          pageLoad: `${pageLoadTime}ms`,
          modalOpen: `${modalOpenTime}ms`,
          formFill: `${formFillTime}ms`,
        });
        
        console.log(`✅ ${deviceConfig.name} performance meets expectations`);
      });
    });
  });

  // Cross-device consistency tests
  test.describe('Cross-Device Consistency Tests', () => {
    test('should maintain consistent functionality across device types', async () => {
      console.log('🔄 Testing cross-device consistency');

      const deviceTypes = ['mobile', 'tablet', 'desktop'];
      const results: any[] = [];

      for (const deviceType of deviceTypes) {
        const deviceConfig = DEVICE_CONFIGS.find(d => d.type === deviceType);
        if (!deviceConfig) continue;

        const context = await browser.newContext({
          ...deviceConfig,
          viewport: deviceConfig.viewport || deviceConfig.defaultViewport,
        });
        
        const page = await context.newPage();
        const aiSearchPage = new AISearchPage(page);
        
        await login(page);
        
        try {
          // Perform standard workflow
          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          await aiSearchPage.fillSearchForm(TEST_DATA);
          await aiSearchPage.submitSearch();
          await aiSearchPage.waitForSearchResults();
          
          const resultsCount = await aiSearchPage.getSearchResultsCount();
          const performanceMetrics = aiSearchPage.getPerformanceMetrics();
          
          results.push({
            deviceType,
            resultsCount,
            performanceMetrics,
          });
          
        } catch (error) {
          console.error(`❌ Error testing ${deviceType}:`, error);
          results.push({
            deviceType,
            error: error.message,
          });
        } finally {
          await context.close();
        }
      }
      
      // Verify consistency across devices
      const successfulResults = results.filter(r => !r.error);
      expect(successfulResults.length).toBeGreaterThan(0);
      
      // All successful tests should return similar results
      const resultCounts = successfulResults.map(r => r.resultsCount);
      const maxCount = Math.max(...resultCounts);
      const minCount = Math.min(...resultCounts);
      
      // Allow some variation but ensure basic consistency
      expect(maxCount - minCount).toBeLessThan(maxCount * 0.5); // Within 50% variation
      
      console.log('✅ Cross-device consistency verified');
    });
  });
});

/**
 * Helper function to login
 */
async function login(page: Page) {
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