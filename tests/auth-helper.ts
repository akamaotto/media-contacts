import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
}

export const TEST_USERS = {
  admin: {
    email: 'test@test.com',
    password: 'test@123'
  }
} as const;

/**
 * Login helper for Playwright tests
 */
export async function loginUser(page: Page, user: TestUser) {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for login form to be visible
  await expect(page.locator('form')).toBeVisible();
  
  // Fill in credentials
  await page.fill('input[id="email"]', user.email);
  await page.fill('input[id="password"]', user.password);
  
  // Submit form and wait for navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
  
  // Wait a bit for any client-side redirects
  await page.waitForTimeout(2000);
  
  // Verify we're logged in by checking for authenticated content
  // Look for sidebar or any navigation elements that indicate we're logged in
  await expect(page.locator('.sidebar, nav, [data-sidebar]')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to media contacts page after login
 */
export async function navigateToMediaContacts(page: Page) {
  // Click on Media Contacts in sidebar or navigation
  await page.click('a[href="/media-contacts"], text="Media Contacts"');
  
  // Wait for page to load
  await page.waitForURL('/media-contacts');
  
  // Verify page loaded correctly
  await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/Media Contacts/i);
}

/**
 * Wait for filters to be loaded and ready
 */
export async function waitForFiltersReady(page: Page) {
  // Wait for filter dropdowns to be present
  await expect(page.locator('button:has-text("Select countries")')).toBeVisible();
  await expect(page.locator('button:has-text("Select beats")')).toBeVisible();
  await expect(page.locator('button:has-text("Select outlets")')).toBeVisible();
  
  // Wait a bit for any async loading to complete
  await page.waitForTimeout(1000);
}
