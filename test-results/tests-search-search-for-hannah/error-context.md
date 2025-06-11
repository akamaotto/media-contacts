# Test info

- Name: search for hannah
- Location: /Users/akamaotto/code/media-contacts/tests/search.spec.ts:3:5

# Error details

```
TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="Search" i]').first() to be visible

    at /Users/akamaotto/code/media-contacts/tests/search.spec.ts:28:21
```

# Page snapshot

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/1
  - button "next" [disabled]:
    - img "next"
- img
- img
- text: Next.js 15.3.3 Turbopack
- img
- dialog "Build Error":
  - text: Build Error
  - button "Copy Stack Trace":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
    - img
  - paragraph: Parsing ecmascript source code failed
  - img
  - text: ./src/components/media-contacts/media-contacts-client-view.tsx (801:1)
  - button "Open in editor":
    - img
  - text: "Parsing ecmascript source code failed 799 | ); 800 | } > 801 | | ^ Unexpected eof"
- contentinfo:
  - paragraph: This error occurred during the build process and can only be dismissed by fixing the error.
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test('search for hannah', async ({ page, context }) => {
   4 |   // Enable console logging
   5 |   context.on('page', async (page) => {
   6 |     page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.text()}`));
   7 |   });
   8 |
   9 |   // Navigate to the root URL with a longer timeout
  10 |   await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  11 |   console.log('Page loaded');
  12 |   
  13 |   // Log the page title for debugging
  14 |   const title = await page.title();
  15 |   console.log('Page title:', title);
  16 |   
  17 |   // Log all input elements for debugging
  18 |   const inputs = await page.locator('input').all();
  19 |   console.log(`Found ${inputs.length} input elements on page`);
  20 |   for (const input of inputs) {
  21 |     const placeholder = await input.getAttribute('placeholder');
  22 |     const id = await input.getAttribute('id');
  23 |     console.log(`Input - id: ${id}, placeholder: ${placeholder}`);
  24 |   }
  25 |
  26 |   // Wait for any search input to be visible
  27 |   const searchInput = page.locator('input[placeholder*="Search" i]').first();
> 28 |   await searchInput.waitFor({ state: 'visible', timeout: 10000 });
     |                     ^ TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
  29 |   console.log('Search input found');
  30 |
  31 |   // Type search term slowly to ensure it's registered
  32 |   await searchInput.fill('hannah');
  33 |   console.log('Filled search term');
  34 |
  35 |   // Wait for any debounce or search to complete
  36 |   await page.waitForTimeout(2000);
  37 |   
  38 |   // Check for loading state
  39 |   const isLoading = await page.locator('text=Loading...').count() > 0;
  40 |   if (isLoading) {
  41 |     console.log('Waiting for loading to complete...');
  42 |     await page.waitForSelector('text=Loading...', { state: 'hidden' });
  43 |   }
  44 |
  45 |   // Check for results or no results message
  46 |   const noResults = await page.locator('text=No results').count();
  47 |   if (noResults > 0) {
  48 |     console.log('No results message found');
  49 |   }
  50 |
  51 |   // Look for any table or list of results
  52 |   const tables = await page.locator('table').all();
  53 |   console.log(`Found ${tables.length} tables on page`);
  54 |   
  55 |   // Log table contents for debugging
  56 |   for (let i = 0; i < tables.length; i++) {
  57 |     const table = tables[i];
  58 |     const rows = await table.locator('tr').all();
  59 |     console.log(`Table ${i} has ${rows.length} rows`);
  60 |     
  61 |     for (let j = 0; j < Math.min(3, rows.length); j++) {
  62 |       console.log(`Table ${i} Row ${j}:`, await rows[j].innerText());
  63 |     }
  64 |   }
  65 |
  66 |   // Check for Hannah in any text content on the page
  67 |   const pageText = await page.textContent('body');
  68 |   const hannahInPage = pageText?.toLowerCase().includes('hannah');
  69 |   console.log('Is "Hannah" found on page?', hannahInPage);
  70 |   
  71 |   // Take a screenshot for debugging
  72 |   await page.screenshot({ path: 'search-results.png' });
  73 |   console.log('Screenshot saved as search-results.png');
  74 |
  75 |   // Verify Hannah is found on the page
  76 |   expect(hannahInPage).toBeTruthy();
  77 | });
  78 |
```