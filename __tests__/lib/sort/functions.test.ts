import { 
  compareDates, 
  compareEmails, 
  compareTagArrays, 
  compareStringsWithNulls 
} from '@/lib/sort/functions';
import { createCollator } from '@/lib/sort/collator';

describe('Sorting Functions', () => {
  describe('compareDates', () => {
    it('should correctly compare valid dates', () => {
      expect(compareDates('2023-01-01', '2023-01-02')).toBeLessThan(0);
      expect(compareDates('2023-01-02', '2023-01-01')).toBeGreaterThan(0);
      expect(compareDates('2023-01-01', '2023-01-01')).toBe(0);
    });

    it('should handle null/undefined values', () => {
      expect(compareDates(null, '2023-01-01')).toBeGreaterThan(0);
      expect(compareDates('2023-01-01', null)).toBeLessThan(0);
      expect(compareDates(null, null)).toBe(0);
      expect(compareDates(undefined, undefined)).toBe(0);
    });

    it('should handle invalid dates', () => {
      expect(compareDates('invalid', '2023-01-01')).toBeGreaterThan(0);
      expect(compareDates('2023-01-01', 'invalid')).toBeLessThan(0);
      expect(compareDates('invalid', 'also-invalid')).toBe(0);
    });
  });

  describe('compareEmails', () => {
    it('should correctly compare emails by domain first', () => {
      expect(compareEmails('user@a.com', 'user@b.com')).toBeLessThan(0);
      expect(compareEmails('user@b.com', 'user@a.com')).toBeGreaterThan(0);
    });

    it('should compare local parts when domains are equal', () => {
      expect(compareEmails('a@example.com', 'b@example.com')).toBeLessThan(0);
      expect(compareEmails('b@example.com', 'a@example.com')).toBeGreaterThan(0);
      expect(compareEmails('a@example.com', 'a@example.com')).toBe(0);
    });

    it('should handle null/undefined values', () => {
      expect(compareEmails(null, 'user@example.com')).toBeGreaterThan(0);
      expect(compareEmails('user@example.com', null)).toBeLessThan(0);
      expect(compareEmails(null, null)).toBe(0);
    });
  });

  describe('compareTagArrays', () => {
    it('should compare by first tag name', () => {
      const a = [{ name: 'Apple' }, { name: 'Banana' }];
      const b = [{ name: 'Cherry' }, { name: 'Date' }];
      expect(compareTagArrays(a, b)).toBeLessThan(0);
    });

    it('should compare by array length when first tags are equal', () => {
      const a = [{ name: 'Apple' }, { name: 'Banana' }];
      const b = [{ name: 'Apple' }];
      expect(compareTagArrays(a, b)).toBeGreaterThan(0);
    });

    it('should handle null/undefined values', () => {
      const arr = [{ name: 'Apple' }];
      expect(compareTagArrays(null, arr)).toBeGreaterThan(0);
      expect(compareTagArrays(arr, null)).toBeLessThan(0);
      expect(compareTagArrays(null, null)).toBe(0);
    });

    it('should handle string arrays', () => {
      const a = ['Apple', 'Banana'];
      const b = ['Cherry', 'Date'];
      expect(compareTagArrays(a, b)).toBeLessThan(0);
    });
  });

  describe('compareStringsWithNulls', () => {
    it('should correctly compare strings', () => {
      expect(compareStringsWithNulls('apple', 'banana')).toBeLessThan(0);
      expect(compareStringsWithNulls('banana', 'apple')).toBeGreaterThan(0);
      expect(compareStringsWithNulls('apple', 'apple')).toBe(0);
    });

    it('should handle null/undefined values', () => {
      expect(compareStringsWithNulls(null, 'apple')).toBeGreaterThan(0);
      expect(compareStringsWithNulls('apple', null)).toBeLessThan(0);
      expect(compareStringsWithNulls(null, null)).toBe(0);
    });
  });
});