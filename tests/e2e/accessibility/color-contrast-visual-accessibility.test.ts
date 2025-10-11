/**
 * Color Contrast and Visual Accessibility Tests
 * Tests for WCAG 2.1 AA color contrast requirements and visual accessibility
 */

import { test, expect } from '@playwright/test';

test.describe('Color Contrast and Visual Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Add color contrast testing utilities
    await page.addInitScript(() => {
      // Color contrast calculation function
      (window as any).calculateContrastRatio = (rgb1: number[], rgb2: number[]) => {
        const getLuminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map(val => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        
        const lum1 = getLuminance(rgb1);
        const lum2 = getLuminance(rgb2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      };
      
      // RGB to hex conversion
      (window as any).rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      };
      
      // Get computed color
      (window as any).getComputedColor = (element: Element, property: string) => {
        const styles = window.getComputedStyle(element);
        const color = styles.getPropertyValue(property);
        
        // Convert RGB to array
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          return [
            parseInt(rgbMatch[1]),
            parseInt(rgbMatch[2]),
            parseInt(rgbMatch[3])
          ];
        }
        
        // Handle hex colors
        const hexMatch = color.match(/#([0-9a-f]{6})/i);
        if (hexMatch) {
          const hex = hexMatch[1];
          return [
            parseInt(hex.substr(0, 2), 16),
            parseInt(hex.substr(2, 2), 16),
            parseInt(hex.substr(4, 2), 16)
          ];
        }
        
        return null;
      };
    });
  });

  test('should meet WCAG AA color contrast requirements for text', async ({ page }) => {
    // Test main text elements
    const textElements = await page.locator('h1, h2, h3, h4, h5, h6, p, span, div').all();
    
    for (const element of textElements.slice(0, 10)) { // Test first 10 elements
      if (await element.isVisible()) {
        const textColor = await page.evaluate(el => 
          (window as any).getComputedColor(el, 'color')
        , element);
        
        const backgroundColor = await page.evaluate(el => {
          const bg = (window as any).getComputedColor(el, 'background-color');
          // If transparent, get parent background
          if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0 && 
              window.getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') {
            const parent = el.parentElement;
            return parent ? (window as any).getComputedColor(parent, 'background-color') : [255, 255, 255];
          }
          return bg;
        }, element);
        
        if (textColor && backgroundColor) {
          const contrastRatio = await page.evaluate((colors: number[]) => 
            (window as any).calculateContrastRatio(colors[0], colors[1])
          , [textColor, backgroundColor]);
          
          // WCAG AA requires 4.5:1 for normal text
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  test('should meet WCAG AA color contrast requirements for large text', async ({ page }) => {
    // Test large text elements (18pt+ or 14pt+ bold)
    const largeTextElements = await page.locator('h1, h2, h3').all();
    
    for (const element of largeTextElements) {
      if (await element.isVisible()) {
        const fontSize = await element.evaluate(el => 
          parseInt(window.getComputedStyle(el).fontSize)
        );
        const fontWeight = await element.evaluate(el => 
          window.getComputedStyle(el).fontWeight
        );
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight) >= 700);
        
        if (isLargeText) {
          const textColor = await page.evaluate(el => 
            (window as any).getComputedColor(el, 'color')
          , element);
          
          const backgroundColor = await page.evaluate(el => {
            const bg = (window as any).getComputedColor(el, 'background-color');
            if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0) {
              const parent = el.parentElement;
              return parent ? (window as any).getComputedColor(parent, 'background-color') : [255, 255, 255];
            }
            return bg;
          }, element);
          
          if (textColor && backgroundColor) {
            const contrastRatio = await page.evaluate((colors: number[]) => 
              (window as any).calculateContrastRatio(colors[0], colors[1])
            , [textColor, backgroundColor]);
            
            // WCAG AA requires 3:1 for large text
            expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
          }
        }
      }
    }
  });

  test('should meet WCAG AA color contrast requirements for interactive elements', async ({ page }) => {
    // Test buttons, links, and form controls
    const interactiveElements = await page.locator(
      'button, [role="button"], a, input, select, textarea'
    ).all();
    
    for (const element of interactiveElements.slice(0, 10)) { // Test first 10 elements
      if (await element.isVisible()) {
        const textColor = await page.evaluate(el => {
          const color = (window as any).getComputedColor(el, 'color');
          // For inputs, use the placeholder text color if no text color
          if (!color && el.tagName === 'INPUT') {
            return (window as any).getComputedColor(el, 'color') || 
                   (window as any).getComputedColor(el, '-webkit-text-fill-color');
          }
          return color;
        }, element);
        
        const backgroundColor = await page.evaluate(el => {
          const bg = (window as any).getComputedColor(el, 'background-color');
          const borderColor = (window as any).getComputedColor(el, 'border-color');
          
          // Use border color if background is transparent
          if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0) {
            return borderColor || [255, 255, 255];
          }
          return bg;
        }, element);
        
        if (textColor && backgroundColor) {
          const contrastRatio = await page.evaluate((colors: number[]) => 
            (window as any).calculateContrastRatio(colors[0], colors[1])
          , [textColor, backgroundColor]);
          
          // WCAG AA requires 4.5:1 for interactive elements
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  test('should have proper color contrast in AI search modal', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test modal elements
    const modalElements = await page.locator('[data-testid="ai-search-modal"] *').all();
    
    for (const element of modalElements.slice(0, 15)) { // Test first 15 elements
      if (await element.isVisible()) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const hasText = await element.evaluate(el => el.textContent?.trim().length > 0);
        
        if (hasText && ['button', 'input', 'select', 'label', 'span', 'div'].includes(tagName)) {
          const textColor = await page.evaluate(el => 
            (window as any).getComputedColor(el, 'color')
          , element);
          
          const backgroundColor = await page.evaluate(el => {
            const bg = (window as any).getComputedColor(el, 'background-color');
            if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0) {
              const parent = el.parentElement;
              return parent ? (window as any).getComputedColor(parent, 'background-color') : [255, 255, 255];
            }
            return bg;
          }, element);
          
          if (textColor && backgroundColor) {
            const contrastRatio = await page.evaluate((colors: number[]) => 
              (window as any).calculateContrastRatio(colors[0], colors[1])
            , [textColor, backgroundColor]);
            
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  test('should have accessible focus indicators', async ({ page }) => {
    // Test focus indicators on interactive elements
    const interactiveElements = await page.locator(
      'button, [role="button"], a, input, select, textarea'
    ).all();
    
    for (const element of interactiveElements.slice(0, 10)) {
      if (await element.isVisible()) {
        await element.focus();
        
        // Check focus styles
        const focusStyles = await element.evaluate(el => {
          const styles = window.getComputedStyle(el, ':focus');
          return {
            outline: styles.outline,
            outlineColor: styles.outlineColor,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            boxShadow: styles.boxShadow,
            border: styles.border,
            borderColor: styles.borderColor
          };
        });
        
        // Should have visible focus indicator
        const hasFocusIndicator = 
          focusStyles.outline !== 'none' && focusStyles.outline !== '' ||
          focusStyles.boxShadow !== 'none' && focusStyles.boxShadow !== '' ||
          focusStyles.border !== 'none' && focusStyles.border !== '';
        
        expect(hasFocusIndicator).toBe(true);
        
        // Check focus indicator color contrast
        if (focusStyles.outlineColor && focusStyles.outlineColor !== 'transparent') {
          const outlineColor = await page.evaluate((color: string) => {
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
              return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
            }
            return null;
          }, focusStyles.outlineColor);
          
          if (outlineColor) {
            // White or black outline on any background should be visible
            const isHighContrast = await page.evaluate((color: number[]) => {
              return (color[0] > 200 && color[1] > 200 && color[2] > 200) || // White
                     (color[0] < 55 && color[1] < 55 && color[2] < 55); // Black
            }, outlineColor);
            
            expect(isHighContrast).toBe(true);
          }
        }
      }
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.addStyleTag({
      content: `
        * {
          forced-color-adjust: exact !important;
        }
        @media screen and (-ms-high-contrast: active) {
          * {
            forced-color-adjust: exact !important;
          }
        }
      `
    });
    
    // Wait for styles to apply
    await page.waitForTimeout(1000);
    
    // Test that elements are still visible and functional
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test modal functionality in high contrast mode
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('high contrast test');
    
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await expect(searchButton).toBeVisible();
    await searchButton.click();
    
    // Should still work in high contrast mode
    await page.waitForTimeout(1000);
  });

  test('should support Windows high contrast mode', async ({ page }) => {
    // Simulate Windows high contrast mode
    await page.addStyleTag({
      content: `
        @media screen and (-ms-high-contrast: active) {
          * {
            -ms-high-contrast-adjust: exact !important;
            forced-color-adjust: exact !important;
          }
          
          button, input, select, textarea {
            border: 2px solid WindowText !important;
            background: Window !important;
            color: WindowText !important;
          }
          
          a {
            color: LinkText !important;
          }
          
          a:visited {
            color: VisitedText !important;
          }
        }
      `
    });
    
    // Test functionality in Windows high contrast mode
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Elements should still be visible and functional
    const modalElements = await page.locator('[data-testid="ai-search-modal"] button, [data-testid="ai-search-modal"] input').all();
    expect(modalElements.length).toBeGreaterThan(0);
    
    for (const element of modalElements) {
      expect(await element.isVisible()).toBe(true);
    }
  });

  test('should support color blind accessibility', async ({ page }) => {
    // Test with different color blindness simulations
    
    // Deuteranopia (green color blindness)
    await page.addStyleTag({
      content: `
        html {
          filter: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/></filter></svg>#deuteranopia');
        }
      `
    });
    
    await page.waitForTimeout(1000);
    
    // Test functionality with deuteranopia filter
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Elements should still be distinguishable
    const modalElements = await page.locator('[data-testid="ai-search-modal"] *').all();
    const visibleElements = modalElements.filter(el => el.isVisible());
    
    expect(visibleElements.length).toBeGreaterThan(0);
    
    // Remove filter
    await page.evaluate(() => {
      document.querySelector('style[data-testid="deuteranopia"]')?.remove();
    });
    
    // Protanopia (red color blindness)
    await page.addStyleTag({
      content: `
        html {
          filter: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/></filter></svg>#protanopia');
        }
      `
    });
    
    await page.waitForTimeout(1000);
    
    // Test functionality with protanopia filter
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('color blind test');
    
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await expect(searchButton).toBeVisible();
    await searchButton.click();
    
    await page.waitForTimeout(1000);
  });

  test('should have adequate text spacing and sizing', async ({ page }) => {
    // Test text spacing
    const textElements = await page.locator('p, span, div, label').all();
    
    for (const element of textElements.slice(0, 10)) {
      if (await element.isVisible()) {
        const textStyles = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: parseInt(styles.fontSize),
            lineHeight: parseFloat(styles.lineHeight),
            letterSpacing: parseFloat(styles.letterSpacing),
            wordSpacing: parseFloat(styles.wordSpacing)
          };
        });
        
        // Check minimum font size (should be at least 14px for body text)
        expect(textStyles.fontSize).toBeGreaterThanOrEqual(14);
        
        // Check line height (should be at least 1.5)
        expect(textStyles.lineHeight).toBeGreaterThanOrEqual(1.5);
        
        // Check letter spacing (should not be too tight)
        expect(textStyles.letterSpacing).toBeGreaterThanOrEqual(-0.5);
      }
    }
  });

  test('should support text resizing up to 200%', async ({ page }) => {
    // Test text resizing
    await page.addStyleTag({
      content: `
        * {
          font-size: 200% !important;
        }
      `
    });
    
    await page.waitForTimeout(1000);
    
    // Test that functionality is preserved at 200% text size
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Elements should still be visible and functional
    const modal = page.locator('[data-testid="ai-search-modal"]');
    await expect(modal).toBeVisible();
    
    // Check that modal doesn't overflow viewport
    const modalBoundingBox = await modal.boundingBox();
    const viewportSize = page.viewportSize();
    
    if (modalBoundingBox && viewportSize) {
      expect(modalBoundingBox.width).toBeLessThanOrEqual(viewportSize.width);
      expect(modalBoundingBox.height).toBeLessThanOrEqual(viewportSize.height);
    }
    
    // Test form functionality
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('text resize test');
    
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await expect(searchButton).toBeVisible();
    await searchButton.click();
    
    await page.waitForTimeout(1000);
  });

  test('should have sufficient color contrast for disabled elements', async ({ page }) => {
    // Look for disabled elements
    const disabledElements = await page.locator('button:disabled, input:disabled, select:disabled').all();
    
    for (const element of disabledElements) {
      if (await element.isVisible()) {
        const textColor = await page.evaluate(el => 
          (window as any).getComputedColor(el, 'color')
        , element);
        
        const backgroundColor = await page.evaluate(el => {
          const bg = (window as any).getComputedColor(el, 'background-color');
          if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0) {
            const parent = el.parentElement;
            return parent ? (window as any).getComputedColor(parent, 'background-color') : [255, 255, 255];
          }
          return bg;
        }, element);
        
        if (textColor && backgroundColor) {
          const contrastRatio = await page.evaluate((colors: number[]) => 
            (window as any).calculateContrastRatio(colors[0], colors[1])
          , [textColor, backgroundColor]);
          
          // Disabled elements should still meet minimum contrast (3:1)
          expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
        }
      }
    }
  });

  test('should have accessible error and status colors', async ({ page }) => {
    // Open AI search modal
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Try to submit empty form to trigger error
    const searchButton = page.locator('[data-testid="search-submit-button"]');
    await searchButton.click();
    await page.waitForTimeout(1000);
    
    // Check error message colors
    const errorElements = await page.locator('[data-testid="error-message"], .error, [role="alert"]').all();
    
    for (const element of errorElements) {
      if (await element.isVisible()) {
        const textColor = await page.evaluate(el => 
          (window as any).getComputedColor(el, 'color')
        , element);
        
        const backgroundColor = await page.evaluate(el => {
          const bg = (window as any).getComputedColor(el, 'background-color');
          if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0) {
            const parent = el.parentElement;
            return parent ? (window as any).getComputedColor(parent, 'background-color') : [255, 255, 255];
          }
          return bg;
        }, element);
        
        if (textColor && backgroundColor) {
          const contrastRatio = await page.evaluate((colors: number[]) => 
            (window as any).calculateContrastRatio(colors[0], colors[1])
          , [textColor, backgroundColor]);
          
          // Error messages should have high contrast
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    
    // Check success/status colors
    const successElements = await page.locator('.success, .status, [role="status"]').all();
    
    for (const element of successElements) {
      if (await element.isVisible()) {
        const textColor = await page.evaluate(el => 
          (window as any).getComputedColor(el, 'color')
        , element);
        
        const backgroundColor = await page.evaluate(el => {
          const bg = (window as any).getComputedColor(el, 'background-color');
          if (bg && bg[0] === 0 && bg[1] === 0 && bg[2] === 0) {
            const parent = el.parentElement;
            return parent ? (window as any).getComputedColor(parent, 'background-color') : [255, 255, 255];
          }
          return bg;
        }, element);
        
        if (textColor && backgroundColor) {
          const contrastRatio = await page.evaluate((colors: number[]) => 
            (window as any).calculateContrastRatio(colors[0], colors[1])
          , [textColor, backgroundColor]);
          
          // Success messages should also have high contrast
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  test('should have accessible color combinations in different themes', async ({ page }) => {
    // Test light theme (default)
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    const lightThemeContrast = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, p, button');
      let minContrast = 10;
      
      elements.forEach(el => {
        if (el instanceof HTMLElement && el.offsetParent !== null) {
          const styles = window.getComputedStyle(el);
          const textColor = styles.color;
          const bgColor = styles.backgroundColor;
          
          if (textColor && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
            // Simplified contrast check
            const textRgb = textColor.match(/\d+/g);
            const bgRgb = bgColor.match(/\d+/g);
            
            if (textRgb && bgRgb) {
              const contrast = (window as any).calculateContrastRatio(
                [parseInt(textRgb[0]), parseInt(textRgb[1]), parseInt(textRgb[2])],
                [parseInt(bgRgb[0]), parseInt(bgRgb[1]), parseInt(bgRgb[2])]
              );
              minContrast = Math.min(minContrast, contrast);
            }
          }
        }
      });
      
      return minContrast;
    });
    
    expect(lightThemeContrast).toBeGreaterThanOrEqual(4.5);
    
    // Test dark theme if available
    const darkThemeToggle = page.locator('[data-testid="theme-toggle"], [data-testid="dark-mode-toggle"]');
    if (await darkThemeToggle.isVisible()) {
      await darkThemeToggle.click();
      await page.waitForTimeout(1000);
      
      const darkThemeContrast = await page.evaluate(() => {
        const elements = document.querySelectorAll('h1, h2, h3, p, button');
        let minContrast = 10;
        
        elements.forEach(el => {
          if (el instanceof HTMLElement && el.offsetParent !== null) {
            const styles = window.getComputedStyle(el);
            const textColor = styles.color;
            const bgColor = styles.backgroundColor;
            
            if (textColor && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
              const textRgb = textColor.match(/\d+/g);
              const bgRgb = bgColor.match(/\d+/g);
              
              if (textRgb && bgRgb) {
                const contrast = (window as any).calculateContrastRatio(
                  [parseInt(textRgb[0]), parseInt(textRgb[1]), parseInt(textRgb[2])],
                  [parseInt(bgRgb[0]), parseInt(bgRgb[1]), parseInt(bgRgb[2])]
                );
                minContrast = Math.min(minContrast, contrast);
              }
            }
          }
        });
        
        return minContrast;
      });
      
      expect(darkThemeContrast).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test.describe('Advanced Visual Accessibility Tests', () => {
  test('should support reduced motion preferences', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });
    
    // Add reduced motion styles
    await page.addStyleTag({
      content: `
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `
    });
    
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test that animations are reduced
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Modal should appear without animation
    const modal = page.locator('[data-testid="ai-search-modal"]');
    await expect(modal).toBeVisible();
    
    // Test that functionality is preserved
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('reduced motion test');
  });

  test('should support custom color preferences', async ({ page }) => {
    // Test with user-defined color preferences
    await page.addStyleTag({
      content: `
        :root {
          --user-text-color: #000000;
          --user-bg-color: #ffffff;
          --user-link-color: #0000ee;
        }
        
        * {
          color: var(--user-text-color) !important;
          background-color: var(--user-bg-color) !important;
        }
        
        a {
          color: var(--user-link-color) !important;
        }
      `
    });
    
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test that custom colors are applied
    const bodyTextColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).color;
    });
    
    expect(bodyTextColor).toBe('rgb(0, 0, 0)');
    
    // Test functionality with custom colors
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    const modal = page.locator('[data-testid="ai-search-modal"]');
    await expect(modal).toBeVisible();
  });

  test('should handle low vision accessibility', async ({ page }) => {
    // Test with increased font size and contrast
    await page.addStyleTag({
      content: `
        * {
          font-size: 120% !important;
          font-weight: 500 !important;
          line-height: 1.6 !important;
        }
        
        button, input, select, textarea {
          border: 2px solid #000000 !important;
          background-color: #ffffff !important;
          color: #000000 !important;
        }
      `
    });
    
    await page.goto('/dashboard/contacts');
    await page.waitForLoadState('networkidle');
    
    // Test that elements are still accessible
    await page.click('[data-testid="find-contacts-button"]');
    await page.waitForSelector('[data-testid="ai-search-modal"]', { state: 'visible' });
    
    // Test form accessibility
    const formElements = await page.locator('[data-testid="ai-search-modal"] input, [data-testid="ai-search-modal"] button').all();
    
    for (const element of formElements) {
      expect(await element.isVisible()).toBe(true);
      
      // Check that elements have sufficient contrast
      const styles = await element.evaluate(el => {
        const computedStyles = window.getComputedStyle(el);
        return {
          color: computedStyles.color,
          backgroundColor: computedStyles.backgroundColor,
          borderColor: computedStyles.borderColor
        };
      });
      
      expect(styles.color).toBe('rgb(0, 0, 0)');
      expect(styles.backgroundColor).toBe('rgb(255, 255, 255)');
    }
  });
});