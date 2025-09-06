/**
 * Utilities for parsing and serializing sort parameters
 */

export interface SortColumn {
  key: string;
  dir: 'asc' | 'desc';
}

/**
 * Parse sort parameter from URL search params
 * @param sortParam - Sort parameter string (e.g., "name:asc,email:desc")
 * @returns Array of SortColumn objects
 */
export function parseSortParam(sortParam?: string | null): SortColumn[] {
  if (!sortParam) return [];
  
  try {
    return sortParam
      .split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .map(part => {
        const [key, dir] = part.split(':');
        if (!key) throw new Error('Invalid sort parameter: missing key');
        
        // Validate direction
        if (dir && dir !== 'asc' && dir !== 'desc') {
          throw new Error(`Invalid sort direction: ${dir}`);
        }
        
        return {
          key,
          dir: (dir as 'asc' | 'desc') || 'asc'
        };
      });
  } catch (error) {
    console.warn('Failed to parse sort parameter:', error);
    return [];
  }
}

/**
 * Serialize sort columns to URL parameter string
 * @param sortColumns - Array of SortColumn objects
 * @returns Serialized sort parameter string (e.g., "name:asc,email:desc")
 */
export function serializeSortParam(sortColumns: SortColumn[]): string {
  return sortColumns
    .map(col => `${col.key}:${col.dir}`)
    .join(',');
}

/**
 * Get sort parameter from URLSearchParams
 * @param searchParams - URLSearchParams object
 * @returns Array of SortColumn objects
 */
export function getSortFromSearchParams(searchParams: URLSearchParams): SortColumn[] {
  const sortParam = searchParams.get('sort');
  return parseSortParam(sortParam);
}

/**
 * Set sort parameter in URLSearchParams
 * @param searchParams - URLSearchParams object
 * @param sortColumns - Array of SortColumn objects
 */
export function setSortInSearchParams(searchParams: URLSearchParams, sortColumns: SortColumn[]): void {
  if (sortColumns.length === 0) {
    searchParams.delete('sort');
  } else {
    searchParams.set('sort', serializeSortParam(sortColumns));
  }
}