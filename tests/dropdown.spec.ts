import { test, expect } from '@playwright/test';
test('dropdown panel is opaque and above table', async ({ page }) => {
  await page.goto('/media-contacts');
  await page.getByRole('button', { name: /Select countries/i }).click();
  const panel = page.locator('[role="listbox"],[data-radix-select-content]');
  await expect(panel).toBeVisible();
  const bg = await panel.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  const z = await panel.evaluate(el => getComputedStyle(el).zIndex);
  expect(Number(z)).toBeGreaterThanOrEqual(50);
});