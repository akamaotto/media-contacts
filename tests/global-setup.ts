import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS } from './auth-test-utils';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login as admin user and save storage state
  await page.goto('/api/auth/signin');
  
  // Use test bypass for faster login
  const testBypassButton = page.locator('button:has-text("Sign in with Test Bypass"), form:has([name="testUser"])');
  if (await testBypassButton.isVisible()) {
    await testBypassButton.first().click();
    await page.fill('input[name="testUser"]', 'admin');
    await page.click('button[type="submit"]');
  }
  
  // Wait for successful login
  await page.waitForURL('/', { timeout: 15000 });
  
  // Save storage state
  await page.context().storageState({ path: 'tests/storage-state/admin.json' });
  
  // Login as regular user and save storage state
  await page.goto('/api/auth/signout');
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login', { timeout: 10000 });
  
  await page.goto('/api/auth/signin');
  if (await testBypassButton.isVisible()) {
    await testBypassButton.first().click();
    await page.fill('input[name="testUser"]', 'user');
    await page.click('button[type="submit"]');
  }
  
  await page.waitForURL('/', { timeout: 15000 });
  await page.context().storageState({ path: 'tests/storage-state/user.json' });
  
  await browser.close();
}

export default globalSetup;