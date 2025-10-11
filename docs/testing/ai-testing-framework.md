# AI Search Testing Framework Documentation

## Overview

This document provides comprehensive guidance for testing the AI-powered search functionality in the Media Contacts application. The testing framework is designed to ensure >90% code coverage, maintainable tests, and reliable CI/CD integration.

## Architecture

### Test Configuration Files

- **`config/jest.ai.config.js`**: Main Jest configuration for AI-specific tests
- **`jest.setup.ts`**: Global test setup and polyfills
- **`src/__tests__/setup/ai-test-setup.ts`**: AI-specific test setup and mocks
- **`src/__tests__/setup/global-setup.ts`**: Global test environment setup
- **`src/__tests__/setup/global-teardown.ts`**: Global test environment cleanup

### Test Organization

```
src/
├── __tests__/
│   ├── setup/           # Test setup and configuration
│   ├── utils/           # Test utilities and helpers
│   ├── mocks/           # Mock services and data
│   └── fixtures/        # Test data fixtures
├── lib/ai/
│   └── **/              # AI service tests alongside implementation
└── app/api/ai/
    └── **/              # API controller tests alongside implementation
```

## Test Scripts

### Available NPM Scripts

```bash
# Run all AI tests
npm run test:ai

# Run AI tests in watch mode
npm run test:ai:watch

# Run AI tests with coverage report
npm run test:ai:coverage

# Run tests with verbose output
npm run test:ai:verbose

# Run tests for specific modules
npm run test:query-generation
npm run test:contact-extraction
npm run test:search-orchestration
npm run test:ai-controllers
```

## Testing Standards

### Code Coverage Requirements

- **Global Coverage**: >90% for branches, functions, lines, and statements
- **AI Services**: >95% coverage for critical service components
- **Query Generation**: >90% coverage
- **Contact Extraction**: >90% coverage
- **Search Orchestration**: >90% coverage

### Test Structure Guidelines

#### 1. Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

#### 2. Test Organization
```typescript
describe('ComponentName', () => {
  describe('methodGroupName', () => {
    it('should do something specific', async () => {
      // Arrange - Setup test data and mocks

      // Act - Execute the method being tested

      // Assert - Verify expected outcomes
    });
  });
});
```

#### 3. Test Patterns
- **Arrange-Act-Assert**: Structure tests clearly
- **Given-When-Then**: For behavior-driven tests
- **Mock-When-Verify**: For dependency testing

## Mock Services

### AI Service Mocks

Located in `src/__tests__/mocks/ai-services.mock.ts`:

```typescript
import { setupMockServices, configureMockBehavior } from '@/tests/mocks/ai-services.mock';

// Setup all mocks
const mocks = setupMockServices();

// Configure specific behavior
configureMockBehavior('openai', 'success');
configureMockBehavior('anthropic', 'error', 'rateLimit');
```

### Available Mocks

1. **OpenAI Mock**: Simulates GPT-4 responses
2. **Anthropic Mock**: Simulates Claude-3 responses
3. **Exa Search Mock**: Simulates search results
4. **Firecrawl Mock**: Simulates web scraping
5. **Redis Mock**: Simulates caching operations
6. **Fetch Mock**: Simulates HTTP requests

## Test Utilities

### Helper Functions

Located in `src/__tests__/utils/test-helpers.ts`:

```typescript
import {
  createMockQueryGenerationRequest,
  createMockContactExtractionRequest,
  createMockMediaContact,
  createMockGeneratedQuery,
  createMockPrismaClient
} from '@/tests/utils/test-helpers';
```

### Performance Tracking

```typescript
import { PerformanceTracker } from '@/tests/utils/test-helpers';

const tracker = new PerformanceTracker();
tracker.start('operation');
// ... perform operation
tracker.end('operation');
tracker.assertMaxDuration('operation', 1000);
```

## Test Data Fixtures

### Available Fixtures

Located in `src/__tests__/fixtures/test-data.fixtures.ts`:

1. **Query Templates**: Pre-defined templates for various scenarios
2. **Media Contacts**: Sample contact data with different attributes
3. **Search Requests**: Typical and edge-case search configurations
4. **Content Data**: Sample web content for extraction testing
5. **Error Scenarios**: Data for testing error handling

### Using Fixtures

```typescript
import { mediaContactFixtures, searchRequestFixtures } from '@/tests/fixtures/test-data.fixtures';

const contact = getRandomFixture(mediaContactFixtures.basicContacts);
const request = getRandomFixture(searchRequestFixtures.complexRequests);
```

## API Testing

### Controller Test Structure

```typescript
import { createMockRequest, createMockResponse } from '@/tests/utils/test-helpers';

describe('API Controller', () => {
  it('should handle POST /api/ai/search', async () => {
    const req = createMockRequest({
      body: { query: 'test', criteria: {} }
    });
    const res = createMockResponse();

    await controller.handleSearch(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.any(Array)
    }));
  });
});
```

### Error Testing

```typescript
it('should handle validation errors', async () => {
  const req = createMockRequest({ body: {} }); // Invalid data
  const res = createMockResponse();

  await controller.handleSearch(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.stringContaining('validation')
  }));
});
```

## Integration Testing

### Database Integration

```typescript
beforeEach(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await cleanupTestDatabase();
});

it('should integrate with database', async () => {
  const result = await service.saveToDatabase(mockData);
  expect(result).toBeDefined();

  const saved = await prisma.table.findUnique({ where: { id: result.id } });
  expect(saved).toEqual(expect.objectContaining(mockData));
});
```

### Service Integration

```typescript
it('should orchestrate multiple AI services', async () => {
  configureMockBehavior('openai', 'success');
  configureMockBehavior('exa', 'success');
  configureMockBehavior('firecrawl', 'success');

  const result = await orchestrationService.execute(request);

  expect(result).toHaveProperty('queries');
  expect(result).toHaveProperty('contacts');
  expect(result).toHaveProperty('metadata');
});
```

## Performance Testing

### Response Time Testing

```typescript
it('should complete within time limits', async () => {
  const startTime = Date.now();

  await service.process(request);

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000); // 5 seconds max
});
```

### Load Testing

```typescript
it('should handle concurrent requests', async () => {
  const requests = Array.from({ length: 10 }, () => createMockRequest());

  const results = await Promise.all(
    requests.map(req => service.process(req))
  );

  expect(results).toHaveLength(10);
  expect(results.every(r => r.success)).toBe(true);
});
```

## Error Handling Testing

### Service Failures

```typescript
it('should handle AI service failures gracefully', async () => {
  configureMockBehavior('openai', 'error', 'rateLimit');

  const result = await service.process(request);

  expect(result.success).toBe(false);
  expect(result.fallbackUsed).toBe(true);
  expect(result.errors).toContain('AI service rate limited');
});
```

### Network Issues

```typescript
it('should handle network timeouts', async () => {
  configureMockBehavior('openai', 'timeout');

  const result = await service.process(request);

  expect(result.success).toBe(false);
  expect(result.metadata.timeout).toBe(true);
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: AI Tests
on: [push, pull_request]

jobs:
  test-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ai:coverage
      - uses: codecov/codecov-action@v3
```

### Coverage Requirements

- Minimum coverage thresholds enforced in Jest config
- Coverage reports uploaded to Codecov
- Failures on coverage regressions

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use proper setup/teardown
- Avoid shared state between tests

### 2. Mock Management
- Mock external dependencies
- Use consistent mock data
- Reset mocks between tests

### 3. Error Testing
- Test all error paths
- Verify error messages
- Test recovery mechanisms

### 4. Performance Testing
- Include timing assertions
- Test with realistic data sizes
- Monitor memory usage

### 5. Documentation
- Document complex test scenarios
- Explain mock behavior
- Include test data examples

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**
   - Check Jest moduleNameMapper configuration
   - Verify file paths in imports
   - Ensure TypeScript configuration matches

2. **Mock Conflicts**
   - Clear mocks in beforeEach
   - Use unique mock data
   - Avoid global state in mocks

3. **Timeout Errors**
   - Increase test timeout for slow operations
   - Optimize test data size
   - Check for async issues

4. **Coverage Gaps**
   - Identify uncovered lines in coverage report
   - Add tests for edge cases
   - Review error handling paths

### Debugging Tips

```typescript
// Use console.log for debugging (removed in production)
console.log('Test data:', testData);

// Use Jest debuggers
expect(result).toBeDefined();

// Add detailed assertions
expect(result).toEqual(expect.objectContaining({
  expectedProperty: expectedValue
}));
```

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Add UI component testing
2. **Contract Testing**: API contract verification
3. **Chaos Testing**: Failure injection testing
4. **Load Testing**: Automated performance testing
5. **Security Testing**: Input validation and security scanning

### Tooling Upgrades

1. **Test Reporting**: Enhanced test reports
2. **Performance Monitoring**: Real-time performance metrics
3. **Parallel Testing**: Optimized test execution
4. **Smart Mocking**: AI-powered test data generation

## Conclusion

This testing framework provides comprehensive coverage for the AI search functionality while maintaining test quality and developer productivity. Regular maintenance and updates ensure the framework continues to meet the evolving needs of the application.

For questions or contributions to the testing framework, please refer to the development team or create an issue in the project repository.