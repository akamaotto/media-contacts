import { createCollator, compareStrings, sortStrings } from './collator';

describe('Collator Utilities', () => {
  describe('createCollator', () => {
    it('should create a collator with correct options', () => {
      const collator = createCollator();
      expect(collator).toBeInstanceOf(Intl.Collator);
      // Note: We can't directly check the options, but we can test the behavior
    });

    it('should create a collator with specified locale', () => {
      const collator = createCollator('en-US');
      expect(collator).toBeInstanceOf(Intl.Collator);
    });
  });

  describe('compareStrings', () => {
    it('should correctly compare strings', () => {
      expect(compareStrings('apple', 'banana')).toBeLessThan(0);
      expect(compareStrings('banana', 'apple')).toBeGreaterThan(0);
      expect(compareStrings('apple', 'apple')).toBe(0);
    });

    it('should handle numeric collation', () => {
      expect(compareStrings('2', '10')).toBeLessThan(0); // Numeric comparison
    });

    it('should be case-insensitive', () => {
      expect(compareStrings('Apple', 'apple')).toBe(0);
      expect(compareStrings('APPLE', 'apple')).toBe(0);
    });
  });

  describe('sortStrings', () => {
    it('should sort an array of strings', () => {
      const result = sortStrings(['banana', 'apple', 'cherry']);
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should support descending order', () => {
      const result = sortStrings(['banana', 'apple', 'cherry'], undefined, true);
      expect(result).toEqual(['cherry', 'banana', 'apple']);
    });

    it('should handle numeric sorting', () => {
      const result = sortStrings(['10', '2', '1']);
      expect(result).toEqual(['1', '2', '10']);
    });
  });
});