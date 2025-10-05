const { chromium } = require('playwright');

async function verifyDoubleHeaderFix() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Testing double header fix...\n');

    // Test a specific page - Beats
    console.log('=== Testing Beats Page ===');
    await page.goto('http://localhost:3000/dashboard/beats');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('/auth/login')) {
      console.log('❌ Not authenticated - cannot test headers');
      return;
    }

    // Screenshot for visual verification
    await page.screenshot({
      path: 'beats-after-fix.png',
      fullPage: true
    });

    // Look for H1 and H2 elements (headers)
    const h1s = await page.locator('h1').all();
    const h2s = await page.locator('h2').all();

    console.log(`H1 elements found: ${h1s.length}`);
    for (let i = 0; i < h1s.length; i++) {
      const text = await h1s[i].textContent();
      console.log(`  H1[${i}]: "${text}"`);
    }

    console.log(`H2 elements found: ${h2s.length}`);
    for (let i = 0; i < h2s.length; i++) {
      const text = await h2s[i].textContent();
      console.log(`  H2[${i}]: "${text}"`);
    }

    // Check for elements with text-3xl class (large text)
    const largeTexts = await page.locator('.text-3xl').all();
    console.log(`Large text elements (.text-3xl): ${largeTexts.length}`);
    for (let i = 0; i < largeTexts.length; i++) {
      const text = await largeTexts[i].textContent();
      console.log(`  Large text[${i}]: "${text}"`);
    }

    // Collect all text that could be considered headers
    const allHeaderTexts = [];

    for (const h1 of h1s) {
      const text = await h1.textContent();
      if (text && text.trim()) {
        allHeaderTexts.push(text.trim());
      }
    }

    for (const h2 of h2s) {
      const text = await h2.textContent();
      if (text && text.trim()) {
        allHeaderTexts.push(text.trim());
      }
    }

    for (const largeText of largeTexts) {
      const text = await largeText.textContent();
      if (text && text.trim()) {
        allHeaderTexts.push(text.trim());
      }
    }

    console.log(`\nAll potential header texts: ${JSON.stringify(allHeaderTexts)}`);

    // Check for duplicates
    const duplicates = allHeaderTexts.filter((text, index) =>
      allHeaderTexts.indexOf(text) !== index && text !== ''
    );

    if (duplicates.length > 0) {
      console.log(`\n🚨 DUPLICATE HEADERS STILL FOUND: ${JSON.stringify(duplicates)}`);
    } else {
      console.log(`\n✅ NO DUPLICATE HEADERS FOUND - Fix successful!`);
    }

    // Check breadcrumb content
    const breadcrumb = await page.locator('[role="navigation"], .breadcrumb').first();
    if (await breadcrumb.isVisible()) {
      const breadcrumbText = await breadcrumb.textContent();
      console.log(`Breadcrumb text: "${breadcrumbText}"`);
    }

    console.log('\n✅ Verification complete! Check beats-after-fix.png screenshot.');

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
}

verifyDoubleHeaderFix();