/**
 * Unit Tests for AI Security Manager
 */

import { aiSecurityManager, AISecurityManager } from '../security/index';

// Reset singleton before each test
beforeEach(() => {
  // @ts-ignore - Accessing private property for testing
  AISecurityManager.instance = null;
});

describe('AISecurityManager', () => {
  describe('PII Detection and Redaction', () => {
    it('should detect and redact email addresses', () => {
      const text = 'Contact john.doe@example.com for more information';
      const result = aiSecurityManager.detectAndRedactPII(text);

      expect(result.piiCount).toBe(1);
      expect(result.piiTypes).toContain('email');
      expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
      expect(result.redactedContent).not.toContain('john.doe@example.com');
    });

    it('should detect and redact phone numbers', () => {
      const text = 'Call us at (555) 123-4567 or +1-555-987-6543';
      const result = aiSecurityManager.detectAndRedactPII(text);

      expect(result.piiCount).toBe(2);
      expect(result.piiTypes).toContain('phone');
      expect(result.redactedContent).toContain('[PHONE_REDACTED]');
      expect(result.redactedContent).not.toContain('(555) 123-4567');
    });

    it('should detect and redact SSN numbers', () => {
      const text = 'Social Security Number: 123-45-6789';
      const result = aiSecurityManager.detectAndRedactPII(text);

      expect(result.piiCount).toBe(1);
      expect(result.piiTypes).toContain('ssn');
      expect(result.redactedContent).toContain('[SSN_REDACTED]');
    });

    it('should detect and redact credit card numbers', () => {
      const text = 'Card: 4111-1111-1111-1111';
      const result = aiSecurityManager.detectAndRedactPII(text);

      expect(result.piiCount).toBe(1);
      expect(result.piiTypes).toContain('credit_card');
      expect(result.redactedContent).toContain('[CARD_REDACTED]');
    });

    it('should detect multiple types of PII in one text', () => {
      const text = 'Contact john@example.com or call (555) 123-4567. SSN: 123-45-6789';
      const result = aiSecurityManager.detectAndRedactPII(text);

      expect(result.piiCount).toBe(3);
      expect(result.piiTypes).toEqual(expect.arrayContaining(['email', 'phone', 'ssn']));
      expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
      expect(result.redactedContent).toContain('[PHONE_REDACTED]');
      expect(result.redactedContent).toContain('[SSN_REDACTED]');
    });

    it('should preserve format when requested', () => {
      const text = 'Email: john.doe@example.com';
      const result = aiSecurityManager.detectAndRedactPII(text, { preserveFormat: true });

      expect(result.redactedContent).toContain('[EMAIL_REDACTED]_____________');
      expect(result.redactedContent.length).toBe(text.length);
    });

    it('should filter by enabled PII types', () => {
      const text = 'Email: john@example.com, Phone: (555) 123-4567';
      const result = aiSecurityManager.detectAndRedactPII(text, { enabledTypes: ['email'] });

      expect(result.piiCount).toBe(1);
      expect(result.piiTypes).toEqual(['email']);
      expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
      expect(result.redactedContent).toContain('(555) 123-4567'); // Phone not redacted
    });

    it('should return empty result when no PII is found', () => {
      const text = 'This is a clean text with no personal information';
      const result = aiSecurityManager.detectAndRedactPII(text);

      expect(result.piiCount).toBe(0);
      expect(result.piiTypes).toHaveLength(0);
      expect(result.redactedContent).toBe(text);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('API Key Management', () => {
    it('should hash API keys securely', () => {
      const apiKey = 'test-api-key-123';
      const { hash, salt } = aiSecurityManager.hashAPIKey(apiKey);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash).not.toBe(apiKey);
      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should validate API keys against stored hash', () => {
      const apiKey = 'test-api-key-123';
      const { hash, salt } = aiSecurityManager.hashAPIKey(apiKey);

      const isValid = aiSecurityManager.validateAPIKey(apiKey, hash, salt);
      expect(isValid).toBe(true);

      const isInvalid = aiSecurityManager.validateAPIKey('wrong-key', hash, salt);
      expect(isInvalid).toBe(false);
    });

    it('should register API keys with proper metadata', () => {
      const keyInfo = {
        apiKey: 'test-key-123',
        service: 'openai',
        permissions: ['read', 'write'],
        rateLimitPerHour: 1000
      };

      const keyId = aiSecurityManager.registerAPIKey(keyInfo);

      expect(keyId).toBeDefined();
      expect(keyId).toMatch(/^[0-9a-f-]+$/); // UUID format
    });

    it('should validate API key access with permissions', () => {
      const keyInfo = {
        apiKey: 'test-key-123',
        service: 'openai',
        permissions: ['search', 'extract'],
        rateLimitPerHour: 1000
      };

      const keyId = aiSecurityManager.registerAPIKey(keyInfo);

      const validAccess = aiSecurityManager.validateAPIKeyAccess(keyId, 'search', {
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      });

      expect(validAccess.valid).toBe(true);
      expect(validAccess.permissions).toEqual(['search', 'extract']);
    });

    it('should deny access for insufficient permissions', () => {
      const keyInfo = {
        apiKey: 'test-key-123',
        service: 'openai',
        permissions: ['read'],
        rateLimitPerHour: 1000
      };

      const keyId = aiSecurityManager.registerAPIKey(keyInfo);

      const invalidAccess = aiSecurityManager.validateAPIKeyAccess(keyId, 'admin', {
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      });

      expect(invalidAccess.valid).toBe(false);
      expect(invalidAccess.reason).toBe('Insufficient permissions');
    });

    it('should deny access for inactive keys', () => {
      const keyInfo = {
        apiKey: 'test-key-123',
        service: 'openai',
        permissions: ['*'],
        rateLimitPerHour: 1000
      };

      const keyId = aiSecurityManager.registerAPIKey(keyInfo);

      // Manually deactivate the key
      // @ts-ignore - Accessing private property for testing
      const storedKey = aiSecurityManager.apiKeys.get(keyId);
      storedKey.isActive = false;

      const access = aiSecurityManager.validateAPIKeyAccess(keyId, 'search', {
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      });

      expect(access.valid).toBe(false);
      expect(access.reason).toBe('Invalid or inactive API key');
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const sensitiveData = 'This is sensitive information';
      const encrypted = aiSecurityManager.encryptData(sensitiveData);

      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.encrypted).not.toBe(sensitiveData);

      const decrypted = aiSecurityManager.decryptData(encrypted.encrypted, encrypted.iv, encrypted.tag);
      expect(decrypted).toBe(sensitiveData);
    });

    it('should produce different encrypted values for same data', () => {
      const data = 'Test data';
      const encrypted1 = aiSecurityManager.encryptData(data);
      const encrypted2 = aiSecurityManager.encryptData(data);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.tag).not.toBe(encrypted2.tag);
    });

    it('should fail to decrypt with wrong parameters', () => {
      const data = 'Test data';
      const encrypted = aiSecurityManager.encryptData(data);

      expect(() => {
        aiSecurityManager.decryptData(encrypted.encrypted, 'wrong-iv', encrypted.tag);
      }).toThrow();

      expect(() => {
        aiSecurityManager.decryptData(encrypted.encrypted, encrypted.iv, 'wrong-tag');
      }).toThrow();
    });
  });

  describe('Access Policies', () => {
    it('should create and evaluate access policies', () => {
      const policyId = aiSecurityManager.createAccessPolicy({
        name: 'Test Policy',
        description: 'Test policy for unit tests',
        rules: [
          {
            type: 'user_role',
            conditions: { roles: ['admin', 'editor'] },
            action: 'allow'
          }
        ],
        priority: 1,
        isActive: true
      });

      expect(policyId).toBeDefined();

      // Test allowed access
      const allowedAccess = aiSecurityManager.checkAccessPolicies({
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        operation: 'search',
        service: 'openai',
        timestamp: new Date()
      });

      expect(allowedAccess.allowed).toBe(true);

      // Test denied access
      const deniedAccess = aiSecurityManager.checkAccessPolicies({
        userRole: 'viewer',
        ipAddress: '192.168.1.1',
        operation: 'search',
        service: 'openai',
        timestamp: new Date()
      });

      expect(deniedAccess.allowed).toBe(false);
      expect(deniedAccess.reason).toContain('User role viewer not in allowed roles');
    });

    it('should evaluate time window rules', () => {
      aiSecurityManager.createAccessPolicy({
        name: 'Business Hours Only',
        description: 'Allow access only during business hours',
        rules: [
          {
            type: 'time_window',
            conditions: { startHour: 9, endHour: 17 },
            action: 'allow'
          }
        ],
        priority: 1,
        isActive: true
      });

      // Test during business hours
      const businessHours = new Date();
      businessHours.setHours(14, 0, 0, 0); // 2 PM

      const businessAccess = aiSecurityManager.checkAccessPolicies({
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        operation: 'search',
        service: 'openai',
        timestamp: businessHours
      });

      expect(businessAccess.allowed).toBe(true);

      // Test outside business hours
      const afterHours = new Date();
      afterHours.setHours(20, 0, 0, 0); // 8 PM

      const afterHoursAccess = aiSecurityManager.checkAccessPolicies({
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        operation: 'search',
        service: 'openai',
        timestamp: afterHours
      });

      expect(afterHoursAccess.allowed).toBe(false);
      expect(afterHoursAccess.reason).toBe('Access outside allowed time window');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events', () => {
      const logEntry = {
        userId: 'user-123',
        keyId: 'key-456',
        service: 'openai',
        operation: 'search',
        action: 'execute' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        success: true,
        details: { query: 'test query' },
        piiRedacted: true
      };

      aiSecurityManager.logAudit(logEntry);

      const logs = aiSecurityManager.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-123');
      expect(logs[0].service).toBe('openai');
      expect(logs[0].operation).toBe('search');
      expect(logs[0].success).toBe(true);
      expect(logs[0].dataHash).toBeDefined();
    });

    it('should filter audit logs', () => {
      // Add multiple log entries
      for (let i = 0; i < 5; i++) {
        aiSecurityManager.logAudit({
          userId: i % 2 === 0 ? 'user-1' : 'user-2',
          service: 'openai',
          operation: i % 2 === 0 ? 'search' : 'extract',
          action: 'execute' as const,
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: i < 4,
          details: { index: i },
          piiRedacted: false
        });
      }

      // Filter by user
      const user1Logs = aiSecurityManager.getAuditLogs({ userId: 'user-1' });
      expect(user1Logs).toHaveLength(3);

      // Filter by operation
      const searchLogs = aiSecurityManager.getAuditLogs({ operation: 'search' });
      expect(searchLogs).toHaveLength(3);

      // Filter by success
      const successLogs = aiSecurityManager.getAuditLogs({ success: true });
      expect(successLogs).toHaveLength(4);

      // Test limit
      const limitedLogs = aiSecurityManager.getAuditLogs({ limit: 2 });
      expect(limitedLogs).toHaveLength(2);
    });

    it('should generate security reports', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Add some audit logs
      for (let i = 0; i < 10; i++) {
        aiSecurityManager.logAudit({
          userId: 'user-123',
          service: i % 2 === 0 ? 'openai' : 'anthropic',
          operation: 'search',
          action: 'execute' as const,
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: i < 8,
          details: { piiRedacted: i % 3 === 0 },
          piiRedacted: i % 3 === 0
        });
      }

      const report = aiSecurityManager.generateSecurityReport({
        from: oneHourAgo,
        to: now
      });

      expect(report.totalRequests).toBe(10);
      expect(report.successfulRequests).toBe(8);
      expect(report.failedRequests).toBe(2);
      expect(report.topServices).toHaveLength(2);
      expect(report.securityIncidents).toBeDefined();
      expect(report.piiRedactions).toBeGreaterThan(0);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize user input', () => {
      const maliciousInput = 'Normal text<script>alert("xss")</script>\x00Control char';
      const sanitized = aiSecurityManager.sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).toContain('Normal text');
    });

    it('should validate input against schema', () => {
      const schema = require('zod').z.object({
        name: require('zod').z.string().min(1),
        email: require('zod').z.string().email(),
        age: require('zod').z.number().min(0)
      });

      // Valid input
      const validInput = { name: 'John', email: 'john@example.com', age: 30 };
      const validResult = aiSecurityManager.validateInput(validInput, schema);
      expect(validResult.valid).toBe(true);
      expect(validResult.data).toEqual(validInput);

      // Invalid input
      const invalidInput = { name: '', email: 'invalid-email', age: -5 };
      const invalidResult = aiSecurityManager.validateInput(invalidInput, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toBeDefined();
      expect(invalidResult.errors!.length).toBeGreaterThan(0);
    });

    it('should handle nested object sanitization', () => {
      const nestedInput = {
        user: {
          name: 'John<script>',
          email: 'john@example.com'
        },
        metadata: 'Some data\x00'
      };

      const sanitized = aiSecurityManager.sanitizeInput(nestedInput);

      expect(sanitized.user.name).not.toContain('<script>');
      expect(sanitized.metadata).not.toContain('\x00');
      expect(sanitized.user.email).toBe('john@example.com'); // Valid email preserved
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', () => {
      const keyId = 'test-key';
      const limit = aiSecurityManager.checkRateLimit(keyId);

      expect(limit.allowed).toBe(true);
      expect(limit.remaining).toBeGreaterThan(0);

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        aiSecurityManager.checkRateLimit(keyId);
      }

      const exhausted = aiSecurityManager.checkRateLimit(keyId);
      expect(exhausted.allowed).toBe(false);
      expect(exhausted.remaining).toBe(0);
      expect(exhausted.retryAfter).toBeDefined();
    });

    it('should reset rate limits after time window', () => {
      const keyId = 'test-key';

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        aiSecurityManager.checkRateLimit(keyId);
      }

      const exhausted = aiSecurityManager.checkRateLimit(keyId);
      expect(exhausted.allowed).toBe(false);

      // Reset the rate limiter
      // @ts-ignore - Accessing private property for testing
      aiSecurityManager.rateLimiter.reset(keyId);

      const reset = aiSecurityManager.checkRateLimit(keyId);
      expect(reset.allowed).toBe(true);
    });
  });
});