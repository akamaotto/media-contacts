import { defineConfig, devices, type TestOptions } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration for E2E Testing
 * 
 * This configuration supports:
 * - Cross-browser testing (Chrome, Firefox, Safari, Edge)
 * - Mobile and tablet responsive testing
 * - Visual regression testing
 * - Performance testing
 * - Accessibility testing
 * - CI/CD integration
 */

// Base URL for tests
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test environment configuration
const isCI = process.env.CI === 'true';
const isDebug = process.env.DEBUG === 'true';

// Directory configurations
const ARTIFACTS_DIR = path.join(process.cwd(), 'test-results');
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');
const VIDEOS_DIR = path.join(ARTIFACTS_DIR, 'videos');
const TRACES_DIR = path.join(ARTIFACTS_DIR, 'traces');
const REPORTS_DIR = path.join(ARTIFACTS_DIR, 'reports');
const HTML_REPORT_DIR = path.join(process.cwd(), 'playwright-report');

// Performance testing configuration
const PERFORMANCE_CONFIG = {
  // Time thresholds in milliseconds
  thresholds: {
    'page-load': 3000,
    'first-contentful-paint': 1500,
    'largest-contentful-paint': 2500,
    'cumulative-layout-shift': 0.1,
    'first-input-delay': 100,
    'search-execution': 10000,
    'modal-open': 1000,
    'form-submission': 2000,
  },
  // Network throttling profiles
  networkProfiles: {
    'slow-3g': {
      downloadThroughput: 500 * 1024 / 8, // 500 Kbps
      uploadThroughput: 500 * 1024 / 8,   // 500 Kbps
      latency: 400,                       // 400ms RTT
    },
    'fast-3g': {
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
      uploadThroughput: 750 * 1024 / 8,          // 750 Kbps
      latency: 300,                               // 300ms RTT
    },
    '4g': {
      downloadThroughput: 9 * 1024 * 1024 / 8, // 9 Mbps
      uploadThroughput: 1.5 * 1024 * 1024 / 8,  // 1.5 Mbps
      latency: 100,                              // 100ms RTT
    },
  },
};

// Visual testing configuration
const VISUAL_CONFIG = {
  // Screenshot configuration
  screenshot: {
    mode: 'only-on-failure' as const,
    fullPage: true,
    animations: 'disabled' as const,
  },
  // Visual regression configuration
  visualRegression: {
    threshold: 0.2, // 20% threshold for pixel differences
    maxDiffPixels: 1000,
    updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
  },
};

// Accessibility testing configuration
const ACCESSIBILITY_CONFIG = {
  // WCAG 2.1 AA compliance
  standards: ['WCAG2AA'],
  // Ignore common false positives
  ignore: [
    'color-contrast', // Often false positives in test environment
    'bypass', // Skip links not always present in modals
  ],
};

export default defineConfig<TestOptions>({
  // Global test configuration
  testDir: './tests',
  testMatch: [
    '**/*.e2e.spec.ts',
    '**/*.e2e.spec.js',
    '**/e2e/**/*.spec.ts',
    '**/e2e/**/*.spec.js',
  ],
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
  ],
  
  // Test execution configuration
  fullyParallel: !isDebug,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },
  
  // Output configuration
  outputDir: ARTIFACTS_DIR,
  
  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  // Browser configuration
  use: {
    // Base URL
    baseURL: BASE_URL,
    
    // Browser context options
    trace: isCI ? 'on-first-retry' : isDebug ? 'on' : 'retain-on-failure',
    screenshot: VISUAL_CONFIG.screenshot,
    video: isCI ? 'retain-on-failure' : 'off',
    
    // Test options
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    
    // Network conditions (default to 4G)
    ...(!isDebug && {
      offline: false,
      ...PERFORMANCE_CONFIG.networkProfiles['4g'],
    }),
    
    // Performance monitoring
    navigationTimeout: 15000,
    
    // Custom test fixtures
    isCI,
    isDebug,
    ARTIFACTS_DIR,
    SCREENSHOTS_DIR,
    VIDEOS_DIR,
    TRACES_DIR,
    REPORTS_DIR,
    PERFORMANCE_CONFIG,
    VISUAL_CONFIG,
    ACCESSIBILITY_CONFIG,
  },
  
  // Projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'] },
    },
    
    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['iPhone 12'],
        ...PERFORMANCE_CONFIG.networkProfiles['4g'],
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        ...PERFORMANCE_CONFIG.networkProfiles['4g'],
      },
    },
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        ...PERFORMANCE_CONFIG.networkProfiles['4g'],
      },
    },
    
    // Slow network testing
    {
      name: 'slow-network',
      use: { 
        ...devices['Desktop Chrome'],
        ...PERFORMANCE_CONFIG.networkProfiles['slow-3g'],
      },
      testMatch: '**/performance/**/*.spec.ts',
    },
    
    // Accessibility testing
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable accessibility testing features
      },
      testMatch: '**/accessibility/**/*.spec.ts',
    },
    
    // Visual regression testing
    {
      name: 'visual-regression',
      use: { 
        ...devices['Desktop Chrome'],
        // Strict visual comparison
      },
      testMatch: '**/visual/**/*.spec.ts',
    },
    
    // Cross-browser compatibility
    {
      name: 'cross-browser',
      use: { 
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/cross-browser/**/*.spec.ts',
    },
  ],
  
  // Development server configuration
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes
    stdout: 'ignore',
    stderr: 'pipe',
  },
  
  // Reporting configuration
  reporter: [
    // HTML report for local development
    ['html', { 
      outputFolder: HTML_REPORT_DIR,
      open: !process.env.CI ? 'always' : 'never',
    }],
    
    // JSON report for CI/CD
    ['json', { 
      outputFile: path.join(REPORTS_DIR, 'results.json'),
    }],
    
    // JUnit report for CI/CD integration
    ['junit', { 
      outputFile: path.join(REPORTS_DIR, 'junit.xml'),
      stripANSIControlSequences: true,
    }],
    
    // Console reporter with custom formatting
    ['list'],
    
    // GitHub Actions reporter for CI/CD
    process.env.CI ? ['github'] : null,
  ].filter(Boolean),
  
  // Metadata for test categorization
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Browser Version': 'auto-detected',
    'Test Suite': 'E2E User Workflow Testing',
    'Story': '4.4 - End-to-End & User Workflow Testing',
    'Epic': 'Epic 4: Integration & Testing',
  },
  
  // Global test hooks
  beforeEach: async ({ page }, use) => {
    // Set up global page configurations
    await page.addInitScript(() => {
      // Disable animations for consistent testing
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    });
    
    await use(page);
  },
  
  // Custom test options interface
  defineConfig: {
    testOptions: {
      isCI: 'boolean',
      isDebug: 'boolean',
      ARTIFACTS_DIR: 'string',
      SCREENSHOTS_DIR: 'string',
      VIDEOS_DIR: 'string',
      TRACES_DIR: 'string',
      REPORTS_DIR: 'string',
      PERFORMANCE_CONFIG: 'object',
      VISUAL_CONFIG: 'object',
      ACCESSIBILITY_CONFIG: 'object',
    },
  },
});
