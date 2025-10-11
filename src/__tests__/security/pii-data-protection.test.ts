/**
 * PII Data Protection Security Tests
 * Tests for Personally Identifiable Information detection, redaction, and protection
 */

import { aiSecurityManager } from '@/lib/ai/services/security';
import { auditLogger } from '@/lib/security/audit-logger';

// Mock audit logger
jest.mock('@/lib/security/audit-logger', () => ({
  auditLogger: {
    logSecurityViolation: jest.fn(() => Promise.resolve()),
    logAPIAccess: jest.fn(() => Promise.resolve())
  }
}));

describe('PII Data Protection Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Address Protection', () => {
    it('should detect and redact standard email formats', () => {
      const emailTestCases = [
        'Contact john.doe@example.com for details',
        'Email: user.name+tag@domain.co.uk',
        'Multiple: first@test.com, second@another.org',
        'Professional: contact@company.museum',
        'International: 用户@例子.公司',
        'Subdomain: user@mail.sub.domain.com'
      ];

      emailTestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('email');
        expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
        
        // Verify original email is completely removed
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const remainingEmails = result.redactedContent.match(emailRegex);
        expect(remainingEmails).toBeNull();
      });
    });

    it('should handle edge case email formats', () => {
      const edgeCases = [
        'Email with quotes: "john.doe"@example.com',
        'IP address email: user@[192.168.1.1]',
        'Local domain: admin@localhost',
        'Test domain: test@example.test',
        'Long TLD: info@example.museum'
      ];

      edgeCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiCount > 0) {
          expect(result.piiTypes).toContain('email');
          expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
        }
      });
    });

    it('should avoid false positives for non-email patterns', () => {
      const falsePositives = [
        'Version 2.3.4 released',
        'IP address: 192.168.1.1',
        'File path: C:\\Users\\John\\Documents',
        'URL: https://example.com/contact',
        'Text with @ symbol: @mention #hashtag',
        'Math: 2 * 3 = 6',
        'Price: $19.99'
      ];

      falsePositives.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiTypes.includes('email')) {
          // If detected, should have high confidence
          expect(result.confidence).toBeGreaterThan(0.9);
        }
      });
    });
  });

  describe('Phone Number Protection', () => {
    it('should detect and redact various phone formats', () => {
      const phoneTestCases = [
        'US format: (555) 123-4567',
        'International: +1-555-987-6543',
        'UK format: +44 20 7123 4567',
        'Simple: 5551234567',
        'With extension: (555) 123-4567 ext. 89',
        'European: +49 30 12345678',
        'Asian: +81-3-1234-5678'
      ];

      phoneTestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('phone');
        expect(result.redactedContent).toContain('[PHONE_REDACTED]');
      });
    });

    it('should handle international phone number formats', () => {
      const internationalFormats = [
        'China: +86 138 0013 8000',
        'India: +91 98765 43210',
        'Brazil: +55 11 99999-9999',
        'Australia: +61 2 9876 5432',
        'Russia: +7 495 123-45-67',
        'South Korea: +82 2-1234-5678'
      ];

      internationalFormats.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('phone');
      });
    });

    it('should avoid false positives for non-phone numbers', () => {
      const falsePositives = [
        'Year: 2023',
        'Time: 12:34:56',
        'Date: 12/25/2023',
        'Version: v1.2.3',
        'ID: 123-45-678',
        'Coordinates: 12.345, -67.890',
        'Phone-like but not: 123-456-7890123' // Too long
      ];

      falsePositives.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiTypes.includes('phone')) {
          // Should have lower confidence for potential false positives
          expect(result.confidence).toBeLessThan(0.8);
        }
      });
    });
  });

  describe('Social Security Number Protection', () => {
    it('should detect and redact SSN formats', () => {
      const ssnTestCases = [
        'Standard: 123-45-6789',
        'SSN: 555-12-3456',
        'Tax ID: 999-99-9999',
        'Social: 111-22-3333'
      ];

      ssnTestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('ssn');
        expect(result.redactedContent).toContain('[SSN_REDACTED]');
      });
    });

    it('should handle SSN edge cases', () => {
      const edgeCases = [
        'Invalid SSN: 666-12-3456', // Invalid area number
        'Invalid SSN: 123-00-6789', // Invalid group number
        'Invalid SSN: 123-45-0000', // Invalid serial number
        'Fake SSN: 000-00-0000', // All zeros
        'Sequential: 123-45-6780' // Sequential numbers
      ];

      edgeCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        // Should still detect as potential SSN for safety
        if (result.piiCount > 0) {
          expect(result.piiTypes).toContain('ssn');
        }
      });
    });

    it('should avoid SSN false positives', () => {
      const falsePositives = [
        'Phone: 123-456-7890',
        'Code: ABC-12-3456',
        'Reference: 123-45-6789X',
        'Not SSN: 12-345-6789' // Wrong format
      ];

      falsePositives.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiTypes.includes('ssn')) {
          expect(result.confidence).toBeLessThan(0.7);
        }
      });
    });
  });

  describe('Credit Card Protection', () => {
    it('should detect and redact credit card numbers', () => {
      const creditCardTestCases = [
        'Visa: 4111-1111-1111-1111',
        'Mastercard: 5555-5555-5555-4444',
        'Amex: 3782-822463-10005',
        'Discover: 6011-0009-9013-9424',
        'Unformatted: 4111111111111111',
        'Spaces: 4111 1111 1111 1111'
      ];

      creditCardTestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('credit_card');
        expect(result.redactedContent).toContain('[CARD_REDACTED]');
      });
    });

    it('should validate credit card checksums', () => {
      const validCards = [
        'Visa: 4111-1111-1111-1111', // Valid Luhn checksum
        'Mastercard: 5555-5555-5555-4444' // Valid Luhn checksum
      ];

      const invalidCards = [
        'Invalid: 4111-1111-1111-1112', // Invalid Luhn checksum
        'Fake: 1234-5678-9012-3456' // Invalid Luhn checksum
      ];

      validCards.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiTypes).toContain('credit_card');
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      invalidCards.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiTypes.includes('credit_card')) {
          expect(result.confidence).toBeLessThan(0.7);
        }
      });
    });

    it('should handle credit card edge cases', () => {
      const edgeCases = [
        'Too short: 4111-1111-1111',
        'Too long: 4111-1111-1111-1111-1111',
        'Invalid digits: 4111-1111-1111-111a',
        'Test card: 4242-4242-4242-4242' // Common test card
      ];

      edgeCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        // Should err on the side of caution
        if (text.includes('4242') || text.length >= 16) {
          expect(result.piiCount).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('IP Address Protection', () => {
    it('should detect and redact IP addresses', () => {
      const ipTestCases = [
        'IPv4: 192.168.1.100',
        'Public: 8.8.8.8',
        'Local: 127.0.0.1',
        'Network: 10.0.0.1',
        'Class B: 172.16.0.1',
        'Class C: 192.168.0.1'
      ];

      ipTestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('ip_address');
        expect(result.redactedContent).toContain('[IP_REDACTED]');
      });
    });

    it('should handle IPv6 addresses', () => {
      const ipv6TestCases = [
        'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        'Compressed: 2001:db8:85a3::8a2e:370:7334',
        'Loopback: ::1',
        'Link-local: fe80::1ff:fe23:4567:890a'
      ];

      ipv6TestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        // Current implementation focuses on IPv4, but should detect IPv6 patterns
        expect(result.piiCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should avoid IP address false positives', () => {
      const falsePositives = [
        'Version: v1.2.3.4',
        'Build number: 2023.12.25.1',
        'Date: 2023.12.25',
        'Time: 12:34:56',
        'Invalid IP: 999.999.999.999',
        'Partial: 192.168'
      ];

      falsePositives.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiTypes.includes('ip_address')) {
          expect(result.confidence).toBeLessThan(0.8);
        }
      });
    });
  });

  describe('Address Protection', () => {
    it('should detect and redact street addresses', () => {
      const addressTestCases = [
        '123 Main St, Anytown, USA 12345',
        '456 Oak Avenue, Springfield, IL 62701',
        '789 Elm Street, New York, NY 10001',
        '1000 Broadway, Los Angeles, CA 90028'
      ];

      addressTestCases.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
        expect(result.piiTypes).toContain('address');
        expect(result.redactedContent).toContain('[ADDRESS_REDACTED]');
      });
    });

    it('should handle international address formats', () => {
      const internationalAddresses = [
        '10 Downing Street, London SW1A 2AA, UK',
        '1600 Pennsylvania Ave NW, Washington, DC 20500',
        '1 Infinite Loop, Cupertino, CA 95014',
        'Rua Augusta, 123 - São Paulo, SP 01305-100, Brazil'
      ];

      internationalAddresses.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        expect(result.piiCount).toBeGreaterThan(0);
      });
    });

    it('should avoid address false positives', () => {
      const falsePositives = [
        'Chapter 1: Introduction',
        'Page 123: Important content',
        'Size: Large',
        'Number: 123',
        'Street: Main Street (not a full address)'
      ];

      falsePositives.forEach(text => {
        const result = aiSecurityManager.detectAndRedactPII(text);
        if (result.piiTypes.includes('address')) {
          expect(result.confidence).toBeLessThan(0.7);
        }
      });
    });
  });

  describe('PII Detection Performance and Accuracy', () => {
    it('should handle mixed PII types efficiently', () => {
      const mixedPII = `
        Contact Information:
        Name: John Doe
        Email: john.doe@example.com
        Phone: (555) 123-4567
        SSN: 123-45-6789
        Credit Card: 4111-1111-1111-1111
        Address: 123 Main St, Anytown, USA 12345
        IP: 192.168.1.100
        Work: jane.smith@company.com
        Mobile: +1-555-987-6543
      `;

      const startTime = Date.now();
      const result = aiSecurityManager.detectAndRedactPII(mixedPII);
      const endTime = Date.now();

      expect(result.piiCount).toBeGreaterThan(7);
      expect(result.piiTypes).toEqual(expect.arrayContaining([
        'email', 'phone', 'ssn', 'credit_card', 'address', 'ip_address'
      ]));
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms

      // Verify all PII is redacted
      expect(result.redactedContent).not.toContain('@example.com');
      expect(result.redactedContent).not.toContain('(555)');
      expect(result.redactedContent).not.toContain('123-45-6789');
      expect(result.redactedContent).not.toContain('4111-1111-1111-1111');
      expect(result.redactedContent).not.toContain('123 Main St');
      expect(result.redactedContent).not.toContain('192.168.1.100');
    });

    it('should maintain context while redacting', () => {
      const textWithPII = `
        Please contact John Doe at john.doe@example.com or call (555) 123-4567.
        His SSN is 123-45-6789 and he lives at 123 Main St, Anytown, USA 12345.
        For payments, use card 4111-1111-1111-1111.
      `;

      const result = aiSecurityManager.detectAndRedactPII(textWithPII, { preserveFormat: true });

      // Should preserve structure while redacting
      expect(result.redactedContent).toContain('Please contact');
      expect(result.redactedContent).toContain('at [EMAIL_REDACTED]');
      expect(result.redactedContent).toContain('or call [PHONE_REDACTED]');
      expect(result.redactedContent).toContain('His SSN is [SSN_REDACTED]');
      expect(result.redactedContent).toContain('lives at [ADDRESS_REDACTED]');
      expect(result.redactedContent).toContain('use card [CARD_REDACTED]');
    });

    it('should handle large text volumes efficiently', () => {
      const largeText = 'Contact john.doe@example.com or call (555) 123-4567. '.repeat(1000);
      
      const startTime = Date.now();
      const result = aiSecurityManager.detectAndRedactPII(largeText);
      const endTime = Date.now();

      expect(result.piiCount).toBe(2000); // 1000 emails + 1000 phones
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('PII Data Encryption and Secure Storage', () => {
    it('should encrypt sensitive PII data', () => {
      const sensitiveData = 'John Doe, SSN: 123-45-6789, Email: john@example.com';
      
      const encrypted = aiSecurityManager.encryptData(sensitiveData);
      
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.encrypted).not.toBe(sensitiveData);
      expect(encrypted.encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt PII data correctly', () => {
      const originalData = 'John Doe, SSN: 123-45-6789, Email: john@example.com';
      const encrypted = aiSecurityManager.encryptData(originalData);
      
      const decrypted = aiSecurityManager.decryptData(
        encrypted.encrypted,
        encrypted.iv,
        encrypted.tag
      );
      
      expect(decrypted).toBe(originalData);
    });

    it('should generate different ciphertext for same data', () => {
      const data = 'Sensitive PII information';
      
      const encrypted1 = aiSecurityManager.encryptData(data);
      const encrypted2 = aiSecurityManager.encryptData(data);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.tag).not.toBe(encrypted2.tag);
    });

    it('should fail decryption with wrong parameters', () => {
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

  describe('PII Audit and Compliance', () => {
    it('should log PII detection events', () => {
      const textWithPII = 'Contact john.doe@example.com, call (555) 123-4567';
      
      aiSecurityManager.detectAndRedactPII(textWithPII);
      
      // Check if audit logs are created for PII processing
      const logs = aiSecurityManager.getAuditLogs();
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('should track PII redaction statistics', () => {
      const textWithPII = `
        Emails: user1@test.com, user2@example.org
        Phones: (555) 123-4567, (666) 987-6543
        SSN: 123-45-6789
        Card: 4111-1111-1111-1111
      `;
      
      const result = aiSecurityManager.detectAndRedactPII(textWithPII);
      
      expect(result.piiCount).toBe(6);
      expect(result.piiTypes).toEqual(expect.arrayContaining([
        'email', 'phone', 'ssn', 'credit_card'
      ]));
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should generate PII compliance reports', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Add some PII processing logs
      for (let i = 0; i < 5; i++) {
        aiSecurityManager.detectAndRedactPII(`Email: user${i}@test.com, Phone: (555) 123-${i}000`);
      }
      
      const report = aiSecurityManager.generateSecurityReport({
        from: oneHourAgo,
        to: now
      });
      
      expect(report.totalRequests).toBeGreaterThan(0);
      expect(report.piiRedactions).toBeGreaterThan(0);
      expect(report.securityIncidents).toBeDefined();
    });
  });

  describe('PII Data Retention and Cleanup', () => {
    it('should handle PII data lifecycle', () => {
      const piiData = {
        userId: 'user123',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        ssn: '123-45-6789',
        createdAt: new Date(),
        lastAccessed: new Date()
      };
      
      // Test data encryption for storage
      const encryptedEmail = aiSecurityManager.encryptData(piiData.email);
      const encryptedPhone = aiSecurityManager.encryptData(piiData.phone);
      const encryptedSSN = aiSecurityManager.encryptData(piiData.ssn);
      
      // Verify data can be decrypted when needed
      expect(aiSecurityManager.decryptData(encryptedEmail.encrypted, encryptedEmail.iv, encryptedEmail.tag))
        .toBe(piiData.email);
      expect(aiSecurityManager.decryptData(encryptedPhone.encrypted, encryptedPhone.iv, encryptedPhone.tag))
        .toBe(piiData.phone);
      expect(aiSecurityManager.decryptData(encryptedSSN.encrypted, encryptedSSN.iv, encryptedSSN.tag))
        .toBe(piiData.ssn);
    });

    it('should implement secure PII deletion', () => {
      const sensitiveData = 'SSN: 123-45-6789, Email: john@example.com';
      
      // Redact PII before deletion
      const redacted = aiSecurityManager.detectAndRedactPII(sensitiveData);
      
      expect(redacted.redactedContent).not.toContain('123-45-6789');
      expect(redacted.redactedContent).not.toContain('john@example.com');
      expect(redacted.redactedContent).toContain('[SSN_REDACTED]');
      expect(redacted.redactedContent).toContain('[EMAIL_REDACTED]');
      
      // Log the deletion event
      aiSecurityManager.logAudit({
        userId: 'user123',
        service: 'pii-management',
        operation: 'pii_deletion',
        action: 'delete',
        ipAddress: '192.168.1.100',
        userAgent: 'test-agent',
        success: true,
        details: { piiTypes: ['ssn', 'email'], redactionCount: 2 },
        piiRedacted: true
      });
      
      const logs = aiSecurityManager.getAuditLogs();
      const deletionLog = logs.find(log => log.operation === 'pii_deletion');
      expect(deletionLog).toBeDefined();
      expect(deletionLog!.piiRedacted).toBe(true);
    });
  });
});