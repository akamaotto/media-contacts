# E2E Testing Guide - AI Search Platform

## Overview

This guide provides comprehensive documentation for the End-to-End (E2E) testing framework implemented for the AI Search platform. The testing framework is built using Playwright and covers all aspects of user workflow testing as specified in Story 4.4.

## Table of Contents

1. [Testing Framework Architecture](#testing-framework-architecture)
2. [Test Categories](#test-categories)
3. [Running Tests](#running-tests)
4. [Test Configuration](#test-configuration)
5. [CI/CD Integration](#cicd-integration)
6. [Test Reports](#test-reports)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Testing Framework Architecture

### Core Components

1. **Playwright Configuration** (`playwright.config.ts`)
   - Cross-browser testing setup
   - Mobile and tablet device configurations
   - Performance and visual testing configurations
   - Network condition simulation

2. **Page Object Models** (`tests/page-objects/`)
   - `BasePage`: Common functionality and utilities
   - `AISearchPage`: Specialized methods for AI Search functionality

3. **Test Utilities** (`tests/utils.ts`)
   - Authentication helpers
   - Common test functions
   - Performance measurement utilities

4. **Global Setup/Teardown** (`tests/global-*.ts`)
   - Test environment initialization
   - Browser state management
   - Test artifact cleanup

## Test Categories

### 1. User Workflow Tests (`tests/e2e/user-workflows/`)

Tests complete user journeys from search to import, including:
- Basic search and import workflow
- Advanced search with all options
- Error scenarios and user recovery paths
- Data persistence across sessions
- Large result sets handling
- Concurrent operations
- Accessibility throughout workflows

### 2. Cross-Browser Tests (`tests/e2e/cross-browser/`)

Tests UI consistency and functionality across different browsers:
- Chrome, Firefox, Safari, Edge
- Browser-specific features and considerations
- Consistent behavior across browsers
- Mobile browser compatibility

### 3. Responsive Design Tests (`tests/e2e/responsive/`)

Tests UI adaptation across different device sizes:
- Mobile devices (iPhone SE, iPhone 12, iPhone 14 Pro Max, Pixel 5)
- Tablet devices (iPad, iPad Pro, Surface Pro)
- Desktop variations (small, standard, large)
- Orientation change handling
- Touch interaction optimization

### 4. Visual Regression Tests (`tests/e2e/visual/`)

Tests UI consistency and visual appearance:
- Static UI components
- Dynamic UI states
- Cross-device visual consistency
- Component-specific visual tests
- Responsive visual validation
- Theme variations (light/dark)

### 5. Performance Tests (`tests/e2e/performance/`)

Tests performance characteristics under various conditions:
- Page load performance
- Modal interaction performance
- Complex query performance
- Large dataset performance
- Network condition performance
- Mobile performance
- Concurrent user performance

### 6. Accessibility Tests (`tests/e2e/accessibility/`)

Tests WCAG 2.1 AA compliance and screen reader compatibility:
- Keyboard navigation
- Screen reader compatibility
- Visual accessibility
- Mobile accessibility
- Automated accessibility validation

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npm run test:e2e:install
   ```

3. Set up test database:
   ```bash
   npm run db:test:up
   npx prisma db push --skip-generate
   npx prisma db seed
   ```

### Running Tests Locally

#### Run All E2E Tests
```bash
npm run test:e2e
```

#### Run Specific Test Categories
```bash
# User workflow tests
npm run test:e2e:user-workflows

# Cross-browser tests
npm run test:e2e:cross-browser

# Responsive design tests
npm run test:e2e:responsive

# Visual regression tests
npm run test:e2e:visual

# Performance tests
npm run test:e2e:performance

# Accessibility tests
npm run test:e2e:accessibility
```

#### Run Tests on Specific Browsers
```bash
# Chrome only
npm run test:e2e:chrome

# Firefox only
npm run test:e2e:firefox

# Safari only
npm run test:e2e:safari
```

#### Run Mobile Tests
```bash
npm run test:e2e:mobile
```

#### Run Tablet Tests
```bash
npm run test:e2e:tablet
```

### Running Tests in Development Mode

#### With UI Mode
```bash
npm run test:e2e:ui
```

#### With Headed Mode (visible browser)
```bash
npm run test:e2e:headed
```

#### With Debug Mode
```bash
npm run test:e2e:debug
```

#### With Trace Recording
```bash
npm run test:e2e:trace
```

### Updating Visual Snapshots

```bash
npm run test:e2e:update-snapshots
```

### Generating Test Reports

```bash
npm run test:e2e:report
```

## Test Configuration

### Environment Variables

The following environment variables can be configured:

```bash
# Base URL for tests
BASE_URL=http://localhost:3000

# Test environment
NODE_ENV=test

# Enable debug mode
DEBUG=true

# CI environment
CI=true
```

### Playwright Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- **Browser Configuration**: Chrome, Firefox, Safari, Edge
- **Device Configuration**: Mobile, tablet, desktop viewports
- **Network Conditions**: Slow 3G, Fast 3G, 4G, offline
- **Performance Thresholds**: Maximum acceptable response times
- **Visual Testing**: Screenshot comparison settings
- **Reporting**: HTML, JSON, JUnit reporters

### Custom Test Options

The framework supports custom test options:

```typescript
use: {
  isCI: boolean,
  isDebug: boolean,
  ARTIFACTS_DIR: string,
  SCREENSHOTS_DIR: string,
  VIDEOS_DIR: string,
  TRACES_DIR: string,
  REPORTS_DIR: string,
  PERFORMANCE_CONFIG: object,
  VISUAL_CONFIG: object,
  ACCESSIBILITY_CONFIG: object,
}
```

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests are integrated into GitHub Actions via `.github/workflows/e2e-tests.yml`:

#### Triggers
- Push to main/develop branches
- Pull requests to main/develop branches
- Daily scheduled runs (4 AM UTC)
- Manual workflow dispatch

#### Jobs
1. **Setup Environment**: Install dependencies, browsers, and set up test environment
2. **User Workflow Tests**: Run complete user journey tests
3. **Cross-Browser Tests**: Test across different browsers
4. **Responsive Tests**: Test across different device sizes
5. **Visual Tests**: Run visual regression tests
6. **Performance Tests**: Run performance benchmarks
7. **Accessibility Tests**: Run accessibility compliance tests
8. **Report Generation**: Merge and generate comprehensive reports
9. **Cleanup**: Clean up test environment

#### Test Artifacts
- Test results and reports
- Screenshots and videos
- Performance metrics
- Accessibility reports

### Running Tests in CI

```bash
# Run tests with CI configuration
npm run test:e2e:ci
```

## Test Reports

### HTML Report

After running tests, generate an HTML report:

```bash
npm run test:e2e:report
```

This opens an interactive HTML report in your browser with:
- Test results and status
- Screenshots and videos
- Performance metrics
- Error details and stack traces

### JSON Report

For CI/CD integration, tests generate a JSON report:

```json
{
  "suites": [...],
  "specs": [...],
  "stats": {
    "duration": 12345,
    "expected": 100,
    "unexpected": 0,
    "flaky": 0
  }
}
```

### JUnit Report

For integration with CI/CD systems:

```xml
<testsuites>
  <testsuite name="User Workflow Tests" tests="10" failures="0">
    ...
  </testsuite>
</testsuites>
```

## Best Practices

### Test Organization

1. **Page Object Model**: Use page objects to encapsulate UI interactions
2. **Test Data**: Use consistent test data across tests
3. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)
4. **Test Naming**: Use descriptive test names that explain the scenario

### Test Writing

1. **Isolation**: Tests should be independent and not rely on each other
2. **Retry Logic**: Use built-in retry mechanisms for flaky operations
3. **Wait Strategies**: Use explicit waits instead of fixed timeouts
4. **Assertions**: Use specific assertions with clear error messages

### Performance Testing

1. **Baselines**: Establish performance baselines for comparison
2. **Thresholds**: Set realistic performance thresholds
3. **Metrics**: Collect comprehensive performance metrics
4. **Conditions**: Test under various network conditions

### Visual Testing

1. **Consistency**: Ensure consistent screenshot capture
2. **Thresholds**: Set appropriate visual difference thresholds
3. **Updates**: Update snapshots intentionally and review changes
4. **Coverage**: Cover all UI states and variations

### Accessibility Testing

1. **Standards**: Follow WCAG 2.1 AA guidelines
2. **Tools**: Use automated tools for initial validation
3. **Manual**: Supplement with manual testing for nuanced issues
4. **Assistive**: Test with actual assistive technology when possible

## Troubleshooting

### Common Issues

#### Test Timeout
- Increase timeout in test configuration
- Check for network delays
- Verify test environment stability

#### Element Not Found
- Verify selectors are correct
- Check for dynamic content loading
- Use appropriate wait strategies

#### Visual Test Failures
- Review visual differences
- Update snapshots if changes are intentional
- Check for rendering inconsistencies

#### Performance Test Failures
- Verify performance thresholds are realistic
- Check for environment factors
- Analyze performance metrics

### Debugging Tips

1. **Use Debug Mode**: Run tests with `--debug` flag
2. **Enable Tracing**: Use `--trace on` for detailed execution logs
3. **Headed Mode**: Run with `--headed` to see browser actions
4. **Screenshots**: Check screenshots for visual issues
5. **Videos**: Review videos for test execution flow

### Test Environment Issues

1. **Database**: Verify test database is running and seeded
2. **Services**: Check all required services are available
3. **Network**: Verify network connectivity and configuration
4. **Browsers**: Ensure browsers are installed and accessible

## Conclusion

This E2E testing framework provides comprehensive coverage of the AI Search platform's user workflows, ensuring high-quality, reliable, and accessible user experiences across all supported browsers and devices.

For questions or issues with the testing framework, please refer to the troubleshooting section or contact the development team.