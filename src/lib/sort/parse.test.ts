import { parseSortParam, serializeSortParam, getSortFromSearchParams, setSortInSearchParams } from './parse';

describe('Sort Parameter Utilities', () => {
  describe('parseSortParam', () => {
    it('should parse valid sort parameters', () => {
      const result = parseSortParam('name:asc,email:desc');
      expect(result).toEqual([
        { key: 'name', dir: 'asc' },
        { key: 'email', dir: 'desc' }
      ]);
    });

    it('should handle single sort parameter', () => {
      const result = parseSortParam('name:asc');
      expect(result).toEqual([{ key: 'name', dir: 'asc' }]);
    });

    it('should default to asc when direction is not specified', () => {
      const result = parseSortParam('name');
      expect(result).toEqual([{ key: 'name', dir: 'asc' }]);
    });

    it('should handle empty or null input', () => {
      expect(parseSortParam(null)).toEqual([]);
      expect(parseSortParam(undefined)).toEqual([]);
      expect(parseSortParam('')).toEqual([]);
    });

    it('should handle invalid sort parameters gracefully', () => {
      const result = parseSortParam('name:invalid');
      expect(result).toEqual([]);
    });
  });

  describe('serializeSortParam', () => {
    it('should serialize sort columns to string', () => {
      const result = serializeSortParam([
        { key: 'name', dir: 'asc' },
        { key: 'email', dir: 'desc' }
      ]);
      expect(result).toBe('name:asc,email:desc');
    });

    it('should handle empty array', () => {
      const result = serializeSortParam([]);
      expect(result).toBe('');
    });
  });

  describe('getSortFromSearchParams', () => {
    it('should extract sort from URLSearchParams', () => {
      const params = new URLSearchParams('sort=name:asc,email:desc');
      const result = getSortFromSearchParams(params);
      expect(result).toEqual([
        { key: 'name', dir: 'asc' },
        { key: 'email', dir: 'desc' }
      ]);
    });
  });

  describe('setSortInSearchParams', () => {
    it('should set sort in URLSearchParams', () => {
      const params = new URLSearchParams();
      setSortInSearchParams(params, [
        { key: 'name', dir: 'asc' },
        { key: 'email', dir: 'desc' }
      ]);
      expect(params.get('sort')).toBe('name:asc,email:desc');
    });

    it('should remove sort parameter when empty', () => {
      const params = new URLSearchParams('sort=name:asc');
      setSortInSearchParams(params, []);
      expect(params.get('sort')).toBeNull();
    });
  });
});