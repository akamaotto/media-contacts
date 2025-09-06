import { test, expect } from '@playwright/test';
test.describe('Media Contacts – contrast & hierarchy', () => {
  test('primary vs muted text classes exist', async ({ page }) => {
    await page.goto('/media-contacts');
    const header = page.locator('table thead th').first();
    await expect(header).toHaveClass(/text-muted/);
    const name = page.locator('tbody tr >> nth=0').locator('td').first().locator('span').first();
    await expect(name).toHaveClass(/text-strong/);
    const role = page.locator('tbody tr >> nth=0').locator('td').first().locator('span').nth(1);
    await expect(role).toHaveClass(/text-muted/);
    await expect(role).toHaveClass(/text-xs/);
    const updated = page.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/).first();
    await expect(updated).toHaveClass(/text-subtle/);
  });
  test('badges are quieter than body text', async ({ page }) => {
    await page.goto('/media-contacts');
    const badge = page.locator('tbody tr >> nth=0').locator('.badge, [data-badge], .inline-flex.rounded-full').first();
    await expect(badge).toHaveClass(/bg-badge|border-badge|text-fg-muted|secondary/);
  });
  test('visual snapshot', async ({ page }) => {
    await page.goto('/media-contacts');
    await expect(page).toHaveScreenshot('media-contacts-contrast.png', { maxDiffPixelRatio: 0.02 });
  });
});