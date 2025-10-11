/**
 * Custom Jest Matchers for Integration Testing
 * Provides specialized matchers for API responses, database operations, and integration scenarios
 */

import { expect, jest } from '@jest/globals';

// Custom matcher type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if a value is a valid API response
       */
      toBeValidAPIResponse(): R;

      /**
       * Checks if a value is a valid search response
       */
      toBeValidSearchResponse(): R;

      /**
       * Checks if an array contains valid contact objects
       */
      toContainValidContacts(): R;

      /**
       * Checks if a response has rate limiting information
       */
      toHaveRateLimitInfo(): R;

      /**
       * Checks if a value is a valid database record
       */
      toBeValidDatabaseRecord(): R;

      /**
       * Checks if a response has proper pagination
       */
      toHaveValidPagination(): R;

      /**
       * Checks if a timestamp is recent (within last minute)
       */
      toBeRecent(): R;

      /**
       * Checks if an error response has proper structure
       */
      toBeValidErrorResponse(): R;

      /**
       * Checks if a response has correlation ID
       */
      toHaveCorrelationId(): R;

      /**
       * Checks if search results are properly sorted by relevance
       */
      toBeSortedByRelevance(): R;

      /**
       * Checks if contact extraction was successful
       */
      toHaveSuccessfulContactExtraction(): R;

      /**
       * Checks if a response has proper caching headers
       */
      toHaveCacheHeaders(): R;

      /**
       * Checks if external API calls were made correctly
       */
      toHaveMadeExternalAPICalls(): R;
    }
  }
}

// Helper functions
const isValidTimestamp = (timestamp: string): boolean => {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.getTime() > 0;
};

const isRecent = (timestamp: string, maxAgeMinutes = 1): boolean => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  return diffMinutes <= maxAgeMinutes;
};

const validateContactStructure = (contact: any): boolean => {
  return (
    contact &&
    typeof contact === 'object' &&
    typeof contact.name === 'string' &&
    contact.name.trim().length > 0 &&
    typeof contact.email === 'string' &&
    contact.email.includes('@') &&
    typeof contact.confidence === 'number' &&
    contact.confidence >= 0 &&
    contact.confidence <= 1
  );
};

// Custom matcher implementations
expect.extend({
  toBeValidAPIResponse(received: any) {
    const isValid = (
      received &&
      typeof received === 'object' &&
      typeof received.success === 'boolean' &&
      received.timestamp &&
      isValidTimestamp(received.timestamp) &&
      received.correlationId &&
      typeof received.correlationId === 'string' &&
      (received.success ? received.data !== undefined : received.error !== undefined)
    );

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid API response with success, timestamp, correlationId, and data/error fields`,
        pass: false,
      };
    }
  },

  toBeValidSearchResponse(received: any) {
    const isValid = (
      received &&
      typeof received === 'object' &&
      typeof received.searchId === 'string' &&
      received.searchId.length > 0 &&
      typeof received.status === 'string' &&
      ['processing', 'completed', 'failed'].includes(received.status) &&
      typeof received.progress === 'number' &&
      received.progress >= 0 &&
      received.progress <= 100 &&
      Array.isArray(received.results) &&
      isValidTimestamp(received.createdAt) &&
      isValidTimestamp(received.updatedAt)
    );

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid search response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid search response with searchId, status, progress, results, createdAt, and updatedAt fields`,
        pass: false,
      };
    }
  },

  toContainValidContacts(received: any[]) {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }

    if (received.length === 0) {
      return {
        message: () => `expected ${received} to contain at least one contact`,
        pass: false,
      };
    }

    const allValid = received.every(validateContactStructure);

    if (allValid) {
      return {
        message: () => `expected ${received} not to contain only valid contacts`,
        pass: true,
      };
    } else {
      const invalidContacts = received.filter(contact => !validateContactStructure(contact));
      return {
        message: () => `expected ${received} to contain only valid contacts. Found ${invalidContacts.length} invalid contacts.`,
        pass: false,
      };
    }
  },

  toHaveRateLimitInfo(received: any) {
    const hasRateLimit = (
      received &&
      received.rateLimit &&
      typeof received.rateLimit === 'object' &&
      typeof received.rateLimit.limit === 'number' &&
      received.rateLimit.limit > 0 &&
      typeof received.rateLimit.remaining === 'number' &&
      received.rateLimit.remaining >= 0 &&
      typeof received.rateLimit.resetTime === 'string' &&
      isValidTimestamp(received.rateLimit.resetTime)
    );

    if (hasRateLimit) {
      return {
        message: () => `expected ${received} not to have rate limit information`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have rate limit information with limit, remaining, and resetTime fields`,
        pass: false,
      };
    }
  },

  toBeValidDatabaseRecord(received: any) {
    const isValid = (
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      received.id.length > 0 &&
      isValidTimestamp(received.createdAt) &&
      isValidTimestamp(received.updatedAt)
    );

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid database record`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid database record with id, createdAt, and updatedAt fields`,
        pass: false,
      };
    }
  },

  toHaveValidPagination(received: any) {
    const hasValidPagination = (
      received &&
      received.pagination &&
      typeof received.pagination === 'object' &&
      typeof received.pagination.page === 'number' &&
      received.pagination.page >= 1 &&
      typeof received.pagination.limit === 'number' &&
      received.pagination.limit > 0 &&
      typeof received.pagination.total === 'number' &&
      received.pagination.total >= 0 &&
      typeof received.pagination.totalPages === 'number' &&
      received.pagination.totalPages >= 0 &&
      typeof received.pagination.hasNext === 'boolean' &&
      typeof received.pagination.hasPrev === 'boolean'
    );

    if (hasValidPagination) {
      return {
        message: () => `expected ${received} not to have valid pagination`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid pagination with page, limit, total, totalPages, hasNext, and hasPrev fields`,
        pass: false,
      };
    }
  },

  toBeRecent(received: string) {
    const isRecentTimestamp = isRecent(received);

    if (isRecentTimestamp) {
      return {
        message: () => `expected ${received} not to be recent`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a recent timestamp (within last minute)`,
        pass: false,
      };
    }
  },

  toBeValidErrorResponse(received: any) {
    const isValid = (
      received &&
      typeof received === 'object' &&
      received.success === false &&
      typeof received.error === 'string' &&
      received.error.length > 0 &&
      received.timestamp &&
      isValidTimestamp(received.timestamp) &&
      received.correlationId &&
      typeof received.correlationId === 'string'
    );

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid error response with success=false, error message, timestamp, and correlationId`,
        pass: false,
      };
    }
  },

  toHaveCorrelationId(received: any) {
    const hasCorrelationId = (
      received &&
      typeof received.correlationId === 'string' &&
      received.correlationId.length > 0 &&
      /^[a-f0-9-]{36}$/i.test(received.correlationId) // UUID format
    );

    if (hasCorrelationId) {
      return {
        message: () => `expected ${received} not to have a correlation ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have a valid correlation ID (UUID format)`,
        pass: false,
      };
    }
  },

  toBeSortedByRelevance(received: any[]) {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }

    const isSorted = received.every((item, index) => {
      if (index === 0) return true;
      const prevItem = received[index - 1];
      return (
        (item.relevanceScore || item.confidence || 0) <=
        (prevItem.relevanceScore || prevItem.confidence || 0)
      );
    });

    if (isSorted) {
      return {
        message: () => `expected ${received} not to be sorted by relevance`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be sorted by relevance/confidence in descending order`,
        pass: false,
      };
    }
  },

  toHaveSuccessfulContactExtraction(received: any) {
    const isSuccessful = (
      received &&
      typeof received.extractionStatus === 'string' &&
      received.extractionStatus === 'completed' &&
      typeof received.totalContacts === 'number' &&
      received.totalContacts >= 0 &&
      typeof received.extractedContacts === 'number' &&
      received.extractedContacts >= 0 &&
      typeof received.averageConfidence === 'number' &&
      received.averageConfidence >= 0 &&
      received.averageConfidence <= 1
    );

    if (isSuccessful) {
      return {
        message: () => `expected ${received} not to have successful contact extraction`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have successful contact extraction with extractionStatus, totalContacts, extractedContacts, and averageConfidence fields`,
        pass: false,
      };
    }
  },

  toHaveCacheHeaders(received: Response) {
    const hasCacheHeaders = (
      received &&
      received.headers &&
      (received.headers.get('cache-control') || received.headers.get('Cache-Control')) &&
      (received.headers.get('etag') || received.headers.get('ETag'))
    );

    if (hasCacheHeaders) {
      return {
        message: () => `expected response not to have cache headers`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have cache-control and etag headers`,
        pass: false,
      };
    }
  },

  toHaveMadeExternalAPICalls(received: any) {
    const hasMadeCalls = (
      received &&
      Array.isArray(received.externalCalls) &&
      received.externalCalls.length > 0 &&
      received.externalCalls.every((call: any) => (
        call.service &&
        call.endpoint &&
        call.timestamp &&
        call.status
      ))
    );

    if (hasMadeCalls) {
      return {
        message: () => `expected ${received} not to have made external API calls`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have made external API calls with service, endpoint, timestamp, and status information`,
        pass: false,
      };
    }
  }
});

export default expect;