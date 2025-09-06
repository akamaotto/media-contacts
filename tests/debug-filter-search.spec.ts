import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, loginAsTestUser, verifyUserRole } from './auth-test-utils';

test.describe('Debug Filter Search Issues', () => {
  test('debug country filter search with console monitoring', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    const networkRequests: any[] = [];
    
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('request', request => {
      if (request.url().includes('/api/filters/countries')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/filters/countries')) {
        response.json().then(data => {
          console.log('API Response:', JSON.stringify(data, null, 2));
        }).catch(() => {
          console.log('Failed to parse API response as JSON');
        });
      }
    });

    // Login and navigate using new auth bypass
    await setupAuthenticatedTest(page, 'admin');
    
    // Test country filter search
    console.log('🧪 Starting country filter test...');
    
    // Open countries filter
    await page.click('button:has-text("Select countries")');
    await page.waitForTimeout(500);
    
    // Type search term
    console.log('🔍 Typing "Egy" in search field...');
    await page.fill('input[placeholder*="Search countries"]', 'Egy');
    
    // Wait for API call and response
    await page.waitForTimeout(2000);
    
    // Check for results
    const egyptOption = page.locator('text="Egypt"');
    const noResultsMessage = page.locator('text="No countries found"');
    
    const egyptVisible = await egyptOption.isVisible();
    const noResultsVisible = await noResultsMessage.isVisible();
    
    console.log('📊 Test Results:');
    console.log('- Egypt visible:', egyptVisible);
    console.log('- No results message visible:', noResultsVisible);
    console.log('- Console logs count:', consoleLogs.length);
    console.log('- Network requests count:', networkRequests.length);
    
    // Log all console messages
    console.log('\n📝 Console Logs:');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });
    
    // Log network requests
    console.log('\n🌐 Network Requests:');
    networkRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.method} ${req.url}`);
    });
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'test-results/country-filter-debug.png',
      fullPage: true 
    });
    
    // Assert that Egypt should be found
    if (!egyptVisible && noResultsVisible) {
      throw new Error('Egypt not found in search results - this indicates the filter search bug');
    }
    
    expect(egyptVisible).toBe(true);
  });

  test('test API endpoint directly via fetch', async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    
    // Test API endpoint directly using page.evaluate
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/filters/countries?s=Egy&limit=20');
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('🔬 Direct API Test Result:', JSON.stringify(apiResponse, null, 2));
    
    // Verify API works correctly
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.ok).toBe(true);
    expect(apiResponse.data.items).toBeDefined();
    expect(apiResponse.data.items.length).toBeGreaterThan(0);
    
    // Check if Egypt is in the results
    const hasEgypt = apiResponse.data.items.some((item: any) => 
      item.label.toLowerCase().includes('egypt')
    );
    expect(hasEgypt).toBe(true);
  });
});
