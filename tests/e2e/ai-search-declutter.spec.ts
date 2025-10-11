import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../auth-test-utils';

test.describe('Decluttered AI Search Modal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    await page.goto('/dashboard/media-contacts');
    await page.waitForURL('**/dashboard/media-contacts');
  });

  test('modal surfaces lean layout', async ({ page }) => {
    await page.getByRole('button', { name: /Find contacts with AI/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Ensure legacy hero copy is gone
    await expect(dialog.getByText(/Describe what you need and we’ll handle the search/i)).toHaveCount(0);
    await expect(dialog.getByText(/AI contact search/i)).toHaveCount(0);

    // Verify metric tiles remain visible
    await expect(dialog.getByText(/^Countries$/i)).toBeVisible();
    await expect(dialog.getByText(/^Categories$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^Beats$/i).first()).toBeVisible();

    // Optional filters collapsed by default
    const optionalFilters = dialog.getByRole('button', { name: /Optional filters/i });
    await expect(optionalFilters).toBeVisible();

    // Expand and collapse to confirm interaction
    await optionalFilters.click();
    const optionalCategoriesLabel = dialog.locator('label:has-text("Categories")');
    await expect(optionalCategoriesLabel).toBeVisible();
    await optionalFilters.click();
    await expect(optionalCategoriesLabel).toBeHidden();
  });

  test('search for tech bloggers in Nigeria covering fintech', async ({ page }) => {
    await page.getByRole('button', { name: /Find contacts with AI/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const queryInput = dialog.locator('[data-testid="search-query-input"]');
    await queryInput.fill('Tech bloggers in Nigeria covering Fintech');

    // Select Nigeria
    await dialog.locator('[data-testid="country-selector-trigger"]').click();
    const searchCountries = page.locator('input[placeholder="Search countries"]');
    await searchCountries.fill('Nigeria');
    await page.getByRole('button', { name: /Nigeria/i }).first().click();
    await page.keyboard.press('Escape');

    // Submit and wait for success state
    await dialog.getByRole('button', { name: /Start AI search/i }).click();
    await expect(page.getByText(/Search Initiated Successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /View Results/i })).toBeVisible();
  });
});
