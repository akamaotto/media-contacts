import { test, expect } from '@playwright/test';

test.describe('Media Contacts Filter Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the media contacts page
    await page.goto('/media-contacts');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display popular countries in filter dropdown', async ({ page }) => {
    // Click on the countries filter dropdown
    await page.click('button:has-text("Select countries...")');
    
    // Wait for the dropdown to open and load popular countries
    await page.waitForSelector('[data-slot="command-item"]', { timeout: 10000 });
    
    // Check that popular countries are displayed
    const countryItems = await page.locator('[data-slot="command-item"]').all();
    expect(countryItems.length).toBeGreaterThan(0);
  });

  test('should filter countries when typing in search box', async ({ page }) => {
    // Click on the countries filter dropdown
    await page.click('button:has-text("Select countries...")');
    
    // Wait for the dropdown to open
    await page.waitForSelector('[data-slot="command-input"]', { timeout: 10000 });
    
    // Type in the search box
    await page.fill('[data-slot="command-input"]', 'egypt');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check that search results are displayed
    const countryItems = await page.locator('[data-slot="command-item"]').all();
    expect(countryItems.length).toBeGreaterThan(0);
    
    // Check that the first result contains "egypt"
    const firstCountryText = await countryItems[0].textContent();
    expect(firstCountryText?.toLowerCase()).toContain('egypt');
  });

  test('should work for beats filter', async ({ page }) => {
    // Click on the beats filter dropdown
    await page.click('button:has-text("Select beats...")');
    
    // Wait for the dropdown to open
    await page.waitForSelector('[data-slot="command-item"]', { timeout: 10000 });
    
    // Check that popular beats are displayed
    const beatItems = await page.locator('[data-slot="command-item"]').all();
    expect(beatItems.length).toBeGreaterThan(0);
  });

  test('should work for outlets filter', async ({ page }) => {
    // Click on the outlets filter dropdown
    await page.click('button:has-text("Select outlets...")');
    
    // Wait for the dropdown to open
    await page.waitForSelector('[data-slot="command-item"]', { timeout: 10000 });
    
    // Check that popular outlets are displayed
    const outletItems = await page.locator('[data-slot="command-item"]').all();
    expect(outletItems.length).toBeGreaterThan(0);
  });

  test('should work for regions filter', async ({ page }) => {
    // Click on the regions filter dropdown
    await page.click('button:has-text("Select regions...")');
    
    // Wait for the dropdown to open
    await page.waitForSelector('[data-slot="command-item"]', { timeout: 10000 });
    
    // Check that popular regions are displayed
    const regionItems = await page.locator('[data-slot="command-item"]').all();
    expect(regionItems.length).toBeGreaterThan(0);
  });

  test('should work for languages filter', async ({ page }) => {
    // Click on the languages filter dropdown
    await page.click('button:has-text("Select languages...")');
    
    // Wait for the dropdown to open
    await page.waitForSelector('[data-slot="command-item"]', { timeout: 10000 });
    
    // Check that popular languages are displayed
    const languageItems = await page.locator('[data-slot="command-item"]').all();
    expect(languageItems.length).toBeGreaterThan(0);
  });
});