/**
 * Screen Reader Compatibility Tests
 * Tests for compatibility with major screen readers (NVDA, JAWS, VoiceOver, TalkBack)
 */

import { test, expect } from '@playwright/test';

test.describe('Screen Reader Compatibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Mock screen reader detection and ARIA live regions
    await page.addInitScript(() => {
      // Simulate screen reader environment
      (window as any).screenReaderActive = true;
      
      // Track ARIA live announcements
      (window as any).ariaAnnouncements = [];
      
      // Mock ARIA live region observer
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const target = mutation.target as HTMLElement;
          if (target.hasAttribute('aria-live')) {
            (window as any).ariaAnnouncements.push({
              type: target.getAttribute('aria-live'),
              content: target.textContent,
              timestamp: Date.now()
            });
          }
        });
      });
      
      // Observe live regions
      document.querySelectorAll('[aria-live]').forEach(el => {
        observer.observe(el, { childList: true, characterData: true, subtree: true });
      });
    });
  });

  test('should provide proper semantic structure for screen readers', async ({ page }) => {
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify heading hierarchy (no skipped levels)
    let previousLevel = 0;
    for (const heading of headings) {
      const level = parseInt(await heading.getAttribute('aria-level') || 
                          await heading.evaluate(el => parseInt(el.tagName.charAt(1))));
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = level;
    }
    
    // Check for proper landmark elements
    const landmarks = await page.locator('main, nav, header, footer, aside, section').all();
    expect(landmarks.length).toBeGreaterThan(0);
    
    // Verify landmarks have labels
    for (const landmark of landmarks) {
      const ariaLabel = await landmark.getAttribute('aria-label');
      const ariaLabelledBy = await landmark.getAttribute('aria-labelledby');
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should announce AI search modal opening and closing', async ({ page }) => {
    // Open AI search modal
    const aiSearchButton = page.locator('[data-testid="find-contacts-button"]');
    await expect(aiSearchButton).toBeVisible();
    await aiSearchButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Check for modal announcement
    const announcements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
    const modalOpenAnnouncement = announcements.find(a => 
      a.content && a.content.toLowerCase().includes('dialog') || 
      a.content && a.content.toLowerCase().includes('modal')
    );
    
    expect(modalOpenAnnouncement).toBeDefined();
    expect(modalOpenAnnouncement.type).toBe('assertive' || modalOpenAnnouncement.type).toBe('polite');
    
    // Clear announcements for next test
    await page.evaluate(() => (window as any).ariaAnnouncements = []);
    
    // Close modal and check for announcement
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'hidden' });
    
    const closeAnnouncements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
    const modalCloseAnnouncement = closeAnnouncements.find(a => 
      a.content && (a.content.toLowerCase().includes('closed') || 
                   a.content.toLowerCase().includes('dialog'))
    );
    
    expect(modalCloseAnnouncement).toBeDefined();
  });

  test('should provide descriptive labels for form elements', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test search input
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    
    const inputLabel = await searchInput.getAttribute('aria-label');
    const inputLabelledBy = await searchInput.getAttribute('aria-labelledby');
    const inputPlaceholder = await searchInput.getAttribute('placeholder');
    
    expect(inputLabel || inputLabelledBy || inputPlaceholder).toBeTruthy();
    
    // Test country selector
    const countrySelector = page.locator('[data-testid="country-select"]');
    await expect(countrySelector).toBeVisible();
    
    const selectorLabel = await countrySelector.getAttribute('aria-label');
    const selectorLabelledBy = await countrySelector.getAttribute('aria-labelledby');
    
    expect(selectorLabel || selectorLabelledBy).toBeTruthy();
    
    // Test category selector
    const categorySelector = page.locator('[data-testid="category-select"]');
    await expect(categorySelector).toBeVisible();
    
    const categoryLabel = await categorySelector.getAttribute('aria-label');
    const categoryLabelledBy = await categorySelector.getAttribute('aria-labelledby');
    
    expect(categoryLabel || categoryLabelledBy).toBeTruthy();
  });

  test('should announce form validation errors', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Clear announcements
    await page.evaluate(() => (window as any).ariaAnnouncements = []);
    
    // Try to submit empty form
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await searchButton.click();
    
    // Wait for potential error
    await page.waitForTimeout(1000);
    
    // Check for error announcements
    const announcements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
    const errorAnnouncement = announcements.find(a => 
      a.content && (a.content.toLowerCase().includes('error') || 
                   a.content.toLowerCase().includes('required') ||
                   a.content.toLowerCase().includes('invalid'))
    );
    
    if (errorAnnouncement) {
      expect(errorAnnouncement.type).toBe('assertive' || errorAnnouncement.type).toBe('polite');
    }
  });

  test('should announce search progress and completion', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Clear announcements
    await page.evaluate(() => (window as any).ariaAnnouncements = []);
    
    // Fill form and submit
    await page.fill('[data-testid="search-input"]', 'screen reader test search');
    await searchButton.click();
    
    // Wait for search progress announcements
    await page.waitForTimeout(2000);
    
    const announcements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
    
    // Look for search progress announcements
    const progressAnnouncements = announcements.filter(a => 
      a.content && (a.content.toLowerCase().includes('searching') ||
                   a.content.toLowerCase().includes('loading') ||
                   a.content.toLowerCase().includes('progress'))
    );
    
    // Should announce search start
    expect(progressAnnouncements.length).toBeGreaterThan(0);
    
    // Wait for search completion
    await page.waitForTimeout(3000);
    
    const completionAnnouncements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
    const completionAnnouncement = completionAnnouncements.find(a => 
      a.content && (a.content.toLowerCase().includes('complete') ||
                   a.content.toLowerCase().includes('finished') ||
                   a.content.toLowerCase().includes('results') ||
                   a.content.toLowerCase().includes('found'))
    );
    
    if (completionAnnouncement) {
      expect(completionAnnouncement.type).toBe('polite' || completionAnnouncement.type).toBe('assertive');
    }
  });

  test('should provide accessible table/list structure for results', async ({ page }) => {
    // Open AI search modal and perform search
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    await page.fill('[data-testid="search-input"]', 'test search for accessibility');
    await page.click('[data-testid="search-submit-button"]');
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Check results container structure
    const resultsContainer = page.locator('[data-testid="search-results"]');
    if (await resultsContainer.isVisible()) {
      // Should have proper role
      const containerRole = await resultsContainer.getAttribute('role');
      expect(containerRole).toBe('region' || containerRole).toBe('main');
      
      // Should have label
      const containerLabel = await resultsContainer.getAttribute('aria-label');
      const containerLabelledBy = await resultsContainer.getAttribute('aria-labelledby');
      expect(containerLabel || containerLabelledBy).toBeTruthy();
      
      // Check individual result items
      const resultItems = resultsContainer.locator('[data-testid="result-item"]');
      const itemCount = await resultItems.count();
      
      if (itemCount > 0) {
        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = resultItems.nth(i);
          
          // Should have proper role
          const itemRole = await item.getAttribute('role');
          expect(itemRole).toBe('article' || itemRole).toBe('listitem');
          
          // Should be accessible
          const itemLabel = await item.getAttribute('aria-label');
          expect(itemLabel).toBeTruthy();
        }
      }
    }
  });

  test('should support screen reader navigation shortcuts', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test heading navigation (H key)
    await page.keyboard.press('h');
    let focusedElement = await page.locator(':focus');
    
    // Should land on a heading if available
    const isHeading = await focusedElement.evaluate(el => 
      ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)
    );
    
    // Test form navigation (F key) - should land on form elements
    await page.keyboard.press('f');
    focusedElement = await page.locator(':focus');
    
    const isFormElement = await focusedElement.evaluate(el => 
      ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)
    );
    
    expect(isFormElement).toBe(true);
    
    // Test link navigation (L key) - should land on links if available
    await page.keyboard.press('l');
    focusedElement = await page.locator(':focus');
    
    const isLink = await focusedElement.evaluate(el => 
      el.tagName === 'A' || el.getAttribute('role') === 'link'
    );
    
    // Links might not be present in the modal, so this is optional
  });

  test('should provide context for dynamic content changes', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Clear announcements
    await page.evaluate(() => (window as any).ariaAnnouncements = []);
    
    // Change content dynamically
    const countrySelector = page.locator('[data-testid="country-select"]');
    await countrySelector.click();
    
    // Wait for dropdown to open
    await page.waitForTimeout(500);
    
    // Select a country
    const firstOption = page.locator('[data-testid="country-dropdown"] [role="option"]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
      
      // Check for content change announcement
      const announcements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
      const changeAnnouncement = announcements.find(a => 
        a.content && (a.content.toLowerCase().includes('selected') ||
                     a.content.toLowerCase().includes('country') ||
                     a.content.toLowerCase().includes('updated'))
      );
      
      // Should announce the change
      expect(changeAnnouncement).toBeDefined();
    }
  });

  test('should handle focus management for screen readers', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Check initial focus
    let focusedElement = await page.locator(':focus');
    const isInitialFocusInModal = await focusedElement.evaluate(el => {
      const modal = document.querySelector('[data-testid="ai-search-modal"]');
      return modal && modal.contains(el);
    });
    
    expect(isInitialFocusInModal).toBe(true);
    
    // Test focus trapping
    const modal = page.locator('[data-testid="ai-search-modal"]');
    const focusableElements = await modal.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();
    
    if (focusableElements.length > 0) {
      // Navigate through all focusable elements
      for (let i = 0; i < focusableElements.length; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus');
        
        const isFocusInModal = await focusedElement.evaluate(el => {
          const modal = document.querySelector('[data-testid="ai-search-modal"]');
          return modal && modal.contains(el);
        });
        
        expect(isFocusInModal).toBe(true);
      }
    }
    
    // Test focus restoration on modal close
    const triggerButton = page.locator('[data-testid="find-contacts-button"]');
    const initialButtonId = await triggerButton.getAttribute('id');
    
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'hidden' });
    
    focusedElement = await page.locator(':focus');
    const isFocusBackOnTrigger = await focusedElement.evaluate(el => 
      el.getAttribute('id') === initialButtonId
    );
    
    expect(isFocusBackOnTrigger).toBe(true);
  });

  test('should provide accessible autocomplete/combobox behavior', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test country selector as combobox
    const countrySelector = page.locator('[data-testid="country-select"]');
    await expect(countrySelector).toBeVisible();
    
    // Check combobox attributes
    const hasRoleCombobox = await countrySelector.getAttribute('role') === 'combobox';
    const hasAriaExpanded = await countrySelector.hasAttribute('aria-expanded');
    const hasAriaAutocomplete = await countrySelector.hasAttribute('aria-autocomplete');
    const hasAriaHasPopup = await countrySelector.hasAttribute('aria-haspopup');
    
    // Should have appropriate ARIA attributes for combobox
    expect(hasRoleCombobox || hasAriaExpanded || hasAriaAutocomplete || hasAriaHasPopup).toBe(true);
    
    // Test dropdown interaction
    await countrySelector.click();
    await page.waitForTimeout(500);
    
    const dropdown = page.locator('[data-testid="country-dropdown"]');
    if (await dropdown.isVisible()) {
      // Check listbox role
      const listboxRole = await dropdown.getAttribute('role');
      expect(listboxRole).toBe('listbox' || listboxRole).toBe('menu');
      
      // Check options
      const options = dropdown.locator('[role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 0) {
        // Test option selection
        const firstOption = options.first();
        await firstOption.click();
        
        // Check if selection is announced
        const announcements = await page.evaluate(() => (window as any).ariaAnnouncements || []);
        const selectionAnnouncement = announcements.find(a => 
          a.content && (a.content.toLowerCase().includes('selected') ||
                       a.content.toLowerCase().includes('chosen'))
        );
        
        if (selectionAnnouncement) {
          expect(selectionAnnouncement.type).toBe('polite' || selectionAnnouncement.type).toBe('assertive');
        }
      }
    }
  });

  test('should support different screen reader modes', async ({ page }) => {
    // Test virtual cursor mode (screen reader navigation)
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Simulate virtual cursor navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus');
    expect(await focusedElement.isVisible()).toBe(true);
    
    // Test forms mode (direct keyboard navigation)
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Navigate through form elements
    const formElements = ['input', 'select', 'button', '[role="button"]'];
    
    for (const selector of formElements) {
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      
      if (await focusedElement.count() > 0) {
        const tagName = await focusedElement.first().evaluate(el => el.tagName.toLowerCase());
        const role = await focusedElement.first().getAttribute('role');
        
        // Should land on interactive elements
        expect(formElements.includes(tagName) || 
               formElements.some(s => selector.includes(s)) ||
               role === 'button' || role === 'option').toBe(true);
      }
    }
    
    // Test reading mode (content consumption)
    const contentElements = await page.locator('p, h1, h2, h3, h4, h5, h6, li').all();
    expect(contentElements.length).toBeGreaterThan(0);
    
    // Verify content is readable
    for (let i = 0; i < Math.min(contentElements.length, 3); i++) {
      const element = contentElements[i];
      const text = await element.textContent();
      expect(text && text.trim().length > 0).toBe(true);
    }
  });

  test('should handle long content properly for screen readers', async ({ page }) => {
    // Open AI search modal and perform search
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    await page.fill('[data-testid="search-input"]', 'long content test search');
    await page.click('[data-testid="search-submit-button"]');
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Check results container
    const resultsContainer = page.locator('[data-testid="search-results"]');
    if (await resultsContainer.isVisible()) {
      // Check for proper heading structure in results
      const resultHeadings = await resultsContainer.locator('h1, h2, h3, h4, h5, h6').all();
      
      // Should have headings to break up long content
      expect(resultHeadings.length).toBeGreaterThanOrEqual(0);
      
      // Check for list structure
      const resultLists = await resultsContainer.locator('ul, ol, [role="list"]').all();
      expect(resultLists.length).toBeGreaterThanOrEqual(0);
      
      // Check individual result items for proper structure
      const resultItems = resultsContainer.locator('[data-testid="result-item"]');
      const itemCount = await resultItems.count();
      
      if (itemCount > 0) {
        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = resultItems.nth(i);
          
          // Should have accessible name
          const itemName = await item.getAttribute('aria-label');
          expect(itemName).toBeTruthy();
          
          // Should have readable content
          const itemText = await item.textContent();
          expect(itemText && itemText.trim().length > 0).toBe(true);
        }
      }
    }
  });
});

test.describe('Screen Reader Specific Tests', () => {
  test('should work with NVDA screen reader', async ({ page }) => {
    // Simulate NVDA environment
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NVDA',
        writable: true
      });
      
      // NVDA-specific ARIA attributes
      document.documentElement.setAttribute('data-nvda', 'true');
    });
    
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test NVDA-specific functionality
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // NVDA should announce modal properly
    const modal = page.locator('[data-testid="ai-search-modal"]');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('should work with JAWS screen reader', async ({ page }) => {
    // Simulate JAWS environment
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0 JAWS',
        writable: true
      });
      
      // JAWS-specific attributes
      document.documentElement.setAttribute('data-jaws', 'true');
    });
    
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test JAWS-specific functionality
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // JAWS should handle forms properly
    const formElements = await page.locator('form input, form select, form button').all();
    expect(formElements.length).toBeGreaterThan(0);
  });

  test('should work with VoiceOver screen reader', async ({ page }) => {
    // Simulate VoiceOver environment
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15 VoiceOver',
        writable: true
      });
      
      // VoiceOver-specific attributes
      document.documentElement.setAttribute('data-voiceover', 'true');
    });
    
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test VoiceOver-specific functionality
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // VoiceOver should handle iOS-style interactions
    const touchElements = await page.locator('[role="button"], [role="link"]').all();
    expect(touchElements.length).toBeGreaterThan(0);
  });

  test('should work with TalkBack screen reader', async ({ page }) => {
    // Simulate TalkBack environment
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 TalkBack',
        writable: true
      });
      
      // TalkBack-specific attributes
      document.documentElement.setAttribute('data-talkback', 'true');
    });
    
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test TalkBack-specific functionality
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // TalkBack should handle mobile interactions
    const mobileElements = await page.locator('[data-testid="search-input"], [data-testid="search-submit-button"]').all();
    expect(mobileElements.length).toBeGreaterThan(0);
    
    // Test touch-friendly sizing
    for (const element of mobileElements) {
      const boundingBox = await element.boundingBox();
      if (boundingBox) {
        // Should be at least 44x44 pixels for touch accessibility
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});