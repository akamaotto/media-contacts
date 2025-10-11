import { type Page, type Locator, expect } from '@playwright/test';
import path from 'path';

/**
 * Base Page Object Model
 * Provides common functionality and utilities for all page objects
 */
export class BasePage {
  readonly page: Page;
  readonly screenshotsDir: string;
  readonly performanceMetrics: Map<string, number> = new Map();

  constructor(page: Page, screenshotsDir?: string) {
    this.page = page;
    this.screenshotsDir = screenshotsDir || path.join(process.cwd(), 'test-results', 'screenshots');
  }

  /**
   * Take a screenshot with automatic naming and metadata
   */
  async takeScreenshot(name: string, description?: string, options?: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotsDir, filename);

    // Ensure screenshots directory exists
    const fs = require('fs');
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }

    await this.page.screenshot({
      path: filepath,
      fullPage: options?.fullPage ?? true,
      animations: 'disabled',
      clip: options?.clip,
    });

    console.log(`📸 Screenshot saved: ${filename}${description ? ` - ${description}` : ''}`);
    return filepath;
  }

  /**
   * Wait for page to be fully loaded and stable
   */
  async waitForPageLoad(timeout = 10000) {
    await this.page.waitForLoadState('networkidle', { timeout });
    await this.page.waitForLoadState('domcontentloaded', { timeout });
    
    // Wait for any ongoing animations
    await this.page.waitForFunction(() => {
      const animations = document.getAnimations();
      return animations.length === 0 || animations.every(animation => 
        animation.playState === 'finished' || animation.playState === 'idle'
      );
    }, { timeout: 5000 }).catch(() => {}); // Ignore timeout
  }

  /**
   * Check if element is visible and in viewport
   */
  async isElementVisibleAndInViewport(locator: Locator): Promise<boolean> {
    try {
      const isVisible = await locator.isVisible({ timeout: 2000 });
      if (!isVisible) return false;

      const isInViewport = await locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );
      });

      return isInViewport;
    } catch {
      return false;
    }
  }

  /**
   * Scroll element into view smoothly
   */
  async scrollIntoView(locator: Locator, options?: { timeout?: number }) {
    await locator.scrollIntoViewIfNeeded({ timeout: options?.timeout || 5000 });
    await this.page.waitForTimeout(200); // Small delay for smooth scrolling
  }

  /**
   * Hover over element with verification
   */
  async hover(locator: Locator, options?: { timeout?: number }) {
    await this.scrollIntoView(locator, options);
    await locator.hover({ timeout: options?.timeout || 5000 });
  }

  /**
   * Click element with retry logic
   */
  async clickWithRetry(locator: Locator, options?: { 
    timeout?: number; 
    retries?: number; 
    waitForNavigation?: boolean;
  }) {
    const { timeout = 5000, retries = 3, waitForNavigation = false } = options || {};
    
    for (let i = 0; i < retries; i++) {
      try {
        await this.scrollIntoView(locator);
        await locator.click({ timeout });
        
        if (waitForNavigation) {
          await this.page.waitForLoadState('networkidle', { timeout: 5000 });
        }
        
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        
        console.log(`⚠️  Click attempt ${i + 1} failed, retrying...`);
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Fill form field with validation
   */
  async fillFormField(locator: Locator, value: string, options?: {
    clear?: boolean;
    validate?: boolean;
    timeout?: number;
  }) {
    const { clear = true, validate = true, timeout = 5000 } = options || {};
    
    await this.scrollIntoView(locator);
    
    if (clear) {
      await locator.clear({ timeout });
    }
    
    await locator.fill(value, { timeout });
    
    if (validate) {
      const filledValue = await locator.inputValue({ timeout: 1000 });
      if (filledValue !== value) {
        throw new Error(`Field validation failed. Expected: "${value}", Got: "${filledValue}"`);
      }
    }
  }

  /**
   * Wait for and handle loading states
   */
  async waitForLoading(selector = '.loading, .spinner, [aria-busy="true"]', options?: {
    timeout?: number;
    state?: 'visible' | 'hidden';
  }) {
    const { timeout = 10000, state = 'hidden' } = options || {};
    const loadingLocator = this.page.locator(selector);
    
    if (state === 'visible') {
      await loadingLocator.isVisible({ timeout });
    } else {
      await loadingLocator.isHidden({ timeout }).catch(() => {}); // Ignore if not found
    }
  }

  /**
   * Check for and capture error messages
   */
  async captureErrors(selector = '.error, .alert-error, [role="alert"]'): Promise<string[]> {
    const errorLocators = this.page.locator(selector);
    const errors: string[] = [];
    
    const count = await errorLocators.count();
    for (let i = 0; i < count; i++) {
      const errorText = await errorLocators.nth(i).textContent();
      if (errorText) {
        errors.push(errorText.trim());
      }
    }
    
    return errors;
  }

  /**
   * Measure performance metrics
   */
  async measurePerformance<T>(name: string, action: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await action();
      const duration = Date.now() - startTime;
      this.performanceMetrics.set(name, duration);
      
      console.log(`⏱️  ${name}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${name}: Failed after ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics for the current page
   */
  async getPagePerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0, // Requires PerformanceObserver
        cumulativeLayoutShift: 0, // Requires PerformanceObserver
      };
    });

    return metrics;
  }

  /**
   * Validate accessibility of current page
   */
  async validateAccessibility(options?: {
    rules?: string[];
    level?: 'A' | 'AA' | 'AAA';
  }) {
    // This would integrate with axe-playwright or similar accessibility testing library
    // For now, we'll implement basic checks
    const issues: string[] = [];
    
    // Check for missing alt text on images
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images missing alt text`);
    }
    
    // Check for missing labels on form inputs
    const inputsWithoutLabels = await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      let count = 0;
      
      inputs.forEach(input => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                        input.closest('label') || 
                        input.getAttribute('aria-label') ||
                        input.getAttribute('aria-labelledby');
        
        if (!hasLabel) count++;
      });
      
      return count;
    });
    
    if (inputsWithoutLabels > 0) {
      issues.push(`${inputsWithoutLabels} form inputs missing labels`);
    }
    
    return {
      passed: issues.length === 0,
      issues,
      level: options?.level || 'AA',
    };
  }

  /**
   * Simulate network conditions
   */
  async setNetworkConditions(profile: 'slow-3g' | 'fast-3g' | '4g' | 'offline') {
    const contexts = this.page.context();
    
    const profiles = {
      'slow-3g': {
        downloadThroughput: 500 * 1024 / 8,
        uploadThroughput: 500 * 1024 / 8,
        latency: 400,
      },
      'fast-3g': {
        downloadThroughput: 1.6 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 300,
      },
      '4g': {
        downloadThroughput: 9 * 1024 * 1024 / 8,
        uploadThroughput: 1.5 * 1024 * 1024 / 8,
        latency: 100,
      },
      'offline': {
        offline: true,
      },
    };
    
    await contexts.setOffline(profile === 'offline');
    
    if (profile !== 'offline') {
      // Note: Playwright doesn't directly support network throttling in all contexts
      // This would need to be implemented via browser-specific APIs or proxy
      console.log(`🌐 Network conditions set to: ${profile}`);
    }
  }

  /**
   * Get all performance metrics collected during the test
   */
  getPerformanceMetrics() {
    return Object.fromEntries(this.performanceMetrics);
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics() {
    this.performanceMetrics.clear();
  }
}