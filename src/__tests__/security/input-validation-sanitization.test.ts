/**
 * Input Validation and Sanitization Security Tests
 * Tests for comprehensive input validation, sanitization, and edge cases
 */

import { aiSecurityManager } from '@/lib/ai/services/security';
import { z } from 'zod';

describe('Input Validation and Sanitization Tests', () => {
  describe('PII Detection and Redaction', () => {
    it('should detect and redact email addresses', () => {
      const testCases = [
        'Contact john.doe@example.com for details',
        'Email: user.name+tag@domain.co.uk',
        'Multiple: first@test.com, second@another.org',
        'Edge cases: user@localhost, admin@192.168.1.1'
      ];

      testCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('email');
        expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
        expect(result.redactedContent).not.toContain('@example.com');
      });
    });

    it('should detect and redact phone numbers', () => {
      const testCases = [
        'Call (555) 123-4567 for support',
        'Mobile: +1-555-987-6543',
        'International: +44 20 7123 4567',
        'Simple: 5551234567'
      ];

      testCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('phone');
        expect(result.redactedContent).toContain('[PHONE_REDACTED]');
      });
    });

    it('should detect and redact SSN numbers', () => {
      const testCases = [
        'SSN: 123-45-6789',
        'Social Security: 555-12-3456',
        'Tax ID: 999-99-9999'
      ];

      testCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('ssn');
        expect(result.redactedContent).toContain('[SSN_REDACTED]');
      });
    });

    it('should detect and redact credit card numbers', () => {
      const testCases = [
        'Card: 4111-1111-1111-1111',
        'Visa: 4111111111111111',
        'Mastercard: 5555-5555-5555-4444',
        'Amex: 3782-822463-10005'
      ];

      testCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('credit_card');
        expect(result.redactedContent).toContain('[CARD_REDACTED]');
      });
    });

    it('should detect and redact IP addresses', () => {
      const testCases = [
        'Server: 192.168.1.100',
        'Public: 8.8.8.8',
        'Local: 127.0.0.1',
        'Network: 10.0.0.1'
      ];

      testCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('ip_address');
        expect(result.redactedContent).toContain('[IP_REDACTED]');
      });
    });

    it('should preserve format when requested', () => {
      const text = 'Contact john.doe@example.com or call (555) 123-4567';
      const result = aiSecurityManager.detectAndRedactPII(text, { preserveFormat: true });

      expect(result.redactedContent).toContain('[EMAIL_REDACTED]____________________');
      expect(result.redactedContent).toContain('[PHONE_REDACTED]________');
      expect(result.redactedContent.length).toBe(text.length);
    });

    it('should filter by enabled PII types', () => {
      const text = 'Email: john@example.com, Phone: (555) 123-4567, SSN: 123-45-6789';
      
      const emailOnly = aiSecurityManager.detectAndRedactPII(text, { enabledTypes: ['email'] });
      expect(emailOnly.piiCount).toBe(1);
      expect(emailOnly.piiTypes).toEqual(['email']);
      expect(emailOnly.redactedContent).toContain('[EMAIL_REDACTED]');
      expect(emailOnly.redactedContent).toContain('(555) 123-4567'); // Phone not redacted

      const phoneAndSSN = aiSecurityManager.detectAndRedactPII(text, { enabledTypes: ['phone', 'ssn'] });
      expect(phoneAndSSN.piiCount).toBe(2);
      expect(phoneAndSSN.piiTypes).toEqual(expect.arrayContaining(['phone', 'ssn']));
      expect(phoneAndSSN.redactedContent).toContain('john@example.com'); // Email not redacted
    });

    it('should handle edge cases and false positives', () => {
      const edgeCases = [
        'No PII here, just normal text',
        'Numbers like 123-456-7890 but not SSN format',
        'Text with @ symbols but not emails: @mention #hashtag',
        'URLs like https://example.com/contact',
        'Version numbers like v1.2.3.4'
      ];

      edgeCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        // Should either find no PII or have high confidence
        if (result.piiCount > 0) {
          expect(result.confidence).toBeGreaterThan(0.8);
        }
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious HTML content', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
        'Normal text<script>alert("XSS")</script>more text'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = aiSecurityManager.sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('<iframe');
      });
    });

    it('should sanitize control characters', () => {
      const inputsWithControlChars = [
        'Text\x00with\x01control\x02characters',
        'Normal text\x08with\x0fcontrol\x1fchars',
        'Line\nbreaks\tand\rcarriage\rreturns'
      ];

      inputsWithControlChars.forEach(input => {
        const sanitized = aiSecurityManager.sanitizeInput(input);
        expect(sanitized).not.toContain('\x00');
        expect(sanitized).not.toContain('\x01');
        expect(sanitized).not.toContain('\x02');
        expect(sanitized).not.toContain('\x08');
        expect(sanitized).not.toContain('\x0f');
        expect(sanitized).not.toContain('\x1f');
      });
    });

    it('should handle nested object sanitization', () => {
      const nestedInput = {
        user: {
          name: 'John<script>alert("XSS")</script>Doe',
          email: 'john@example.com',
          bio: 'Contact me at 555-123-4567\x00',
          metadata: {
            notes: 'Important\x01data\x02here'
          }
        },
        search: {
          query: '<img src=x onerror=alert("XSS")>test',
          filters: ['normal', 'filter<script>']
        }
      };

      const sanitized = aiSecurityManager.sanitizeInput(nestedInput);

      expect(sanitized.user.name).not.toContain('<script>');
      expect(sanitized.user.name).not.toContain('onerror=');
      expect(sanitized.user.bio).not.toContain('\x00');
      expect(sanitized.user.bio).not.toContain('\x01');
      expect(sanitized.user.bio).not.toContain('\x02');
      expect(sanitized.search.query).not.toContain('<img');
      expect(sanitized.search.filters[1]).not.toContain('<script>');
    });

    it('should preserve valid content while sanitizing', () => {
      const validInput = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        bio: 'Software developer with 5+ years experience',
        skills: ['JavaScript', 'Python', 'React'],
        website: 'https://johndoe.dev'
      };

      const sanitized = aiSecurityManager.sanitizeInput(validInput);

      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john.doe@example.com');
      expect(sanitized.bio).toBe('Software developer with 5+ years experience');
      expect(sanitized.skills).toEqual(['JavaScript', 'Python', 'React']);
      expect(sanitized.website).toBe('https://johndoe.dev');
    });

    it('should handle arrays and complex structures', () => {
      const complexInput = {
        users: [
          { name: 'Alice<script>', email: 'alice@test.com' },
          { name: 'Bob\x00', email: 'bob@example.com' }
        ],
        searches: [
          { query: '<img src=x onerror=alert(1)>test', count: 5 },
          { query: 'normal search', count: 10 }
        ]
      };

      const sanitized = aiSecurityManager.sanitizeInput(complexInput);

      expect(sanitized.users[0].name).not.toContain('<script>');
      expect(sanitized.users[1].name).not.toContain('\x00');
      expect(sanitized.searches[0].query).not.toContain('<img');
      expect(sanitized.searches[0].query).not.toContain('onerror=');
      expect(sanitized.searches[1].query).toBe('normal search'); // Preserved
    });
  });

  describe('Schema Validation', () => {
    it('should validate with Zod schema', () => {
      const searchSchema = z.object({
        query: z.string().min(1).max(1000),
        filters: z.object({
          countries: z.array(z.string()).max(50),
          categories: z.array(z.string()).max(20)
        }).optional(),
        maxResults: z.number().min(1).max(100)
      });

      // Valid input
      const validInput = {
        query: 'test search',
        filters: {
          countries: ['US', 'CA'],
          categories: ['tech']
        },
        maxResults: 10
      };

      const validResult = aiSecurityManager.validateInput(validInput, searchSchema);
      expect(validResult.valid).toBe(true);
      expect(validResult.data).toEqual(validInput);

      // Invalid input
      const invalidInput = {
        query: '', // Too short
        filters: {
          countries: Array(100).fill('US'), // Too many
          categories: ['tech']
        },
        maxResults: 150 // Too high
      };

      const invalidResult = aiSecurityManager.validateInput(invalidInput, searchSchema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toBeDefined();
      expect(invalidResult.errors!.length).toBeGreaterThan(0);
    });

    it('should handle complex nested schemas', () => {
      const complexSchema = z.object({
        user: z.object({
          id: z.string().uuid(),
          profile: z.object({
            name: z.string().min(1).max(100),
            email: z.string().email(),
            preferences: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean()
            })
          })
        }),
        search: z.object({
          query: z.string(),
            filters: z.record(z.array(z.string()))
        })
      });

      const validComplexInput = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          profile: {
            name: 'John Doe',
            email: 'john@example.com',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        search: {
          query: 'test',
          filters: {
            countries: ['US', 'CA'],
            categories: ['tech']
          }
        }
      };

      const result = aiSecurityManager.validateInput(validComplexInput, complexSchema);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validComplexInput);
    });

    it('should provide detailed error messages', () => {
      const schema = z.object({
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18'),
        website: z.string().url('Invalid URL').optional()
      });

      const invalidInput = {
        email: 'not-an-email',
        age: 15,
        website: 'not-a-url'
      };

      const result = aiSecurityManager.validateInput(invalidInput, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors![0]).toContain('Invalid email format');
      expect(result.errors![1]).toContain('Must be at least 18');
      expect(result.errors![2]).toContain('Invalid URL');
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    it('should handle empty and null inputs', () => {
      expect(() => aiSecurityManager.sanitizeInput(null)).not.toThrow();
      expect(() => aiSecurityManager.sanitizeInput(undefined)).not.toThrow();
      expect(() => aiSecurityManager.sanitizeInput('')).not.toThrow();
      expect(() => aiSecurityManager.sanitizeInput(0)).not.toThrow();
      expect(() => aiSecurityManager.sanitizeInput(false)).not.toThrow();
    });

    it('should handle very large inputs', () => {
      const largeString = 'a'.repeat(1000000);
      expect(() => aiSecurityManager.sanitizeInput(largeString)).not.toThrow();

      const largeObject = {
        data: Array(10000).fill('test string with potentially <script>malicious</script> content')
      };
      expect(() => aiSecurityManager.sanitizeInput(largeObject)).not.toThrow();
    });

    it('should handle Unicode and special characters', () => {
      const unicodeInputs = [
        'Text with émojis 🚀🔒 and ñoñ',
        'العربية النص',
        'Русский текст',
        '中文文本',
        '日本語テキスト',
        '한국어 텍스트',
        'Special chars: © ® ™ € £ ¥ § ¶ † ‡ • … ‰ ′ ″ ‴'
      ];

      unicodeInputs.forEach(input => {
        expect(() => aiSecurityManager.sanitizeInput(input)).not.toThrow();
        const sanitized = aiSecurityManager.sanitizeInput(input);
        expect(sanitized).toBeDefined();
      });
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => aiSecurityManager.sanitizeInput(circular)).not.toThrow();
    });

    it('should handle extremely nested objects', () => {
      let nested: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nested = { level: i, nested: nested };
      }

      expect(() => aiSecurityManager.sanitizeInput(nested)).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should process PII detection efficiently', () => {
      const text = 'Contact john.doe@example.com or call (555) 123-4567. SSN: 123-45-6789. Card: 4111-1111-1111-1111';
      const iterations = 1000;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        aiSecurityManager.detectAndRedactPII(text);
      }
      const endTime = Date.now();

      const avgTime = (endTime - startTime) / iterations;
      expect(avgTime).toBeLessThan(10); // Should be under 10ms per operation
    });

    it('should handle large text processing efficiently', () => {
      const largeText = 'Contact john.doe@example.com '.repeat(1000);
      
      const startTime = Date.now();
      const result = aiSecurityManager.detectAndRedactPII(largeText);
      const endTime = Date.now();

      expect(result.piiCount).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});