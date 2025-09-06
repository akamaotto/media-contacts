import { Page, expect } from '@playwright/test';

export type TestUserRole = 'admin' | 'user' | string;

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Predefined test users for common scenarios
 */
export const TEST_USERS = {
  admin: {
    id: 'test-admin-id',
    email: 'test@test.com',
    name: 'Test Admin',
    role: 'ADMIN'
  },
  user: {
    id: 'test-user-id', 
    email: 'testuser@test.com',
    name: 'Test User',
    role: 'USER'
  }
} as const;

/**
 * Fast login using test bypass provider (only works in test environment)
 */
export async function loginAsTestUser(page: Page, userType: TestUserRole = 'admin') {
  console.log(`🔐 Logging in as test user: ${userType}`);
  
  // Navigate to NextAuth signin page
  await page.goto('/api/auth/signin');
  
  // Wait for signin page to load
  await expect(page.locator('h1, [role="heading"]')).toBeVisible({ timeout: 10000 });
  
  // Look for test bypass provider button
  const testBypassButton = page.locator('button:has-text("Sign in with Test Bypass"), form:has([name="testUser"])');
  
  if (await testBypassButton.isVisible()) {
    // Click test bypass provider
    await testBypassButton.first().click();
    
    // Fill test user field
    await page.fill('input[name="testUser"]', userType);
    
    // Submit form
    await page.click('button[type="submit"]');
  } else {
    throw new Error('Test bypass provider not available. Make sure NODE_ENV=test');
  }
  
  // Wait for successful login redirect
  await page.waitForURL('/', { timeout: 15000 });
  
  // Verify we're logged in by checking for authenticated elements
  await expect(page.locator('.sidebar, nav, [data-sidebar]')).toBeVisible({ timeout: 10000 });
  
  console.log(`✅ Successfully logged in as: ${userType}`);
}

/**
 * Login with custom test user data
 */
export async function loginAsCustomTestUser(page: Page, customUserId: string) {
  return loginAsTestUser(page, customUserId);
}

/**
 * Verify user is logged in and has expected role
 */
export async function verifyUserRole(page: Page, expectedRole: string) {
  // Check session data via JavaScript
  const userRole = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    return session?.user?.role;
  });
  
  expect(userRole).toBe(expectedRole);
}

/**
 * Logout current user
 */
export async function logoutUser(page: Page) {
  await page.goto('/api/auth/signout');
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * Navigate to media contacts page after login
 */
export async function navigateToMediaContacts(page: Page) {
  // Click on Media Contacts in sidebar or navigation
  const mediaContactsLink = page.locator('a[href="/media-contacts"], text="Media Contacts"');
  
  if (await mediaContactsLink.isVisible()) {
    await mediaContactsLink.click();
  } else {
    // Direct navigation if link not found
    await page.goto('/media-contacts');
  }
  
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

/**
 * Complete auth setup for tests - login and navigate to media contacts
 */
export async function setupAuthenticatedTest(page: Page, userType: TestUserRole = 'admin') {
  await loginAsTestUser(page, userType);
  await navigateToMediaContacts(page);
  await waitForFiltersReady(page);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    return !!session?.user;
  } catch (error) {
    return false;
  }
}