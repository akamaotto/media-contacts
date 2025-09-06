import { test, expect } from '@playwright/test';

test.describe('Media Contacts Smoke Test', () => {
  test('should load media contacts page with test bypass auth', async ({ page }) => {
    // Use test bypass for fastest, most reliable authentication
    await page.goto('http://localhost:3000/api/auth/signin/test-bypass');

    // Wait for test bypass form to load
    await expect(page.locator('input[name="testUser"]')).toBeVisible();

    // Select admin user for testing
    await page.fill('input[name="testUser"]', 'admin');

    // Submit test bypass form
    await page.click('button[type="submit"]');

    // Wait for successful authentication and redirect
    await page.waitForURL('/', { timeout: 10000 });

    // Now navigate to media contacts page
    await page.goto('http://localhost:3000/media-contacts');

    // Verify page loaded correctly
    await expect(page).toHaveTitle(/Media Contacts/);

    // Check for filter elements with proper waiting
    await expect(page.locator('button:has-text("Select countries")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Select beats")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Select outlets")')).toBeVisible({ timeout: 5000 });

    console.log('✅ Media contacts page loaded successfully with test bypass auth');
  });

  test('should handle Egypt country filter search', async ({ page }) => {
    // Use test bypass for authentication
    await page.goto('http://localhost:3000/api/auth/signin/test-bypass');
    await page.fill('input[name="testUser"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to media contacts
    await page.goto('http://localhost:3000/media-contacts');

    // Wait for filters to be ready
    await expect(page.locator('button:has-text("Select countries")')).toBeVisible();

    // Open countries filter
    await page.click('button:has-text("Select countries")');

    // Wait for dropdown to open
    await expect(page.locator('[role="combobox"]')).toBeVisible();

    // Type "Egy" in search
    await page.fill('input[placeholder*="Search countries"]', 'Egy');

    // Wait for search results (with proper timeout)
    await page.waitForTimeout(1000); // Allow time for API call

    // Verify Egypt appears in results
    const egyptOption = page.locator('text="Egypt"');
    await expect(egyptOption).toBeVisible({ timeout: 5000 });

    console.log('✅ Egypt country filter search working correctly');
  });
});
