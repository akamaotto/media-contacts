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
    await page.waitForTimeout(3000);

    // Check current URL to see if we're on login page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Try to find and fill login form with different selectors
    try {
      await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email"]', { timeout: 5000 });

      // Try multiple selectors for email
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]'
      ];

      let emailFilled = false;
      for (const selector of emailSelectors) {
        try {
          await page.fill(selector, 'newtest@test.com', { timeout: 1000 });
          emailFilled = true;
          console.log(`Filled email using selector: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (emailFilled) {
        // Try multiple selectors for password
        const passwordSelectors = [
          'input[type="password"]',
          'input[name="password"]',
          'input[placeholder*="password" i]',
          'input[placeholder*="Password" i]'
        ];

        for (const selector of passwordSelectors) {
          try {
            await page.fill(selector, 'password123', { timeout: 1000 });
            console.log(`Filled password using selector: ${selector}`);
            break;
          } catch (e) {
            // Continue to next selector
          }
        }

        // Try multiple selectors for submit button
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Sign")',
          'button:has-text("Login")',
          'input[type="submit"]',
          'button:has-text("Sign in")',
          'button:has-text("Log in")'
        ];

        for (const selector of submitSelectors) {
          try {
            await page.click(selector, { timeout: 1000 });
            console.log(`Clicked submit button using selector: ${selector}`);
            break;
          } catch (e) {
            // Continue to next selector
          }
        }

        // Wait for navigation
        await page.waitForTimeout(3000);
        const afterLoginUrl = page.url();
        console.log(`After login URL: ${afterLoginUrl}`);

        if (afterLoginUrl.includes('/dashboard')) {
          console.log('Login successful!');
        } else {
          console.log('Login might have failed - not redirected to dashboard');
        }
      }
    } catch (error) {
      console.log('Login attempt failed:', error.message);
    }

    // Check each page
    for (const pageInfo of pages) {
      console.log(`\n=== Checking ${pageInfo.name} ===`);

      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if we're redirected to login
      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);

      if (finalUrl.includes('/auth/login')) {
        console.log('Redirected to login - not authenticated');
        continue;
      }

      // Screenshot
      await page.screenshot({
        path: `header-check-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true
      });

      // Look for potential header text using various selectors
      const potentialHeaders = await page.locator('h1, h2, h3, .text-3xl, .text-2xl, .text-xl').all();
      console.log(`Potential header elements found: ${potentialHeaders.length}`);

      const allHeaderTexts = [];
      for (let i = 0; i < potentialHeaders.length; i++) {
        const text = await potentialHeaders[i].textContent();
        if (text && text.trim()) {
          allHeaderTexts.push(text.trim());
          console.log(`  Header[${i}]: "${text.trim()}"`);
        }
      }

      // Look for text that might be page titles in the page
      const pageContent = await page.content();
      const titleMatch = pageContent.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        console.log(`Page title: "${titleMatch[1]}"`);
      }

      // Check for duplicate texts
      const duplicates = allHeaderTexts.filter((text, index) =>
        allHeaderTexts.indexOf(text) !== index && text !== ''
      );

      if (duplicates.length > 0) {
        console.log(`🚨 DUPLICATE HEADERS FOUND: ${JSON.stringify(duplicates)}`);
      } else {
        console.log(`✅ No duplicate headers found`);
      }

      await page.waitForTimeout(1000);
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

checkHeaders();