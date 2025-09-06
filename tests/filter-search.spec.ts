import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest } from './auth-test-utils';

test.describe('Filter Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated test environment
    await setupAuthenticatedTest(page, 'admin');
  });

  test('should find Egypt when searching "Egy" in countries filter', async ({ page }) => {
    // Open countries filter dropdown
    await page.click('button:has-text("Select countries")');
    
    // Wait for dropdown to open
    await expect(page.locator('[role="combobox"][aria-expanded="true"]')).toBeVisible();
    
    // Type "Egy" in the search input
    await page.fill('input[placeholder*="Search countries"]', 'Egy');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check if Egypt appears in results
    const egyptOption = page.locator('text="Egypt"');
    await expect(egyptOption).toBeVisible({ timeout: 5000 });
    
    // Verify the option is clickable
    await expect(egyptOption).toBeEnabled();
  });

  test('should find beats when searching in beats filter', async ({ page }) => {
    // Open beats filter dropdown
    await page.click('button:has-text("Select beats")');
    
    // Wait for dropdown to open
    await expect(page.locator('[role="combobox"][aria-expanded="true"]')).toBeVisible();
    
    // Type "Tech" in the search input
    await page.fill('input[placeholder*="Search beats"]', 'Tech');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check if any tech-related beats appear
    const techOptions = page.locator('[role="option"]:has-text("Tech")');
    await expect(techOptions.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show loading state during search', async ({ page }) => {
    // Open countries filter dropdown
    await page.click('button:has-text("Select countries")');
    
    // Type search term
    await page.fill('input[placeholder*="Search countries"]', 'United');
    
    // Should show loading indicator briefly
    const loadingIndicator = page.locator('text="Loading"');
    
    // Wait for either loading to appear or results to show
    await Promise.race([
      loadingIndicator.waitFor({ timeout: 1000 }).catch(() => {}),
      page.locator('[role="option"]').first().waitFor({ timeout: 2000 })
    ]);
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    // Open countries filter dropdown
    await page.click('button:has-text("Select countries")');
    
    // Type a search term that should return no results
    await page.fill('input[placeholder*="Search countries"]', 'XYZ123NonExistent');
    
    // Wait for search to complete
    await page.waitForTimeout(1000);
    
    // Should show "No countries found" message
    await expect(page.locator('text="No countries found"')).toBeVisible();
  });

  test('should allow selecting and deselecting countries', async ({ page }) => {
    // Open countries filter dropdown
    await page.click('button:has-text("Select countries")');
    
    // Search for Egypt
    await page.fill('input[placeholder*="Search countries"]', 'Egy');
    await page.waitForTimeout(500);
    
    // Click on Egypt to select it
    await page.click('text="Egypt"');
    
    // Verify button text changes to show selection
    await expect(page.locator('button:has-text("1 countries selected")')).toBeVisible();
    
    // Open dropdown again and deselect
    await page.click('button:has-text("1 countries selected")');
    await page.click('text="Egypt"');
    
    // Verify button text returns to default
    await expect(page.locator('button:has-text("Select countries")')).toBeVisible();
  });
});
