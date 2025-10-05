const { chromium } = require('playwright');

async function checkHeaders() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pages = [
    { name: 'Dashboard', url: 'http://localhost:3000/dashboard' },
    { name: 'Media Contacts', url: 'http://localhost:3000/dashboard/media-contacts' },
    { name: 'Beats', url: 'http://localhost:3000/dashboard/beats' },
    { name: 'Categories', url: 'http://localhost:3000/dashboard/categories' },
    { name: 'Outlets', url: 'http://localhost:3000/dashboard/outlets' },
    { name: 'Publishers', url: 'http://localhost:3000/dashboard/publishers' },
    { name: 'Countries', url: 'http://localhost:3000/dashboard/countries' },
    { name: 'Regions', url: 'http://localhost:3000/dashboard/regions' },
    { name: 'Languages', url: 'http://localhost:3000/dashboard/languages' }
  ];

  try {
    // Try to login first
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(2000);

    // Try to find and fill login form
    try {
      await page.fill('input[type="email"]', 'newtest@test.com');
      await page.fill('input[type="password"]', 'password123');

      const submitButton = await page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('Login successful!');
    } catch (error) {
      console.log('Login failed or already logged in:', error.message);
      // Try to navigate to dashboard directly
      await page.goto('http://localhost:3000/dashboard');
    }

    await page.waitForTimeout(2000);

    // Check each page
    for (const pageInfo of pages) {
      console.log(`\n=== Checking ${pageInfo.name} ===`);

      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Screenshot
      await page.screenshot({
        path: `header-check-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true
      });

      // Find all header elements
      const h1s = await page.locator('h1').all();
      const h2s = await page.locator('h2').all();
      const h3s = await page.locator('h3').all();

      console.log(`H1 elements: ${h1s.length}`);
      for (let i = 0; i < h1s.length; i++) {
        const text = await h1s[i].textContent();
        console.log(`  H1[${i}]: "${text}"`);
      }

      console.log(`H2 elements: ${h2s.length}`);
      for (let i = 0; i < h2s.length; i++) {
        const text = await h2s[i].textContent();
        console.log(`  H2[${i}]: "${text}"`);
      }

      console.log(`H3 elements: ${h3s.length}`);
      for (let i = 0; i < h3s.length; i++) {
        const text = await h3s[i].textContent();
        console.log(`  H3[${i}]: "${text}"`);
      }

      // Check for any page title or header text that might be duplicated
      const pageTitle = await page.title();
      console.log(`Page title: "${pageTitle}"`);

      await page.waitForTimeout(1000);
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

checkHeaders();