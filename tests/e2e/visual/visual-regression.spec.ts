import { test, expect, devices } from '@playwright/test';
import { AISearchPage } from '../../page-objects/ai-search-page';
import path from 'path';

/**
 * Visual Regression Tests
 * Tests UI consistency and visual appearance across different states and devices
 * 
 * Story 4.4: End-to-End & User Workflow Testing
 * Acceptance Criteria:
 * - Visual regression testing for UI components
 * - Cross-browser visual consistency
 * - Responsive design visual validation
 */

// Visual testing configuration
const VISUAL_CONFIG = {
  // Threshold for pixel differences (0-1)
  threshold: 0.2,
  // Maximum number of different pixels
  maxDiffPixels: 1000,
  // Animation mode for screenshots
  animations: 'disabled' as const,
  // Clip regions for specific components
  clips: {
    modal: { x: 0, y: 0, width: 800, height: 600 },
    form: { x: 0, y: 0, width: 600, height: 400 },
    results: { x: 0, y: 0, width: 800, height: 400 },
  },
};

// Test data for visual testing
const VISUAL_TEST_DATA = {
  searchQuery: 'visual regression test journalists',
  countries: ['United States', 'United Kingdom'],
  categories: ['Technology', 'Business'],
  description: 'Visual regression test for comprehensive UI validation',
};

// Device configurations for visual testing
const VISUAL_DEVICES = [
  { ...devices['Desktop Chrome'], name: 'desktop-chrome' },
  { ...devices['Desktop Firefox'], name: 'desktop-firefox' },
  { ...devices['Desktop Safari'], name: 'desktop-safari' },
  { ...devices['iPhone 12'], name: 'mobile-iphone' },
  { ...devices['iPad'], name: 'tablet-ipad' },
];

test.describe('Visual Regression Tests', () => {
  // Test static UI components
  test.describe('Static UI Components', () => {
    let aiSearchPage: AISearchPage;

    test.use({ ...devices['Desktop Chrome'] });

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should match main page layout screenshot', async () => {
      console.log('📸 Testing main page layout visual regression');

      await aiSearchPage.navigateToMediaContacts();
      
      // Wait for page to fully load
      await aiSearchPage.waitForPageLoad();
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('main-page-layout.png', {
        fullPage: true,
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Main page layout visual regression passed');
    });

    test('should match AI Search button appearance', async () => {
      console.log('📸 Testing AI Search button visual regression');

      await aiSearchPage.navigateToMediaContacts();
      
      // Wait for button to be visible
      await expect(aiSearchPage.aiSearchButton).toBeVisible();
      
      // Take screenshot of button
      await expect(aiSearchPage.aiSearchButton).toHaveScreenshot('ai-search-button.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ AI Search button visual regression passed');
    });

    test('should match modal initial state appearance', async () => {
      console.log('📸 Testing modal initial state visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Wait for modal to fully render
      await page.waitForTimeout(500);
      
      // Take screenshot of modal
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('modal-initial-state.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Modal initial state visual regression passed');
    });

    test('should match form elements appearance', async () => {
      console.log('📸 Testing form elements visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Take screenshots of individual form elements
      await expect(aiSearchPage.searchQueryInput).toHaveScreenshot('search-input.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      await expect(aiSearchPage.countrySelector).toHaveScreenshot('country-selector.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      await expect(aiSearchPage.categorySelector).toHaveScreenshot('category-selector.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      await expect(aiSearchPage.searchButton).toHaveScreenshot('search-button.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      console.log('✅ Form elements visual regression passed');
    });
  });

  // Test dynamic UI states
  test.describe('Dynamic UI States', () => {
    let aiSearchPage: AISearchPage;

    test.use({ ...devices['Desktop Chrome'] });

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should match filled form appearance', async () => {
      console.log('📸 Testing filled form visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Fill form with test data
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      
      // Take screenshot of filled form
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('modal-filled-form.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Filled form visual regression passed');
    });

    test('should match loading state appearance', async () => {
      console.log('📸 Testing loading state visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      
      // Submit search and capture loading state
      await aiSearchPage.submitSearch();
      
      // Wait for loading indicators to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot of loading state
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('modal-loading-state.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Loading state visual regression passed');
    });

    test('should match results display appearance', async () => {
      console.log('📸 Testing results display visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();
      
      // Take screenshot of results
      await expect(aiSearchPage.searchResults).toHaveScreenshot('search-results-display.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Results display visual regression passed');
    });

    test('should match error state appearance', async () => {
      console.log('📸 Testing error state visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Submit empty form to trigger error
      await aiSearchPage.submitSearch();
      await page.waitForTimeout(1000);
      
      // Take screenshot of error state
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('modal-error-state.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Error state visual regression passed');
    });

    test('should match success state appearance', async () => {
      console.log('📸 Testing success state visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      await aiSearchPage.submitSearch();
      await aiSearchPage.waitForSearchResults();
      
      // Select and import contacts
      const resultsCount = await aiSearchPage.getSearchResultsCount();
      if (resultsCount > 0) {
        await aiSearchPage.selectContacts([0]); // Select first contact
        await aiSearchPage.importSelectedContacts();
        
        // Wait for success message
        await page.waitForTimeout(1000);
        
        // Take screenshot of success state
        await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('modal-success-state.png', {
          animations: VISUAL_CONFIG.animations,
          threshold: VISUAL_CONFIG.threshold,
          maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
        });
      } else {
        console.log('⚠️  No results found, skipping success state test');
        test.skip();
      }

      console.log('✅ Success state visual regression passed');
    });
  });

  // Cross-device visual consistency
  test.describe('Cross-Device Visual Consistency', () => {
    VISUAL_DEVICES.forEach(device => {
      test.describe(`${device.name} Visual Tests`, () => {
        test.use(device);
        
        let aiSearchPage: AISearchPage;

        test.beforeEach(async ({ page }) => {
          aiSearchPage = new AISearchPage(page);
          await login(page);
        });

        test(`${device.name}: should match main page layout`, async () => {
          console.log(`📸 Testing ${device.name} main page layout`);

          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.waitForPageLoad();
          
          await expect(page).toHaveScreenshot(`${device.name}-main-page-layout.png`, {
            fullPage: true,
            animations: VISUAL_CONFIG.animations,
            threshold: VISUAL_CONFIG.threshold,
            maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
          });

          console.log(`✅ ${device.name} main page layout visual regression passed`);
        });

        test(`${device.name}: should match modal appearance`, async () => {
          console.log(`📸 Testing ${device.name} modal appearance`);

          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          await page.waitForTimeout(500);
          
          await expect(aiSearchPage.aiSearchModal).toHaveScreenshot(`${device.name}-modal-appearance.png`, {
            animations: VISUAL_CONFIG.animations,
            threshold: VISUAL_CONFIG.threshold,
            maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
          });

          console.log(`✅ ${device.name} modal appearance visual regression passed`);
        });

        test(`${device.name}: should match form appearance`, async () => {
          console.log(`📸 Testing ${device.name} form appearance`);

          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          
          await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
          
          await expect(aiSearchPage.aiSearchModal).toHaveScreenshot(`${device.name}-filled-form.png`, {
            animations: VISUAL_CONFIG.animations,
            threshold: VISUAL_CONFIG.threshold,
            maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
          });

          console.log(`✅ ${device.name} form appearance visual regression passed`);
        });
      });
    });
  });

  // Component-specific visual tests
  test.describe('Component Visual Tests', () => {
    test.use({ ...devices['Desktop Chrome'] });
    
    let aiSearchPage: AISearchPage;

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should match dropdown appearance', async () => {
      console.log('📸 Testing dropdown visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Test country dropdown
      await aiSearchPage.countrySelector.click();
      await page.waitForTimeout(500);
      
      await expect(page.locator('[role="listbox"], .dropdown-content')).toHaveScreenshot('country-dropdown.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });
      
      // Close dropdown
      await page.click('body');
      await page.waitForTimeout(300);
      
      // Test category dropdown
      await aiSearchPage.categorySelector.click();
      await page.waitForTimeout(500);
      
      await expect(page.locator('[role="listbox"], .dropdown-content')).toHaveScreenshot('category-dropdown.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      console.log('✅ Dropdown visual regression passed');
    });

    test('should match button states appearance', async () => {
      console.log('📸 Testing button states visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Test normal state
      await expect(aiSearchPage.searchButton).toHaveScreenshot('search-button-normal.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });
      
      // Test hover state
      await aiSearchPage.searchButton.hover();
      await page.waitForTimeout(200);
      
      await expect(aiSearchPage.searchButton).toHaveScreenshot('search-button-hover.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });
      
      // Test focus state
      await aiSearchPage.searchButton.focus();
      await page.waitForTimeout(200);
      
      await expect(aiSearchPage.searchButton).toHaveScreenshot('search-button-focus.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      console.log('✅ Button states visual regression passed');
    });

    test('should match form validation appearance', async () => {
      console.log('📸 Testing form validation visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      // Submit empty form to trigger validation
      await aiSearchPage.submitSearch();
      await page.waitForTimeout(500);
      
      // Take screenshot of validation state
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('form-validation-state.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Form validation visual regression passed');
    });

    test('should match progress indicators appearance', async () => {
      console.log('📸 Testing progress indicators visual regression');

      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      await aiSearchPage.submitSearch();
      
      // Wait for progress indicators
      await page.waitForTimeout(1000);
      
      // Take screenshot of progress state
      await expect(aiSearchPage.searchProgress).toHaveScreenshot('progress-indicators.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
      });

      console.log('✅ Progress indicators visual regression passed');
    });
  });

  // Responsive visual tests
  test.describe('Responsive Visual Tests', () => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1366, height: 768, name: 'desktop-small' },
      { width: 1920, height: 1080, name: 'desktop-large' },
    ];

    viewports.forEach(viewport => {
      test.describe(`${viewport.name} (${viewport.width}x${viewport.height}) Visual Tests`, () => {
        test.use({ viewport });
        
        let aiSearchPage: AISearchPage;

        test.beforeEach(async ({ page }) => {
          aiSearchPage = new AISearchPage(page);
          await login(page);
        });

        test(`${viewport.name}: should match responsive layout`, async () => {
          console.log(`📸 Testing ${viewport.name} responsive layout`);

          await aiSearchPage.navigateToMediaContacts();
          await aiSearchPage.openAISearchModal();
          
          await expect(aiSearchPage.aiSearchModal).toHaveScreenshot(`${viewport.name}-responsive-layout.png`, {
            animations: VISUAL_CONFIG.animations,
            threshold: VISUAL_CONFIG.threshold,
            maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
          });

          console.log(`✅ ${viewport.name} responsive layout visual regression passed`);
        });
      });
    });
  });

  // Dark/light theme visual tests (if applicable)
  test.describe('Theme Visual Tests', () => {
    test.use({ ...devices['Desktop Chrome'] });
    
    let aiSearchPage: AISearchPage;

    test.beforeEach(async ({ page }) => {
      aiSearchPage = new AISearchPage(page);
      await login(page);
    });

    test('should match light theme appearance', async () => {
      console.log('📸 Testing light theme visual regression');

      // Ensure light theme
      await page.emulateMedia({ colorScheme: 'light' });
      
      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('light-theme-modal.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Light theme visual regression passed');
    });

    test('should match dark theme appearance', async () => {
      console.log('📸 Testing dark theme visual regression');

      // Switch to dark theme
      await page.emulateMedia({ colorScheme: 'dark' });
      
      await aiSearchPage.navigateToMediaContacts();
      await aiSearchPage.openAISearchModal();
      await aiSearchPage.fillSearchForm(VISUAL_TEST_DATA);
      
      await expect(aiSearchPage.aiSearchModal).toHaveScreenshot('dark-theme-modal.png', {
        animations: VISUAL_CONFIG.animations,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });

      console.log('✅ Dark theme visual regression passed');
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