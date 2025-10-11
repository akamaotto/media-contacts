# AI Search Integration Testing Framework

This directory contains the comprehensive integration testing framework for the AI Search system. The framework tests the complete end-to-end functionality of all AI search components, ensuring reliability and correctness of the system.

## 📁 Directory Structure

```
src/__tests__/integration/
├── api/                          # API endpoint integration tests
│   ├── ai-search-endpoints.test.ts
│   ├── ai-search-orchestration-endpoints.test.ts
│   ├── ai-contact-extraction-endpoints.test.ts
│   ├── ai-query-generation-endpoints.test.ts
│   └── ai-import-export-endpoints.test.ts
├── database/                     # Database integration tests
│   └── ai-search-operations-integration.test.ts
├── external-services/            # External service integration tests
│   └── ai-services-mock-integration.test.ts
├── real-time/                    # Real-time communication tests
│   └── websocket-sse-integration.test.ts
├── utils/                        # Test utilities and helpers
│   └── test-data-management.ts
├── scripts/                      # Test runner scripts
│   └── run-integration-tests.js
├── config/                       # Test configuration
│   └── test-config.ts
├── setup.ts                      # Global test setup
├── jest.integration.config.js    # Jest configuration for integration tests
└── README.md                     # This file
```

## 🧪 Test Categories

### 1. API Endpoint Integration Tests

These tests verify the complete request/response cycle for all AI search API endpoints:

- **AI Search Endpoints**: Search submission, retrieval, filtering, error handling
- **AI Search Orchestration**: Search orchestration, progress tracking, cancellation
- **AI Contact Extraction**: Contact extraction, job management, result retrieval
- **AI Query Generation**: Query enhancement, template statistics, service configuration
- **AI Import/Export**: Contact import, status tracking, result retrieval

### 2. Database Integration Tests

These tests verify database operations, data persistence, and transaction management:

- **Search Query Operations**: Creation, retrieval, updates, deletion, complex filters
- **AI Search Operations**: Search creation, status updates, progress tracking, result associations
- **Contact Operations**: Contact creation, updates, search, filtering, data validation
- **Transaction Management**: Complex transactions, rollback, concurrent transactions
- **Data Consistency**: Referential integrity, cascade operations, unique constraints

### 3. External Service Integration Tests

These tests verify integration with external AI services using comprehensive mocks:

- **OpenAI Service**: API response handling, error handling, rate limiting
- **Anthropic Service**: API response handling, error handling
- **Exa Service**: Search response handling, error handling, rate limiting
- **Firecrawl Service**: Scraping response handling, error handling, rate limiting
- **Multi-Service Integration**: Operations across multiple services, cascading failures

### 4. Real-time Communication Tests

These tests verify WebSocket and Server-Sent Events (SSE) functionality:

- **WebSocket Connection**: Connection establishment, error handling, disconnection
- **Search Progress Updates**: Real-time progress updates, search cancellation
- **Server-Sent Events**: SSE connection, progress updates, error handling
- **Concurrent Connections**: Multiple WebSocket and SSE connections
- **Data Integrity**: Data consistency in updates, malformed message handling

## 🛠️ Test Utilities

### Data Management

The framework provides comprehensive test data management utilities:

```typescript
import { testDataGenerator, testDataManager, testFixtures } from '../utils/test-data-management';

// Generate individual test data
const searchQuery = testDataGenerator.generateSearchQueryData();
const contact = testDataGenerator.generateContactData();

// Create and manage test data
const dataManager = new TestDataManager();
const createdQuery = await dataManager.createSearchQuery();
const createdContacts = await dataManager.createContactsBatch(5);

// Clean up created data
await dataManager.cleanupAll();

// Use predefined test fixtures
const basicScenario = await testFixtures.createBasicSearchScenario();
const complexScenario = await testFixtures.createComplexSearchScenario();
```

### Custom Matchers

The framework includes custom Jest matchers for common assertions:

```typescript
// Check if response is a valid API response
expect(response).toBeValidAPIResponse();

// Check if response is a valid error response
expect(response).toBeValidErrorResponse();

// Check if response has a correlation ID
expect(response).toHaveCorrelationId();

// Check if timestamp is recent
expect(response.timestamp).toBeRecent();

// Check if contact data is valid
expect(response.contacts).toContainValidContacts();
```

## 🚀 Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Set up test environment
cp .env.example .env.test
# Edit .env.test with appropriate values

# Set up test database
npx prisma db push
npx prisma db seed

# Run all integration tests
npm run test:integration

# Run specific test categories
npm run test:integration:api
npm run test:integration:database
npm run test:integration:external
npm run test:integration:realtime

# Run tests with coverage
npm run test:integration:coverage

# Run tests with custom options
node src/__tests__/integration/scripts/run-integration-tests.js --verbose --coverage-threshold 85
```

### CI/CD Integration

The integration tests are integrated into the CI/CD pipeline and run automatically on:

- Push to main/develop branches
- Pull requests to main/develop branches
- Daily schedule (2 AM UTC)

## 📊 Coverage Requirements

The integration tests must meet the following coverage requirements:

- **Overall Coverage**: 80% minimum
- **Branch Coverage**: 80% minimum
- **Function Coverage**: 80% minimum
- **Line Coverage**: 80% minimum
- **Statement Coverage**: 80% minimum

## 🔧 Configuration

### Environment Variables

The integration tests require the following environment variables:

```bash
# Database
DATABASE_URL=postgresql://test:test@localhost:5432/media_contacts_test
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/media_contacts_test

# Redis
REDIS_URL=redis://localhost:6379/1

# Authentication
NEXTAUTH_SECRET=test-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# External Services (use test keys)
OPENAI_API_KEY=sk-test-openai-key
ANTHROPIC_API_KEY=sk-ant-test-anthropic-key
EXA_API_KEY=test-exa-key
FIRECRAWL_API_KEY=test-firecrawl-key

# Logging
LOG_LEVEL=error
AI_LOG_LEVEL=error
```

### Jest Configuration

The integration tests use a custom Jest configuration defined in `jest.integration.config.js`.

## 📝 Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests.
2. **Data Cleanup**: Always clean up test data after each test.
3. **Mock Consistency**: Ensure mocks are consistent with actual service behavior.
4. **Error Coverage**: Test both success and error scenarios.
5. **Edge Cases**: Include tests for edge cases and boundary conditions.
6. **Performance**: Monitor test execution time and optimize slow tests.
7. **Documentation**: Document complex test scenarios and setup requirements.

## 🔍 Test Examples

### API Endpoint Test Example

```typescript
describe('POST /api/ai/search', () => {
  it('should submit a search request successfully', async () => {
    // Arrange
    const searchRequest = {
      query: 'AI technology journalists',
      filters: {
        beats: ['technology', 'AI'],
        regions: ['US']
      },
      options: {
        maxResults: 10,
        includeSummaries: true
      }
    };

    const request = new NextRequest('http://localhost:3000/api/ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`,
        'X-Correlation-ID': global.testUtils.createCorrelationId()
      },
      body: JSON.stringify(searchRequest)
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(202);
    expect(data).toBeValidAPIResponse();
    expect(data.success).toBe(true);
    expect(data.data.searchId).toBeDefined();
    expect(data).toHaveCorrelationId();
  });
});
```

### Database Integration Test Example

```typescript
describe('Search Query Operations', () => {
  it('should create and retrieve search queries', async () => {
    // Arrange
    const searchQueryData = {
      query: 'AI technology journalists',
      filters: {
        beats: ['technology', 'AI'],
        regions: ['US']
      },
      userId: 'test-user-id',
      status: 'active'
    };

    // Act
    const createdQuery = await prisma.searchQuery.create({
      data: {
        ...searchQueryData,
        filters: searchQueryData.filters as any
      }
    });

    const retrievedQuery = await prisma.searchQuery.findUnique({
      where: { id: createdQuery.id }
    });

    // Assert
    expect(createdQuery).toBeDefined();
    expect(createdQuery.id).toBeDefined();
    expect(createdQuery.query).toBe(searchQueryData.query);
    expect(retrievedQuery).toBeDefined();
    expect(retrievedQuery.id).toBe(createdQuery.id);
    expect(retrievedQuery.filters).toEqual(searchQueryData.filters);
  });
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check database connection string
   - Verify database exists and is accessible

2. **Redis Connection Errors**
   - Ensure Redis is running
   - Check Redis connection string
   - Verify Redis is accessible

3. **External Service Timeouts**
   - Increase test timeout
   - Check mock service configuration
   - Verify network connectivity

4. **Test Data Cleanup Issues**
   - Ensure proper cleanup in test teardown
   - Check for foreign key constraints
   - Verify transaction management

5. **WebSocket Connection Issues**
   - Ensure mock WebSocket server is running
   - Check WebSocket URL configuration
   - Verify connection handling

### Debug Mode

To run tests in debug mode:

```bash
# Run with verbose output
node src/__tests__/integration/scripts/run-integration-tests.js --verbose

# Run with increased timeout
node src/__tests__/integration/scripts/run-integration-tests.js --timeout 600000

# Run without coverage for faster execution
node src/__tests__/integration/scripts/run-integration-tests.js --no-coverage
```

## 📚 Additional Resources

- [Integration Testing Guide](../../../docs/integration-testing-guide.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Prisma Testing Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/testing)
- [Next.js Testing Documentation](https://nextjs.org/docs/testing)

## 🤝 Contributing

When adding new integration tests:

1. Follow the existing directory structure and naming conventions
2. Use the provided test utilities and data management functions
3. Include both success and error scenarios
4. Ensure proper test data cleanup
5. Add appropriate documentation for complex test scenarios
6. Verify that coverage requirements are met

## 📄 License

This integration testing framework is part of the AI Search platform and follows the same license terms.