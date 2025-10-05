const { test, expect } = require('@playwright/test');

test.describe('Double Header Detection Tests', () => {
  const pages = [
    { name: 'Dashboard', url: '/dashboard', expectedTitle: 'Dashboard' },
    { name: 'Media Contacts', url: '/dashboard/media-contacts', expectedTitle: 'Media Contacts' },
    { name: 'Beats', url: '/dashboard/beats', expectedTitle: 'Beats' },
    { name: 'Categories', url: '/dashboard/categories', expectedTitle: 'Categories' },
    { name: 'Outlets', url: '/dashboard/outlets', expectedTitle: 'Media Outlets' },
    { name: 'Publishers', url: '/dashboard/publishers', expectedTitle: 'Publishers' },
    { name: 'Countries', url: '/dashboard/countries', expectedTitle: 'Countries' },
    { name: 'Regions', url: '/dashboard/regions', expectedTitle: 'Regions' },
    { name: 'Languages', url: '/dashboard/languages', expectedTitle: 'Languages' }
  ];

  test.beforeEach(async ({ page }) => {
    // Login first - assume we have a test user
    await page.goto('http://localhost:3000/auth/login');

    // Fill login form
    await page.fill('input[name="email"]', 'newtest@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });

  pages.forEach(({ name, url, expectedTitle }) => {
    test(`should not have double headers on ${name} page`, async ({ page }) => {
      // Navigate to the page
      await page.goto(`http://localhost:3000${url}`);
      await page.waitForLoadState('networkidle');

      // Take a screenshot for debugging
      await page.screenshot({ path: `screenshot-${name.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true });

      // Find all H1 and H2 elements that could be headers
      const h1Elements = await page.locator('h1').all();
      const h2Elements = await page.locator('h2').all();

      console.log(`\n=== ${name} Page Analysis ===`);
      console.log(`URL: ${page.url()}`);
      console.log(`H1 elements found: ${h1Elements.length}`);
      console.log(`H2 elements found: ${h2Elements.length}`);

      // Log all H1 text content
      for (let i = 0; i < h1Elements.length; i++) {
        const text = await h1Elements[i].textContent();
        console.log(`H1[${i}]: "${text}"`);
      }

      // Log all H2 text content
      for (let i = 0; i < h2Elements.length; i++) {
        const text = await h2Elements[i].textContent();
        console.log(`H2[${i}]: "${text}"`);
      }

      // Check for duplicate header text
      const allHeaderTexts = [];

      // Collect H1 texts
      for (const h1 of h1Elements) {
        const text = await h1.textContent();
        if (text && text.trim()) {
          allHeaderTexts.push(text.trim());
        }
      }

      // Collect H2 texts
      for (const h2 of h2Elements) {
        const text = await h2.textContent();
        if (text && text.trim()) {
          allHeaderTexts.push(text.trim());
        }
      }

      // Find duplicates
      const duplicates = allHeaderTexts.filter((text, index) =>
        allHeaderTexts.indexOf(text) !== index && text !== ''
      );

      console.log(`All header texts: ${JSON.stringify(allHeaderTexts)}`);
      console.log(`Duplicate headers found: ${JSON.stringify(duplicates)}`);

      // Assert no duplicate headers (except empty strings)
      if (name === 'Dashboard') {
        // Dashboard is special - we expect no "Dashboard" h1/h2, only sidebar shows it
        const dashboardHeaders = allHeaderTexts.filter(text => text === 'Dashboard');
        console.log(`Dashboard headers count: ${dashboardHeaders.length}`);
        expect(dashboardHeaders.length).toBe(0);
      } else {
        // For other pages, we expect exactly one header with the page title
        const expectedHeaders = allHeaderTexts.filter(text =>
          text.toLowerCase().includes(expectedTitle.toLowerCase())
        );
        console.log(`Expected headers for "${expectedTitle}": ${expectedHeaders.length}`);
        expect(expectedHeaders.length).toBeGreaterThanOrEqual(1);

        // And no duplicates of the expected title
        const duplicateExpectedHeaders = allHeaderTexts.filter((text, index) =>
          text.toLowerCase().includes(expectedTitle.toLowerCase()) &&
          allHeaderTexts.findIndex(t => t.toLowerCase().includes(expectedTitle.toLowerCase())) !== index
        );
        console.log(`Duplicate expected headers: ${duplicateExpectedHeaders.length}`);
        expect(duplicateExpectedHeaders.length).toBe(0);
      }

      // General check - no exact duplicates
      const exactDuplicates = allHeaderTexts.filter((text, index) =>
        allHeaderTexts.indexOf(text) !== index && text !== ''
      );
      console.log(`Exact duplicates: ${exactDuplicates.length}`);
      expect(exactDuplicates.length).toBe(0);
    });
  });
});