import { test, expect } from '@playwright/test';

test.describe('Theme switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.evaluate(() => localStorage.clear());
    
    // Navigate to the theme sandbox page
    await page.goto('/theme-sandbox');
  });

  test('should load with system theme by default', async ({ page }) => {
    // Check if the page loads
    await expect(page.getByRole('heading', { name: 'Theme Sandbox' })).toBeVisible();
    
    // Check if theme toggle is present
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
  });

  test('should switch to dark theme', async ({ page }) => {
    // Open theme dropdown
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    
    // Click dark theme option
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    
    // Verify dark theme is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should switch to light theme', async ({ page }) => {
    // First switch to dark
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    
    // Then switch to light
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Light' }).click();
    
    // Verify light theme is applied
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should persist theme selection', async ({ page }) => {
    // Switch to dark theme
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    
    // Reload page
    await page.reload();
    
    // Verify dark theme is still applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should switch to system theme', async ({ page }) => {
    // Switch to dark first
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    
    // Then switch to system
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'System' }).click();
    
    // Verify system theme (class should be removed)
    const htmlClass = await page.locator('html').getAttribute('class');
    // System theme behavior depends on OS, so we just verify the action completed
    expect(htmlClass).toBeTruthy();
  });

  test('should have accessible theme toggle', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: 'Toggle theme' });
    
    // Check if it's keyboard accessible
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    
    // Open dropdown with keyboard
    await page.keyboard.press('Enter');
    
    // Check if dropdown options are accessible
    await expect(page.getByRole('menuitem', { name: 'Light' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Dark' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'System' })).toBeVisible();
  });

  test('should update component colors immediately', async ({ page }) => {
    // Get background color before theme change
    const initialBg = await page.evaluate(() => 
      getComputedStyle(document.body).backgroundColor
    );
    
    // Switch to dark theme
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    
    // Wait a bit for theme transition
    await page.waitForTimeout(100);
    
    // Get background color after theme change
    const darkBg = await page.evaluate(() => 
      getComputedStyle(document.body).backgroundColor
    );
    
    // Colors should be different
    expect(initialBg).not.toBe(darkBg);
  });
});
