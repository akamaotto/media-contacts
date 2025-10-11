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

test.describe('AI Search Feature - Manual Testing', () => {
  test('Manual AI Search testing with screenshots', async ({ page }) => {
    console.log('🔍 Starting manual AI Search testing');

    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Step 1: Go to homepage
    console.log('📍 Step 1: Navigating to homepage');
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot(page, '01-homepage', 'Homepage loaded');

    // Step 2: Try to navigate to dashboard/media-contacts
    console.log('📍 Step 2: Navigating to media contacts');

    // Look for Media Contacts link
    const mediaContactsLink = page.locator('a:has-text("Media Contacts"), button:has-text("Media Contacts")');
    if (await mediaContactsLink.isVisible({ timeout: 3000 })) {
      await mediaContactsLink.click();
      console.log('✅ Clicked Media Contacts link');
    } else {
      console.log('⚠️  Media Contacts link not found, trying direct URL');
      await page.goto(`${BASE_URL}/dashboard/media-contacts`);
    }

    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot(page, '02-media-contacts', 'Media contacts page');

    // Step 3: Look for any AI-related buttons or elements
    console.log('📍 Step 3: Looking for AI-related elements');

    // Check for various possible AI Search button patterns
    const aiPatterns = [
      'button:has-text("AI")',
      'button:has-text("Search")',
      'button:has-text("Find")',
      'button:has-text("Intelligence")',
      '[class*="ai"]',
      '[id*="ai"]',
      '[data-testid*="ai"]'
    ];

    const foundAIElements = [];
    for (const pattern of aiPatterns) {
      try {
        const elements = await page.locator(pattern).all();
        if (elements.length > 0) {
          for (let i = 0; i < elements.length; i++) {
            const text = await elements[i].textContent();
            if (text && text.trim()) {
              foundAIElements.push(`${pattern}: "${text.trim()}"`);
            }
          }
        }
      } catch (error) {
        continue;
      }
    }

    console.log('AI-related elements found:', foundAIElements);

    // If AI elements found, try to click one
    if (foundAIElements.length > 0) {
      const firstAIElement = page.locator(aiPatterns[0]).first();
      await firstAIElement.click();
      console.log('✅ Clicked first AI-related element');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '03-after-ai-click', 'Page after clicking AI element');
    } else {
      console.log('❌ No AI-related elements found');

      // List all buttons and links on the page
      const allButtons = await page.locator('button').all();
      const allLinks = await page.locator('a').all();

      console.log(`Found ${allButtons.length} buttons and ${allLinks.length} links on the page`);

      // Show first 5 buttons and links for debugging
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const text = await allButtons[i].textContent();
        console.log(`Button ${i + 1}: "${text || 'empty'}"`);
      }

      for (let i = 0; i < Math.min(allLinks.length, 5); i++) {
        const text = await allLinks[i].textContent();
        console.log(`Link ${i + 1}: "${text || 'empty'}"`);
      }
    }

    // Step 4: Look for modals or overlays
    console.log('📍 Step 4: Looking for modals or overlays');

    const modalSelectors = [
      '[role="dialog"]',
      '.dialog',
      '.modal',
      '[aria-modal="true"]',
      '[class*="modal"]',
      '[class*="overlay"]',
      '[class*="popup"]'
    ];

    const foundModals = [];
    for (const selector of modalSelectors) {
      try {
        const modals = await page.locator(selector).all();
        if (modals.length > 0) {
          foundModals.push(`${selector}: ${modals.length} found`);
        }
      } catch (error) {
        continue;
      }
    }

    console.log('Modals found:', foundModals);

    if (foundModals.length > 0) {
      await takeScreenshot(page, '04-modals-found', 'Page with modals visible');
    }

    // Step 5: Look for form elements
    console.log('📍 Step 5: Looking for form elements');

    const formElements = [
      'input[type="text"]',
      'input[type="search"]',
      'textarea',
      'select',
      'button[type="submit"]',
      'form'
    ];

    const foundFormElements = [];
    for (const selector of formElements) {
      try {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          foundFormElements.push(`${selector}: ${elements.length} found`);
        }
      } catch (error) {
        continue;
      }
    }

    console.log('Form elements found:', foundFormElements);

    if (foundFormElements.length > 0) {
      await takeScreenshot(page, '05-form-elements', 'Page with form elements');
    }

    // Step 6: Try to interact with text inputs
    console.log('📍 Step 6: Trying to interact with text inputs');

    const textInputs = await page.locator('input[type="text"], input[type="search"], textarea').all();
    if (textInputs.length > 0) {
      console.log(`Found ${textInputs.length} text inputs, trying to fill first one`);

      try {
        await textInputs[0].fill('test search query for AI search functionality');
        console.log('✅ Filled first text input');
        await takeScreenshot(page, '06-input-filled', 'Form with test input');

        // Try to find and click submit button
        const submitButtons = await page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Search"), button:has-text("Find")').all();
        if (submitButtons.length > 0) {
          console.log(`Found ${submitButtons.length} submit buttons, clicking first one`);
          await submitButtons[0].click();
          console.log('✅ Clicked submit button');
          await page.waitForTimeout(3000);
          await takeScreenshot(page, '07-after-submit', 'Page after form submission');
        } else {
          console.log('⚠️  No submit buttons found');
        }
      } catch (error) {
        console.log('❌ Error interacting with form:', error.message);
      }
    } else {
      console.log('⚠️  No text inputs found');
    }

    // Step 7: Exercise the country multi-select if present
    console.log('📍 Step 7: Attempting to open country selector');
    const countrySelectorTrigger = page.locator('[data-testid="country-selector-trigger"]').first();

    if (await countrySelectorTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await countrySelectorTrigger.click();
      console.log('✅ Country selector popover opened');
      await takeScreenshot(page, '08-country-selector-open', 'Country selector popover');

      const firstCountryOption = page.locator('[role="option"]').first();
      if (await firstCountryOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        const optionText = await firstCountryOption.textContent();
        await firstCountryOption.click();
        console.log(`✅ Selected country option: ${optionText?.trim() || 'unknown'}`);
        await takeScreenshot(page, '09-country-selected', 'Country selected from popover');
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️  Country selector trigger not found on page');
    }

    // Step 8: Final overview screenshot
    console.log('📍 Step 8: Taking final overview');
    await takeScreenshot(page, '10-final-overview', 'Final page state');

    // Step 9: Responsive testing
    console.log('📍 Step 9: Testing responsive design');

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await takeScreenshot(page, '11-tablet-view', 'Tablet view');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await takeScreenshot(page, '12-mobile-view', 'Mobile view');

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await takeScreenshot(page, '13-desktop-view', 'Desktop view');

    console.log('✅ Manual AI Search testing completed');
  });
});
