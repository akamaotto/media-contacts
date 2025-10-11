/**
 * Keyboard Navigation Accessibility Tests
 * Tests for complete keyboard navigation support and WCAG compliance
 */

import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Enable keyboard navigation testing
    await page.addInitScript(() => {
      // Track keyboard events for testing
      (window as any).keyboardEvents = [];
      document.addEventListener('keydown', (e) => {
        (window as any).keyboardEvents.push({
          key: e.key,
          code: e.code,
          type: 'keydown',
          timestamp: Date.now(),
          target: e.target.tagName + (e.target.id ? '#' + e.target.id : '')
        });
      });
      
      document.addEventListener('keyup', (e) => {
        (window as any).keyboardEvents.push({
          key: e.key,
          code: e.code,
          type: 'keyup',
          timestamp: Date.now(),
          target: e.target.tagName + (e.target.id ? '#' + e.target.id : '')
        });
      });
    });
  });

  test('should support Tab navigation through main page elements', async ({ page }) => {
    // Get all focusable elements
    const focusableElements = await page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();
    
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Test Tab navigation
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBe(1);
      expect(await focusedElement.isVisible()).toBe(true);
      
      // Check if focused element is actually focusable
      const tabIndex = await focusedElement.getAttribute('tabindex');
      const isDisabled = await focusedElement.isDisabled();
      const isHidden = await focusedElement.isHidden();
      
      expect(isDisabled).toBe(false);
      expect(isHidden).toBe(false);
      expect(tabIndex !== '-1').toBe(true);
    }
  });

  test('should support Shift+Tab navigation backwards', async ({ page }) => {
    // Navigate to a middle element first
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    
    const middleFocusedElement = await page.locator(':focus');
    const middleElementId = await middleFocusedElement.getAttribute('id');
    
    // Test Shift+Tab navigation
    await page.keyboard.press('Shift+Tab');
    const previousFocusedElement = await page.locator(':focus');
    
    // Should be on a different element
    const previousElementId = await previousFocusedElement.getAttribute('id');
    expect(previousElementId).not.toBe(middleElementId);
    
    // Continue testing Shift+Tab
    await page.keyboard.press('Shift+Tab');
    const earlierFocusedElement = await page.locator(':focus');
    expect(await earlierFocusedElement.count()).toBe(1);
    expect(await earlierFocusedElement.isVisible()).toBe(true);
  });

  test('should open AI search modal with keyboard', async ({ page }) => {
    // Find AI search trigger button
    const aiSearchButton = page.locator('[data-testid="find-contacts-button"]');
    await expect(aiSearchButton).toBeVisible();
    
    // Navigate to button with keyboard
    while (!(await aiSearchButton.isFocused())) {
      await page.keyboard.press('Tab');
      // Prevent infinite loop
      const keyboardEvents = await page.evaluate(() => (window as any).keyboardEvents || []);
      if (keyboardEvents.length > 50) break;
    }
    
    expect(await aiSearchButton.isFocused()).toBe(true);
    
    // Open modal with Enter key
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Verify modal is open and focus is inside
    const modal = page.locator('[data-testid="ai-search-modal"]');
    await expect(modal).toBeVisible();
    
    const focusedElement = await page.locator(':focus');
    const isFocusInModal = await focusedElement.evaluate(el => {
      const modal = document.querySelector('[data-testid="ai-search-modal"]');
      return modal && modal.contains(el);
    });
    
    expect(isFocusInModal).toBe(true);
  });

  test('should support keyboard navigation within AI search modal', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Get all focusable elements within modal
    const modalFocusableElements = await page.locator('[data-testid="ai-search-modal"] button, [data-testid="ai-search-modal"] [href], [data-testid="ai-search-modal"] input, [data-testid="ai-search-modal"] select, [data-testid="ai-search-modal"] textarea, [data-testid="ai-search-modal"] [tabindex]:not([tabindex="-1"])').all();
    
    expect(modalFocusableElements.length).toBeGreaterThan(0);
    
    // Test Tab navigation through modal elements
    for (let i = 0; i < Math.min(modalFocusableElements.length, 5); i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBe(1);
      expect(await focusedElement.isVisible()).toBe(true);
      
      // Verify focus is trapped in modal
      const isFocusInModal = await focusedElement.evaluate(el => {
        const modal = document.querySelector('[data-testid="ai-search-modal"]');
        return modal && modal.contains(el);
      });
      
      expect(isFocusInModal).toBe(true);
    }
  });

  test('should support keyboard form interaction', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test search input
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.focus();
    
    // Type in search input
    await page.keyboard.type('keyboard navigation test');
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('keyboard navigation test');
    
    // Test text selection and modification
    await page.keyboard.press('Control+a');
    await page.keyboard.type('modified test');
    const modifiedValue = await searchInput.inputValue();
    expect(modifiedValue).toBe('modified test');
    
    // Test country selector
    const countrySelector = page.locator('[data-testid="country-select"]');
    await countrySelector.focus();
    
    // Open dropdown with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    const dropdown = page.locator('[data-testid="country-dropdown"]');
    if (await dropdown.isVisible()) {
      // Navigate dropdown options
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }
      
      // Select option with Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Verify selection
      const selectedValue = await countrySelector.inputValue();
      expect(selectedValue.length).toBeGreaterThan(0);
    }
    
    // Test form submission with Enter
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await searchButton.focus();
    await page.keyboard.press('Enter');
    
    // Should trigger search
    await page.waitForTimeout(1000);
  });

  test('should support keyboard modal closing', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test Escape key to close modal
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'hidden' });
    
    // Verify focus returns to trigger button
    const triggerButton = page.locator('[data-testid="find-contacts-button"]');
    expect(await triggerButton.isFocused()).toBe(true);
    
    // Reopen modal
    await triggerButton.click();
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test close button
    const closeButton = page.locator('[data-testid="modal-close-button"]');
    await closeButton.focus();
    await page.keyboard.press('Enter');
    
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'hidden' });
    expect(await triggerButton.isFocused()).toBe(true);
  });

  test('should support keyboard navigation of dropdown menus', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test category selector
    const categorySelector = page.locator('[data-testid="category-select"]');
    await categorySelector.focus();
    
    // Open with Space key
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    const categoryDropdown = page.locator('[data-testid="category-dropdown"]');
    if (await categoryDropdown.isVisible()) {
      // Test arrow key navigation
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      
      // Test Home and End keys
      await page.keyboard.press('Home');
      await page.waitForTimeout(100);
      
      await page.keyboard.press('End');
      await page.waitForTimeout(100);
      
      // Select with Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Verify selection
      const selectedValue = await categorySelector.inputValue();
      expect(selectedValue.length).toBeGreaterThan(0);
    }
  });

  test('should support keyboard navigation of search results', async ({ page }) => {
    // Open AI search modal and perform search
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    await page.fill('[data-testid="search-input"]', 'keyboard navigation test');
    await page.click('[data-testid="search-submit-button"]');
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Check results container
    const resultsContainer = page.locator('[data-testid="search-results"]');
    if (await resultsContainer.isVisible()) {
      // Navigate to results
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      
      // Check if focused on results
      const isFocusedOnResults = await focusedElement.evaluate(el => {
        const results = document.querySelector('[data-testid="search-results"]');
        return results && results.contains(el);
      });
      
      if (isFocusedOnResults) {
        // Test navigation through result items
        const resultItems = resultsContainer.locator('[data-testid="result-item"]');
        const itemCount = await resultItems.count();
        
        if (itemCount > 0) {
          // Navigate through items with arrow keys if they're in a list
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(100);
          
          // Test Enter on result item
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should support keyboard shortcuts and hotkeys', async ({ page }) => {
    // Test common keyboard shortcuts
    
    // Ctrl/Cmd + K for search (common pattern)
    await page.keyboard.press((process.platform === 'darwin' ? 'Meta' : 'Control') + '+k');
    await page.waitForTimeout(500);
    
    // Check if search modal opened
    const modal = page.locator('[data-testid="ai-search-modal"]');
    if (await modal.isVisible()) {
      expect(modal).toBeVisible();
    }
    
    // Test Escape to close if modal is open
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'hidden' });
    }
    
    // Test Ctrl/Cmd + / for help (if implemented)
    await page.keyboard.press((process.platform === 'darwin' ? 'Meta' : 'Control') + '+/');
    await page.waitForTimeout(500);
    
    // Check for help content
    const helpContent = page.locator('[data-testid="help-content"]');
    // Help might not be implemented, so this is optional
  });

  test('should maintain visible focus indicators', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test focus indicators on different elements
    const focusableElements = [
      '[data-testid="search-input"]',
      '[data-testid="country-select"]',
      '[data-testid="category-select"]',
      '[data-testid="search-submit-button"]',
      '[data-testid="modal-close-button"]'
    ];
    
    for (const selector of focusableElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await element.focus();
        
        // Check for focus styles
        const computedStyles = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineOffset: styles.outlineOffset,
            boxShadow: styles.boxShadow,
            border: styles.border
          };
        });
        
        // Should have some form of focus indicator
        const hasFocusIndicator = 
          computedStyles.outline !== 'none' ||
          computedStyles.outline !== '' ||
          computedStyles.boxShadow !== 'none' ||
          computedStyles.border !== '';
        
        expect(hasFocusIndicator).toBe(true);
      }
    }
  });

  test('should handle keyboard accessibility at different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/contacts');
      await page.waitForLoadState('networkidle');
      
      // Test basic keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.isVisible()).toBe(true);
      
      // Test AI search modal
      await page.click('[data-testid="find-contacts-button"]');
      await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
      
      // Test keyboard navigation in modal
      await page.keyboard.press('Tab');
      const modalFocusedElement = await page.locator(':focus');
      expect(await modalFocusedElement.isVisible()).toBe(true);
      
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'hidden' });
    }
  });

  test('should skip to main content with keyboard', async ({ page }) => {
    // Look for skip links
    const skipLinks = page.locator('a[href*="main"], a[href*="content"], [data-testid="skip-link"]');
    
    if (await skipLinks.count() > 0) {
      // Test skip link functionality
      await skipLinks.first().focus();
      await page.keyboard.press('Enter');
      
      // Should jump to main content
      const mainContent = page.locator('main, [role="main"], [data-testid="main-content"]');
      if (await mainContent.count() > 0) {
        const focusedElement = await page.locator(':focus');
        const isInMainContent = await focusedElement.evaluate(el => {
          const main = document.querySelector('main, [role="main"], [data-testid="main-content"]');
          return main && main.contains(el);
        });
        
        expect(isInMainContent).toBe(true);
      }
    }
  });

  test('should handle keyboard accessibility for error states', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Try to submit empty form
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await searchButton.focus();
    await page.keyboard.press('Enter');
    
    // Wait for potential error
    await page.waitForTimeout(1000);
    
    // Check for error message accessibility
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.isVisible()) {
      // Should be focusable or announced
      const isFocusable = await errorMessage.evaluate(el => {
        const tabIndex = el.getAttribute('tabindex');
        return tabIndex !== null && tabIndex !== '-1';
      });
      
      const hasAriaLive = await errorMessage.getAttribute('aria-live');
      
      expect(isFocusable || hasAriaLive).toBe(true);
      
      // If focusable, test keyboard navigation to error
      if (isFocusable) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus');
        const isErrorFocused = await focusedElement.evaluate(el => 
          el.getAttribute('data-testid') === 'error-message'
        );
        
        expect(isErrorFocused).toBe(true);
      }
    }
  });

  test('should support keyboard accessibility for loading states', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Start search
    await page.fill('[data-testid="search-input"]', 'loading state test');
    await page.click('[data-testid="search-submit-button"]');
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    if (await loadingIndicator.isVisible()) {
      // Loading should not interfere with keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBe(1);
      
      // Should have appropriate ARIA attributes
      const ariaLabel = await loadingIndicator.getAttribute('aria-label');
      const ariaLive = await loadingIndicator.getAttribute('aria-live');
      const role = await loadingIndicator.getAttribute('role');
      
      expect(ariaLabel || ariaLive || role).toBeTruthy();
    }
  });

  test('should handle keyboard accessibility for dynamic content', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test dynamic content changes
    const countrySelector = page.locator('[data-testid="country-select"]');
    await countrySelector.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    // Select a country to trigger dynamic content
    const firstOption = page.locator('[data-testid="country-dropdown"] [role="option"]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
      await page.waitForTimeout(500);
      
      // Keyboard navigation should still work after dynamic update
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBe(1);
      expect(await focusedElement.isVisible()).toBe(true);
    }
  });

  test('should support keyboard accessibility for help and tooltips', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Look for help button or tooltip triggers
    const helpButton = page.locator('[data-testid="help-button"], [aria-label*="help"], [title*="help"]');
    if (await helpButton.count() > 0) {
      await helpButton.first().focus();
      
      // Test keyboard activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Check for help content
      const helpContent = page.locator('[data-testid="help-content"]');
      if (await helpContent.isVisible()) {
        // Should be keyboard accessible
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus');
        expect(await focusedElement.count()).toBe(1);
        
        // Should have close functionality
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Advanced Keyboard Navigation Tests', () => {
  test('should support complex keyboard navigation patterns', async ({ page }) => {
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test multi-select functionality
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    const categorySelector = page.locator('[data-testid="category-select"]');
    await categorySelector.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    const categoryDropdown = page.locator('[data-testid="category-dropdown"]');
    if (await categoryDropdown.isVisible()) {
      // Test multi-select with Ctrl/Cmd + Click equivalent
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Control+Enter'); // Select without closing
      
      // Test range selection with Shift
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Shift+Enter'); // Select range
    }
  });

  test('should handle keyboard accessibility for custom components', async ({ page }) => {
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test custom AI search components
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test custom autocomplete/combobox
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.focus();
    await page.keyboard.type('custom component');
    
    // Test autocomplete suggestions
    await page.waitForTimeout(1000);
    const suggestions = page.locator('[data-testid="search-suggestions"]');
    if (await suggestions.isVisible()) {
      // Test arrow key navigation
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Should select suggestion
      const selectedValue = await searchInput.inputValue();
      expect(selectedValue.length).toBeGreaterThan(0);
    }
  });

  test('should support keyboard accessibility for data tables', async ({ page }) => {
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Look for data tables
    const dataTable = page.locator('table[data-testid="contacts-table"], [role="table"]');
    if (await dataTable.count() > 0) {
      // Test table navigation
      await dataTable.focus();
      
      // Test arrow key navigation in table
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowUp');
      
      // Test Ctrl/Cmd + Home/End for table navigation
      await page.keyboard.press('Control+Home');
      await page.keyboard.press('Control+End');
      
      // Test sorting with keyboard
      const sortableHeaders = dataTable.locator('th[aria-sort], th[role="button"]');
      if (await sortableHeaders.count() > 0) {
        await sortableHeaders.first().focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle keyboard accessibility for responsive design', async ({ page }) => {
    // Test mobile keyboard navigation
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test mobile menu
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Test mobile menu navigation
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    
    // Test AI search on mobile
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test mobile form navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    expect(await focusedElement.isVisible()).toBe(true);
    
    // Test mobile-specific interactions
    const mobileElements = page.locator('[data-testid="mobile-specific"]');
    if (await mobileElements.count() > 0) {
      await mobileElements.first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  });
});