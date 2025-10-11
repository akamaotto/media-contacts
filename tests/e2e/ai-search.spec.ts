import { test, expect, type Page } from '@playwright/test';
import path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'ai-search-screenshots');

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string, description: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage: true,
    animations: 'disabled'
  });

  console.log(`📸 Screenshot saved: ${filename} - ${description}`);
  return filepath;
}

// Helper function to login
async function login(page: Page) {
  await page.goto(BASE_URL);

  // Check if already logged in by looking for dashboard content
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
  await expect(page.locator('h1:has-text("Dashboard"), text="Media Contacts")).toBeVisible({ timeout: 5000 });
  console.log('✅ Successfully logged in');
}

test.describe('AI Search Feature - End-to-End Testing', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await login(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. Navigate to Media Contacts page and locate AI Search button', async () => {
    console.log('🔍 Step 1: Navigate to Media Contacts page');

    // Navigate to media contacts page
    await page.click('text=Media Contacts');
    await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });
    await takeScreenshot(page, '01-media-contacts-page', 'Media contacts page loaded');

    // Look for AI Search button
    const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
    await expect(aiSearchButton).toBeVisible({ timeout: 5000 });
    console.log('✅ AI Search button found');
    await takeScreenshot(page, '02-ai-search-button-visible', 'AI Search button visible on page');
  });

  test('2. Open AI Search modal and verify initial state', async () => {
    console.log('🔍 Step 2: Open AI Search modal');

    // Navigate to media contacts if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('media-contacts')) {
      await page.click('text=Media Contacts');
      await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });
    }

    // Click AI Search button
    const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
    await aiSearchButton.click();

    // Wait for modal to appear
    const modal = page.locator('[role="dialog"], .dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('✅ AI Search modal opened');

    // Take screenshot of modal
    await takeScreenshot(page, '03-ai-search-modal-open', 'AI Search modal opened with form');

    // Verify modal content
    await expect(page.locator('h2:has-text("AI-Powered Contact Search")')).toBeVisible();
    await expect(page.locator('label:has-text("Search Query")')).toBeVisible();
    await expect(page.locator('label:has-text("Countries")')).toBeVisible();
    await expect(page.locator('label:has-text("Categories")')).toBeVisible();
    console.log('✅ Modal content verified');
  });

  test('3. Test Country Selection functionality', async () => {
    console.log('🔍 Step 3: Test Country Selection');

    // Navigate and open modal
    await page.click('text=Media Contacts');
    await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });

    const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
    await aiSearchButton.click();
    await page.locator('[role="dialog"]').isVisible();

    // Find country selector
    const countrySelector = page.locator('label:has-text("Countries") + button, div:has(label:text("Countries"))');
    await expect(countrySelector).toBeVisible();

    // Click on country selector dropdown
    const countryDropdown = page.locator('button:has-text("Select countries"), button[role="combobox"]:has-text("Countries")');
    if (await countryDropdown.isVisible()) {
      await countryDropdown.click();
      await takeScreenshot(page, '04-country-dropdown-open', 'Country dropdown opened');

      // Type to search for United States
      const searchInput = page.locator('input[placeholder*="Search countries"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('United States');
        await page.waitForTimeout(500);

        // Look for United States in results
        const usaOption = page.locator('div:has-text("United States")');
        if (await usaOption.isVisible()) {
          await usaOption.click();
          console.log('✅ United States selected');
          await takeScreenshot(page, '05-usa-selected', 'United States selected in country selector');
        }
      }
    }
  });

  test('4. Test Category Selection functionality', async () => {
    console.log('🔍 Step 4: Test Category Selection');

    // Navigate and open modal if not already open
    const currentUrl = page.url();
    if (!currentUrl.includes('media-contacts')) {
      await page.click('text=Media Contacts');
      await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });

      const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
      await aiSearchButton.click();
      await page.locator('[role="dialog"]').isVisible();
    }

    // Find category selector
    const categorySelector = page.locator('label:has-text("Categories"), div:has(label:text("Categories"))');
    await expect(categorySelector).toBeVisible();

    // Click on category selector dropdown
    const categoryDropdown = page.locator('button:has-text("Select categories"), button[role="combobox"]:has-text("Categories")');
    if (await categoryDropdown.isVisible()) {
      await categoryDropdown.click();
      await takeScreenshot(page, '06-category-dropdown-open', 'Category dropdown opened');

      // Look for Technology category
      const techOption = page.locator('div:has-text("Technology"), div:has-text("Tech")');
      if (await techOption.isVisible()) {
        await techOption.click();
        console.log('✅ Technology category selected');
        await takeScreenshot(page, '07-tech-category-selected', 'Technology category selected');
      }
    }
  });

  test('5. Fill out form and test validation', async () => {
    console.log('🔍 Step 5: Fill out form and test validation');

    // Navigate and open modal if not already open
    const currentUrl = page.url();
    if (!currentUrl.includes('media-contacts')) {
      await page.click('text=Media Contacts');
      await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });

      const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
      await aiSearchButton.click();
      await page.locator('[role="dialog"]').isVisible();
    }

    // Fill search query
    const searchQueryInput = page.locator('input[name*="query"], textarea[name*="query"], label:has-text("Search Query") + input, label:has-text("Search Query") + textarea');
    if (await searchQueryInput.isVisible()) {
      await searchQueryInput.fill('technology journalists in United States');
      console.log('✅ Search query filled');
    }

    // Fill other form fields if visible
    const descriptionInput = page.locator('textarea[name*="description"], input[name*="description"]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Looking for experienced technology journalists who cover AI and startups');
      console.log('✅ Description filled');
    }

    await takeScreenshot(page, '08-form-filled', 'AI Search form filled with sample data');
  });

  test('6. Test form submission and error handling', async () => {
    console.log('🔍 Step 6: Test form submission');

    // Navigate and open modal if not already open
    const currentUrl = page.url();
    if (!currentUrl.includes('media-contacts')) {
      await page.click('text=Media Contacts');
      await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });

      const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
      await aiSearchButton.click();
      await page.locator('[role="dialog"]').isVisible();
    }

    // Fill basic form
    const searchQueryInput = page.locator('input[name*="query"], textarea[name*="query"], label:has-text("Search Query") + input, label:has-text("Search Query") + textarea');
    if (await searchQueryInput.isVisible()) {
      await searchQueryInput.fill('test search for journalists');
    }

    // Look for submit button
    const submitButton = page.locator('button:has-text("Search"), button:has-text("Submit"), button:has-text("Find"), button[type="submit"]');
    if (await submitButton.isVisible()) {
      await takeScreenshot(page, '09-before-submission', 'Form ready for submission');

      // Click submit button
      await submitButton.click();
      console.log('✅ Submit button clicked');

      // Wait for any response (success, error, or loading state)
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '10-after-submission', 'State after form submission');

      // Check for loading indicators
      const loadingIndicator = page.locator('.animate-spin, [aria-busy="true"], button:disabled');
      if (await loadingIndicator.isVisible()) {
        console.log('🔄 Loading indicator detected');
        await takeScreenshot(page, '11-loading-state', 'Loading state during submission');
      }

      // Check for error messages
      const errorMessage = page.locator('.text-destructive, [role="alert"], .error-message');
      if (await errorMessage.isVisible()) {
        console.log('❌ Error message detected');
        await takeScreenshot(page, '12-error-state', 'Error state after submission');
      }

      // Check for success state
      const successMessage = page.locator('.text-green-600, .success-message, [role="alert"]:not(.text-destructive)');
      if (await successMessage.isVisible()) {
        console.log('✅ Success message detected');
        await takeScreenshot(page, '13-success-state', 'Success state after submission');
      }
    }
  });

  test('7. Test modal close functionality', async () => {
    console.log('🔍 Step 7: Test modal close');

    // Navigate and open modal if not already open
    const currentUrl = page.url();
    if (!currentUrl.includes('media-contacts')) {
      await page.click('text=Media Contacts');
      await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });

      const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
      await aiSearchButton.click();
      await page.locator('[role="dialog"]').isVisible();
    }

    // Try to close modal using close button
    const closeButton = page.locator('button:has([data-lucide="X"]), button[aria-label*="Close"], button:has-text("Close")');
    if (await closeButton.isVisible()) {
      await closeButton.click();
      console.log('✅ Close button clicked');
    } else {
      // Try escape key
      await page.keyboard.press('Escape');
      console.log('✅ Escape key pressed');
    }

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
    await takeScreenshot(page, '14-modal-closed', 'Modal closed state');

    // Verify we're back on the media contacts page
    await expect(page.locator('text=Media Contacts')).toBeVisible();
    console.log('✅ Successfully returned to media contacts page');
  });

  test('8. Overall UI/UX assessment', async () => {
    console.log('🔍 Step 8: Overall UI/UX assessment');

    // Navigate to media contacts page
    await page.click('text=Media Contacts');
    await page.waitForURL('**/dashboard/media-contacts', { timeout: 5000 });
    await takeScreenshot(page, '15-media-contacts-overview', 'Overall media contacts page layout');

    // Open AI Search modal
    const aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI")');
    await aiSearchButton.click();
    await page.locator('[role="dialog"]').isVisible();
    await takeScreenshot(page, '16-ai-search-modal-full', 'Complete AI Search modal view');

    // Check responsive design elements
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await takeScreenshot(page, '17-tablet-view', 'AI Search modal on tablet');

    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await takeScreenshot(page, '18-mobile-view', 'AI Search modal on mobile');

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('✅ UI/UX assessment screenshots captured');
  });
});