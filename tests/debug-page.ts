import { chromium } from '@playwright/test';

async function debugPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.text()}`));

  // Navigate to the page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  console.log('Page loaded');

  // Log page title and URL
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());

  // Log all HTML elements
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  
  // Save HTML to file
  const fs = require('fs');
  fs.writeFileSync('page-content.html', html);
  console.log('Saved page content to page-content.html');

  // Take a screenshot
  await page.screenshot({ path: 'page-screenshot.png' });
  console.log('Screenshot saved as page-screenshot.png');

  // Log all input elements
  const inputCount = await page.locator('input').count();
  console.log(`Found ${inputCount} input elements`);

  // Log all buttons
  const buttonCount = await page.locator('button').count();
  console.log(`Found ${buttonCount} buttons`);

  // Log all text content (first 1000 chars)
  const text = await page.textContent('body');
  console.log('Page text (first 1000 chars):', text?.substring(0, 1000));

  await browser.close();
}

debugPage().catch(console.error);
