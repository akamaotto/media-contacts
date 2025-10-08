/**
 * Tests for AI Validation Middleware
 */

import { NextRequest } from 'next/server';
import { AIValidationMiddleware, AISearchSchema, AIImportSchema } from '../validation';
import { ValidationError } from '../errors';

describe('AIValidationMiddleware', () => {
  describe('validate', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      mockRequest = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'test-correlation-id'
        },
        body: JSON.stringify({
          query: 'test query',
          maxResults: 10
        })
      });
    });

    it('should validate search request successfully', async () => {
      const result = await AIValidationMiddleware.validate(mockRequest, 'search');

      expect(result).toBe(mockRequest);
      expect((result as any).__validatedData).toBeDefined();
      expect((result as any).__validatedData.body.query).toBe('test query');
      expect((result as any).__validatedData.body.maxResults).toBe(10);
    });

    it('should validate import request successfully', async () => {
      const importRequest = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          searchId: '123e4567-e89b-12d3-a456-426614174000',
          contactIds: ['123e4567-e89b-12d3-a456-426614174001'],
          tags: ['test']
        })
      });

      const result = await AIValidationMiddleware.validate(importRequest, 'import');

      expect(result).toBe(importRequest);
      expect((result as any).__validatedData.body.searchId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect((result as any).__validatedData.body.contactIds).toHaveLength(1);
    });

    it('should reject invalid search query', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          query: '', // Empty query
          maxResults: 2000 // Too many results
        })
      });

      await expect(AIValidationMiddleware.validate(invalidRequest, 'search'))
        .rejects.toThrow(ValidationError);
    });

    it('should reject invalid content type', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain'
        },
        body: 'invalid data'
      });

      await expect(AIValidationMiddleware.validate(invalidRequest, 'search'))
        .rejects.toThrow(ValidationError);
    });

    it('should validate query parameters', async () => {
      const requestWithQuery = new NextRequest('http://localhost:3000/api/ai/search?page=2&pageSize=20', {
        method: 'GET',
        headers: {
          'content-type': 'application/json'
        }
      });

      const result = await AIValidationMiddleware.validate(requestWithQuery, 'search');

      expect((result as any).__validatedData.query.page).toBe(2);
      expect((result as any).__validatedData.query.pageSize).toBe(20);
    });

    it('should reject invalid query parameters', async () => {
      const requestWithInvalidQuery = new NextRequest('http://localhost:3000/api/ai/search?page=invalid', {
        method: 'GET',
        headers: {
          'content-type': 'application/json'
        }
      });

      await expect(AIValidationMiddleware.validate(requestWithInvalidQuery, 'search'))
        .rejects.toThrow(ValidationError);
    });

    it('should validate path parameters', async () => {
      const requestWithParams = new NextRequest('http://localhost:3000/api/ai/search/123e4567-e89b-12d3-a456-426614174000', {
        method: 'GET',
        headers: {
          'content-type': 'application/json'
        }
      });

      const result = await AIValidationMiddleware.validate(requestWithParams, 'search');

      expect((result as any).__validatedParams.searchId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid path parameters', async () => {
      const requestWithInvalidParams = new NextRequest('http://localhost:3000/api/ai/search/invalid-uuid', {
        method: 'GET',
        headers: {
          'content-type': 'application/json'
        }
      });

      await expect(AIValidationMiddleware.validate(requestWithInvalidParams, 'search'))
        .rejects.toThrow(ValidationError);
    });

    it('should validate headers', async () => {
      const requestWithHeaders = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '100',
          'x-correlation-id': 'valid-correlation-id'
        },
        body: JSON.stringify({ query: 'test' })
      });

      const result = await AIValidationMiddleware.validate(requestWithHeaders, 'search');

      expect(result).toBe(requestWithHeaders);
    });

    it('should reject oversized content', async () => {
      const requestWithOversizedContent = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '2147483648' // 2GB - too large
        }
      });

      await expect(AIValidationMiddleware.validate(requestWithOversizedContent, 'search'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate valid search query', () => {
      expect(() => AIValidationMiddleware.validateSearchQuery('test query')).not.toThrow();
    });

    it('should reject empty query', () => {
      expect(() => AIValidationMiddleware.validateSearchQuery(''))
        .toThrow(ValidationError);
    });

    it('should reject query with script tags', () => {
      expect(() => AIValidationMiddleware.validateSearchQuery('<script>alert("xss")</script>'))
        .toThrow(ValidationError);
    });

    it('should reject query with javascript protocol', () => {
      expect(() => AIValidationMiddleware.validateSearchQuery('javascript:alert("xss")'))
        .toThrow(ValidationError);
    });

    it('should reject query with event handlers', () => {
      expect(() => AIValidationMiddleware.validateSearchQuery('onclick=alert("xss")'))
        .toThrow(ValidationError);
    });

    it('should reject overly long query', () => {
      const longQuery = 'a'.repeat(1001);
      expect(() => AIValidationMiddleware.validateSearchQuery(longQuery))
        .toThrow(ValidationError);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate valid file upload', () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      expect(() => AIValidationMiddleware.validateFileUpload(mockFile)).not.toThrow();
    });

    it('should reject oversized file', () => {
      const mockFile = new File(['content'], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(mockFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      expect(() => AIValidationMiddleware.validateFileUpload(mockFile, 10 * 1024 * 1024))
        .toThrow(ValidationError);
    });

    it('should reject invalid file type', () => {
      const mockFile = new File(['content'], 'dangerous.exe', { type: 'application/x-executable' });
      expect(() => AIValidationMiddleware.validateFileUpload(mockFile))
        .toThrow(ValidationError);
    });

    it('should reject dangerous file extension', () => {
      const mockFile = new File(['content'], 'malware.exe', { type: 'application/octet-stream' });
      expect(() => AIValidationMiddleware.validateFileUpload(mockFile))
        .toThrow(ValidationError);
    });

    it('should reject overly long filename', () => {
      const longName = 'a'.repeat(256) + '.csv';
      const mockFile = new File(['content'], longName, { type: 'text/csv' });
      expect(() => AIValidationMiddleware.validateFileUpload(mockFile))
        .toThrow(ValidationError);
    });
  });

  describe('validateBatchOperation', () => {
    it('should validate valid batch operation', () => {
      const items = ['item1', 'item2', 'item3'];
      expect(() => AIValidationMiddleware.validateBatchOperation(items)).not.toThrow();
    });

    it('should reject empty batch', () => {
      expect(() => AIValidationMiddleware.validateBatchOperation([]))
        .toThrow(ValidationError);
    });

    it('should reject oversized batch', () => {
      const items = Array.from({ length: 101 }, (_, i) => `item${i}`);
      expect(() => AIValidationMiddleware.validateBatchOperation(items, 100))
        .toThrow(ValidationError);
    });

    it('should reject batch with null items', () => {
      const items = ['item1', null, 'item3'];
      expect(() => AIValidationMiddleware.validateBatchOperation(items))
        .toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize dangerous content', () => {
      const dangerous = '<script>alert("xss")</script>';
      const sanitized = AIValidationMiddleware.sanitizeInput(dangerous);
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove javascript protocol', () => {
      const dangerous = 'javascript:alert("xss")';
      const sanitized = AIValidationMiddleware.sanitizeInput(dangerous);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const dangerous = 'onclick=alert("xss")';
      const sanitized = AIValidationMiddleware.sanitizeInput(dangerous);
      expect(sanitized).not.toContain('onclick');
    });

    it('should limit length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = AIValidationMiddleware.sanitizeInput(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it('should handle non-string input', () => {
      expect(AIValidationMiddleware.sanitizeInput(123)).toBe('');
      expect(AIValidationMiddleware.sanitizeInput(null)).toBe('');
      expect(AIValidationMiddleware.sanitizeInput(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      const input = '  test query  ';
      const sanitized = AIValidationMiddleware.sanitizeInput(input);
      expect(sanitized).toBe('test query');
    });
  });
});

describe('Validation Schemas', () => {
  describe('AISearchSchema', () => {
    it('should validate valid search request', async () => {
      const validData = {
        query: 'test query',
        filters: {
          beats: ['beat1', 'beat2'],
          regions: ['region1']
        },
        maxResults: 50,
        priority: 'normal'
      };

      const result = await AISearchSchema.parseAsync(validData);
      expect(result.query).toBe('test query');
      expect(result.maxResults).toBe(50);
      expect(result.priority).toBe('normal');
    });

    it('should use default values', async () => {
      const minimalData = { query: 'test' };
      const result = await AISearchSchema.parseAsync(minimalData);
      expect(result.maxResults).toBe(50);
      expect(result.priority).toBe('normal');
    });

    it('should reject invalid data', async () => {
      const invalidData = {
        query: '',
        maxResults: 2000,
        priority: 'invalid'
      };

      await expect(AISearchSchema.parseAsync(invalidData)).rejects.toThrow();
    });
  });

  describe('AIImportSchema', () => {
    it('should validate valid import request', async () => {
      const validData = {
        searchId: '123e4567-e89b-12d3-a456-426614174000',
        contactIds: ['123e4567-e89b-12d3-a456-426614174001'],
        targetLists: ['123e4567-e89b-12d3-a456-426614174002'],
        tags: ['test']
      };

      const result = await AIImportSchema.parseAsync(validData);
      expect(result.searchId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.contactIds).toHaveLength(1);
    });

    it('should reject invalid UUID', async () => {
      const invalidData = {
        searchId: 'invalid-uuid',
        contactIds: ['123e4567-e89b-12d3-a456-426614174001']
      };

      await expect(AIImportSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should reject empty contact IDs', async () => {
      const invalidData = {
        searchId: '123e4567-e89b-12d3-a456-426614174000',
        contactIds: []
      };

      await expect(AIImportSchema.parseAsync(invalidData)).rejects.toThrow();
    });
  });
});