import { test, expect } from '@playwright/test';

test.describe('Media Contacts Filter Tests', () => {
  test('should find Egypt when searching countries filter', async ({ page }) => {
    // Use reliable authentication method that works
    await page.goto('http://localhost:3000/login');

    // Wait for login form to be fully loaded
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Use test credentials that should exist
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test@123');
    await page.click('button[type="submit"]');

    // Wait for successful login - either redirect to home or media contacts
    await page.waitForURL(/\/(media-contacts|$)/, { timeout: 10000 });

    // If we're on home page, navigate to media contacts
    if (page.url() === 'http://localhost:3000/') {
      await page.goto('http://localhost:3000/media-contacts');
    }

    // Verify we're on the media contacts page
    await expect(page).toHaveTitle(/Media Contacts/);

    // Wait for filters to be ready
    await expect(page.locator('button:has-text("Select countries")')).toBeVisible();

    // Open countries filter
    await page.click('button:has-text("Select countries")');

    // Wait for dropdown to open
    await expect(page.locator('[role="combobox"]')).toBeVisible();

    // Find and fill search input
    const searchInput = page.locator('input[placeholder*="Search countries"]');
    await expect(searchInput).toBeVisible();

    // Type "Egy" and test search
    await searchInput.fill('Egy');

    // Wait for search results (allow time for API call)
    await page.waitForTimeout(1500);

    // Verify Egypt appears in results
    const egyptOption = page.locator('text="Egypt"');
    await expect(egyptOption).toBeVisible({ timeout: 5000 });

    console.log('✅ Egypt country filter search working correctly');
  });

  test('should test all filter types are functional', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test@123');
    await page.click('button[type="submit"]');

    // Navigate to media contacts
    await page.waitForURL(/\/(media-contacts|$)/, { timeout: 10000 });
    if (page.url() === 'http://localhost:3000/') {
      await page.goto('http://localhost:3000/media-contacts');
    }

    // Verify all filter components are present and functional
    const filters = [
      { selector: 'button:has-text("Select countries")', name: 'Countries' },
      { selector: 'button:has-text("Select beats")', name: 'Beats' },
      { selector: 'button:has-text("Select outlets")', name: 'Outlets' },
      { selector: 'button:has-text("Select regions")', name: 'Regions' },
      { selector: 'button:has-text("Select languages")', name: 'Languages' }
    ];

    for (const filter of filters) {
      const button = page.locator(filter.selector);
      await expect(button).toBeVisible({ timeout: 5000 });

      // Click to open filter
      await button.click();

      // Verify dropdown opens
      await expect(page.locator('[role="combobox"]')).toBeVisible({ timeout: 3000 });

      // Close dropdown
      await page.keyboard.press('Escape');

      console.log(`✅ ${filter.name} filter functional`);
    }

    console.log('✅ All filter types tested successfully');
  });
});
