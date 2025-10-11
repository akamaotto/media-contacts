# AI Search Integration Testing Guide

## Overview

This guide provides comprehensive documentation for the integration testing framework implemented for the AI Search system. The integration tests verify the end-to-end functionality of all AI search components, including API endpoints, database operations, external service integrations, and real-time communications.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Test Categories](#test-categories)
3. [Running Tests](#running-tests)
4. [Test Configuration](#test-configuration)
5. [Test Data Management](#test-data-management)
6. [Mock Services](#mock-services)
7. [CI/CD Integration](#cicd-integration)
8. [Coverage Requirements](#coverage-requirements)
9. [Troubleshooting](#troubleshooting)

## Test Structure

The integration tests are organized in the following directory structure:

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
└── config/                       # Test configuration
    └── test-config.ts
```

## Test Categories

### 1. API Endpoint Integration Tests

These tests verify the complete request/response cycle for all AI search API endpoints:

- **AI Search Endpoints** (`ai-search-endpoints.test.ts`)
  - Search submission and retrieval
  - Filter handling
  - Error handling and validation
  - Rate limiting
  - Authentication and authorization

- **AI Search Orchestration Endpoints** (`ai-search-orchestration-endpoints.test.ts`)
  - Search orchestration submission
  - Progress tracking
  - Search cancellation
  - Health status monitoring
  - Statistics retrieval

- **AI Contact Extraction Endpoints** (`ai-contact-extraction-endpoints.test.ts`)
  - Contact extraction submission
  - Job status tracking
  - Result retrieval
  - Job management (cancel, retry)
  - Health and statistics

- **AI Query Generation Endpoints** (`ai-query-generation-endpoints.test.ts`)
  - Query enhancement submission
  - Template statistics
  - Service configuration
  - Quality validation

- **AI Import/Export Endpoints** (`ai-import-export-endpoints.test.ts`)
  - Contact import submission
  - Import status tracking
  - Result retrieval
  - Import cancellation
  - Statistics retrieval

### 2. Database Integration Tests

These tests verify database operations, data persistence, and transaction management:

- **Search Query Operations**
  - Creation and retrieval
  - Updates and deletion
  - Complex filter handling

- **AI Search Operations**
  - Search creation and status updates
  - Progress tracking
  - Result associations

- **Contact Operations**
  - Contact creation and updates
  - Search and filtering
  - Data validation

- **Transaction Management**
  - Complex transactions with multiple operations
  - Rollback on errors
  - Concurrent transaction handling

- **Data Consistency and Integrity**
  - Referential integrity
  - Cascade operations
  - Unique constraints

### 3. External Service Integration Tests

These tests verify integration with external AI services using comprehensive mocks:

- **OpenAI Service Integration**
  - API response handling
  - Error handling
  - Rate limiting

- **Anthropic Service Integration**
  - API response handling
  - Error handling

- **Exa Service Integration**
  - Search response handling
  - Error handling
  - Rate limiting

- **Firecrawl Service Integration**
  - Scraping response handling
  - Error handling
  - Rate limiting

- **Multi-Service Integration**
  - Operations across multiple services
  - Cascading failures
  - Service health monitoring

### 4. Real-time Communication Tests

These tests verify WebSocket and Server-Sent Events (SSE) functionality:

- **WebSocket Connection Management**
  - Connection establishment
  - Error handling
  - Disconnection

- **Search Progress Updates via WebSocket**
  - Real-time progress updates
  - Search cancellation
  - Data integrity

- **Server-Sent Events (SSE)**
  - SSE connection establishment
  - Progress updates
  - Error handling

- **Concurrent Connections**
  - Multiple WebSocket connections
  - Multiple SSE connections

- **Real-time Data Integrity**
  - Data consistency in updates
  - Malformed message handling

## Running Tests

### Prerequisites

1. Node.js 18 or higher
2. PostgreSQL 15 or higher
3. Redis 7 or higher
4. Test environment variables configured

### Local Development

To run all integration tests locally:

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

### Docker Environment

To run tests in a Docker environment:

```bash
# Build the test environment
docker-compose -f docker-compose.test.yml build

# Run tests
docker-compose -f docker-compose.test.yml run --rm app npm run test:integration

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

## Test Configuration

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

The integration tests use a custom Jest configuration:

```javascript
// jest.integration.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__/integration'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
  testTimeout: 300000,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Test Data Management

### Data Generators

The test framework provides utilities for generating test data:

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

### Data Cleanup

The test framework automatically cleans up created test data:

```typescript
// In test setup
beforeEach(async () => {
  await testDataManager.cleanupAll();
});

// In test teardown
afterEach(async () => {
  await testDataManager.cleanupAll();
});
```

## Mock Services

### External Service Mocks

The integration tests use comprehensive mocks for external services:

```typescript
// Mock OpenAI service
jest.mock('@/lib/ai/services/openai', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateQueryEnhancements: jest.fn().mockResolvedValue(mockResponse),
    extractContacts: jest.fn().mockResolvedValue(mockResponse)
  }))
}));

// Mock Exa service
jest.mock('@/lib/ai/services/exa', () => ({
  ExaService: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue(mockResponse)
  }))
}));
```

### WebSocket Mocks

For real-time communication tests, the framework uses WebSocket mocks:

```typescript
import { Server } from 'mock-socket';

// Set up mock WebSocket server
const mockServer = new Server('ws://localhost:8080');

// Add event handlers
mockServer.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Handle message
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow

The integration tests are integrated into the CI/CD pipeline:

```yaml
# .github/workflows/integration-tests.yml
name: AI Search Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  setup-test-environment:
    # Setup test environment
    runs-on: ubuntu-latest
    services:
      postgres:
        # PostgreSQL service
      redis:
        # Redis service
    steps:
      # Setup steps

  run-api-integration-tests:
    # Run API integration tests
    needs: setup-test-environment
    steps:
      # Test steps

  # Additional test jobs...
```

### Test Results Reporting

The CI/CD pipeline generates and reports test results:

- Test execution summaries
- Coverage reports
- PR comments with test results
- Coverage badges

## Coverage Requirements

The integration tests must meet the following coverage requirements:

- **Overall Coverage**: 80% minimum
- **Branch Coverage**: 80% minimum
- **Function Coverage**: 80% minimum
- **Line Coverage**: 80% minimum
- **Statement Coverage**: 80% minimum

Coverage is calculated across all integration test files and includes:

- API endpoint handlers
- Database operations
- External service integrations
- Real-time communication handlers
- Error handling paths

## Troubleshooting

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

### Test Isolation

Each test should be isolated and not depend on other tests:

```typescript
describe('Test Suite', () => {
  beforeEach(async () => {
    // Set up test environment
    await testDataManager.cleanupAll();
  });

  afterEach(async () => {
    // Clean up test environment
    await testDataManager.cleanupAll();
  });

  it('should run in isolation', async () => {
    // Test implementation
  });
});
```

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests.
2. **Data Cleanup**: Always clean up test data after each test.
3. **Mock Consistency**: Ensure mocks are consistent with actual service behavior.
4. **Error Coverage**: Test both success and error scenarios.
5. **Edge Cases**: Include tests for edge cases and boundary conditions.
6. **Performance**: Monitor test execution time and optimize slow tests.
7. **Documentation**: Document complex test scenarios and setup requirements.

## Conclusion

The AI Search integration testing framework provides comprehensive coverage of all system components, ensuring reliability and correctness of the AI Search functionality. By following this guide, developers can effectively run, maintain, and extend the integration tests as the system evolves.