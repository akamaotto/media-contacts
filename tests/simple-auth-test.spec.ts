import { test, expect } from '@playwright/test';

test.describe('Simple Auth Test', () => {
  test('verify test environment and auth bypass', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/api/auth/signin');
    
    // Take screenshot to see what providers are available
    await page.screenshot({ 
      path: 'test-results/signin-page.png',
      fullPage: true 
    });
    
    // Check if test bypass provider is available
    const testBypassButton = page.locator('button:has-text("Sign in with Test Bypass")');
    const credentialsForm = page.locator('form:has([name="email"])');
    
    console.log('Test bypass button visible:', await testBypassButton.isVisible());
    console.log('Credentials form visible:', await credentialsForm.isVisible());
    
    // Log current environment
    const nodeEnv = await page.evaluate(() => {
      return (window as any).__NEXT_DATA__?.env?.NODE_ENV || 'unknown';
    });
    console.log('Node environment:', nodeEnv);
    
    // If test bypass is available, try it
    if (await testBypassButton.isVisible()) {
      console.log('✅ Test bypass provider found - clicking it');
      await testBypassButton.click();
      
      // Fill test user
      await page.fill('input[name="testUser"]', 'admin');
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL('/', { timeout: 10000 });
      
      // Verify login success
      await expect(page.locator('.sidebar, nav, [data-sidebar]')).toBeVisible();
      console.log('✅ Test bypass login successful');
    } else {
      console.log('❌ Test bypass provider not found');
      throw new Error('Test bypass provider not available');
    }
  });
});
