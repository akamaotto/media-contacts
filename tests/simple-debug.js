const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Get page title and URL
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  
  // Save page content
  const content = await page.content();
  fs.writeFileSync('page-debug.html', content);
  console.log('Page content saved to page-debug.html');
  
  // Take a screenshot
  await page.screenshot({ path: 'page-debug.png' });
  console.log('Screenshot saved to page-debug.png');
  
  // Log form elements
  const inputs = await page.$$('input');
  console.log(`Found ${inputs.length} input elements`);
  
  for (let i = 0; i < inputs.length; i++) {
    const placeholder = await inputs[i].getAttribute('placeholder');
    const id = await inputs[i].getAttribute('id');
    console.log(`Input ${i}: id="${id}", placeholder="${placeholder}"`);
  }
  
  // Log all text content (first 1000 chars)
  const text = await page.$eval('body', el => el.textContent);
  console.log('Page text (first 1000 chars):', text.substring(0, 1000));
  
  await browser.close();
})();
