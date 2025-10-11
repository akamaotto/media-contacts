import { test, expect, type Page } from '@playwright/test';
import path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'ai-search-screenshots');

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string, description: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage: true,
    animations: 'disabled'
  });

  console.log(`📸 Screenshot saved: ${filename} - ${description}`);
  return filepath;
}

// Helper function to login
async function login(page: Page) {
  await page.goto(BASE_URL);

  // Check if already logged in
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard')) {
    console.log('✅ Already logged in');
    return;
  }

  // Fill login form
  await page.fill('input[type="email"]', 'akamaotto@gmail.com');
  await page.fill('input[type="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Successfully logged in');
}

test.describe('AI Search Feature - Simple E2E Testing', () => {
  test('Navigate to AI Search and capture screenshots', async ({ page }) => {
    console.log('🔍 Starting AI Search E2E test');

    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Login
    await login(page);

    // Navigate to media contacts page
    await page.click('text=Media Contacts');
    await page.waitForURL('**/dashboard/media-contacts', { timeout: 10000 });
    await takeScreenshot(page, '01-media-contacts-page', 'Media contacts page loaded');

    // Look for AI Search button with multiple possible text patterns
    const possibleButtons = [
      'button:has-text("Find Contacts with AI")',
      'button:has-text("AI Search")',
      'button:has-text("AI")',
      'button:has-text("Find")'
    ];

    let aiSearchButton = null;
    for (const selector of possibleButtons) {
      try {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 2000 })) {
          aiSearchButton = button;
          console.log(`✅ Found AI Search button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!aiSearchButton) {
      console.log('❌ AI Search button not found, taking screenshot of available buttons');
      await takeScreenshot(page, '02-no-ai-button', 'Page without AI Search button');

      // List all buttons on the page
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons on the page`);

      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent();
        console.log(`Button ${i + 1}: "${text}"`);
      }

      throw new Error('AI Search button not found on the page');
    }

    // Click AI Search button
    await aiSearchButton.click();

    // Wait for modal to appear (various possible selectors)
    const modalSelectors = [
      '[role="dialog"]',
      '.dialog',
      '[data-testid*="modal"]',
      '[aria-modal="true"]'
    ];

    let modal = null;
    for (const selector of modalSelectors) {
      try {
        const modalElement = page.locator(selector);
        if (await modalElement.isVisible({ timeout: 5000 })) {
          modal = modalElement;
          console.log(`✅ Found modal with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!modal) {
      console.log('❌ Modal not found, taking screenshot');
      await takeScreenshot(page, '03-no-modal', 'Page after clicking AI Search button');
      throw new Error('AI Search modal did not appear');
    }

    // Take screenshot of modal
    await takeScreenshot(page, '04-ai-search-modal', 'AI Search modal opened');

    // Look for form elements
    const formElements = [
      'input[type="text"]',
      'textarea',
      'select',
      'button[type="submit"]'
    ];

    const foundElements = [];
    for (const selector of formElements) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        foundElements.push(`${selector}: ${elements.length} found`);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
      }
    }

    console.log('Form elements found:', foundElements);

    // Look for specific form labels
    const labels = ['Search', 'Query', 'Country', 'Category', 'Countries', 'Categories'];
    const foundLabels = [];

    for (const labelText of labels) {
      const labelElements = await page.locator(`:text-is("${labelText}")`).all();
      if (labelElements.length > 0) {
        foundLabels.push(labelText);
        console.log(`Found ${labelElements.length} elements with text: ${labelText}`);
      }
    }

    console.log('Form labels found:', foundLabels);

    // Try to interact with form fields
    const textInputs = await page.locator('input[type="text"], textarea').all();
    if (textInputs.length > 0) {
      await textInputs[0].fill('test search query');
      console.log('✅ Filled first text input with test query');
      await takeScreenshot(page, '05-form-filled', 'Form with test data');
    }

    // Try to find and click submit button
    const submitButtons = await page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Search")').all();
    if (submitButtons.length > 0) {
      await submitButtons[0].click();
      console.log('✅ Clicked submit button');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '06-after-submit', 'State after submission');
    }

    // Try to close modal (escape key or close button)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    const closeButtons = await page.locator('button:has-text("Close"), button[aria-label*="Close"], button:has-text("Cancel")').all();
    if (closeButtons.length > 0) {
      await closeButtons[0].click();
      console.log('✅ Clicked close button');
    }

    await takeScreenshot(page, '07-modal-closed', 'After attempting to close modal');

    console.log('✅ AI Search E2E test completed');
  });
});