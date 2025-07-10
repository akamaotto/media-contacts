import { test, expect, type Page } from '@playwright/test';
import { loginViaApi } from './utils';

const login = async (page: Page, baseURL: string) => {
  await loginViaApi(page.request, page.context(), baseURL, 'demo@example.com', 'password');
  await page.goto(baseURL + '/');
};

test('search for hannah', async ({ page, context, baseURL }) => {
  await login(page, baseURL!);
  
  // Enable console logging
  context.on('page', async (page) => {
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.text()}`));
  });

  // Navigate to the root URL with a longer timeout
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  console.log('Page loaded');
  
  // Log the page title for debugging
  const title = await page.title();
  console.log('Page title:', title);
  
  // Log all input elements for debugging
  const inputs = await page.locator('input').all();
  console.log(`Found ${inputs.length} input elements on page`);
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    const id = await input.getAttribute('id');
    console.log(`Input - id: ${id}, placeholder: ${placeholder}`);
  }

  // Wait for any search input to be visible
  const searchInput = page.locator('input[placeholder*="Search" i]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 20000 });
  console.log('Search input found');

  // Type search term slowly to ensure it's registered
  await searchInput.fill('hannah');
  console.log('Filled search term');

  // Wait for any debounce or search to complete
  await page.waitForTimeout(2000);
  
  // Check for loading state
  const isLoading = await page.locator('text=Loading...').count() > 0;
  if (isLoading) {
    console.log('Waiting for loading to complete...');
    await page.waitForSelector('text=Loading...', { state: 'hidden' });
  }

  // Check for results or no results message
  const noResults = await page.locator('text=No results').count();
  if (noResults > 0) {
    console.log('No results message found');
  }

  // Look for any table or list of results
  const tables = await page.locator('table').all();
  console.log(`Found ${tables.length} tables on page`);
  
  // Log table contents for debugging
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const rows = await table.locator('tr').all();
    console.log(`Table ${i} has ${rows.length} rows`);
    
    for (let j = 0; j < Math.min(3, rows.length); j++) {
      console.log(`Table ${i} Row ${j}:`, await rows[j].innerText());
    }
  }

  // Check for Hannah in any text content on the page
  const pageText = await page.textContent('body');
  const hannahInPage = pageText?.toLowerCase().includes('hannah');
  console.log('Is "Hannah" found on page?', hannahInPage);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'search-results.png' });
  console.log('Screenshot saved as search-results.png');

  // Verify Hannah is found on the page
  expect(hannahInPage).toBeTruthy();
});
