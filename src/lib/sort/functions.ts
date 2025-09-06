/**
 * Specialized sorting functions for different data types
 */

import { createCollator } from './collator';

/**
 * Compare two dates, handling invalid dates gracefully
 * @param a - First date (string, number, or Date)
 * @param b - Second date (string, number, or Date)
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareDates(a: string | number | Date | null | undefined, b: string | number | Date | null | undefined): number {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return 1; // Nulls last
  if (b == null) return -1; // Nulls last
  
  // Convert to Date objects
  const dateA = new Date(a);
  const dateB = new Date(b);
  
  // Handle invalid dates
  const isInvalidA = isNaN(dateA.getTime());
  const isInvalidB = isNaN(dateB.getTime());
  
  if (isInvalidA && isInvalidB) return 0;
  if (isInvalidA) return 1; // Invalid dates last
  if (isInvalidB) return -1; // Invalid dates last
  
  return dateA.getTime() - dateB.getTime();
}

/**
 * Compare two email addresses, sorting by domain first then local part
 * @param a - First email
 * @param b - Second email
 * @param locale - Locale for comparison
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareEmails(a: string | null | undefined, b: string | null | undefined, locale?: string): number {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  
  const collator = createCollator(locale);
  
  // Split into local part and domain
  const [localA, domainA] = a.split('@');
  const [localB, domainB] = b.split('@');
  
  // Compare domains first
  if (domainA && domainB) {
    const domainComparison = collator.compare(domainA, domainB);
    if (domainComparison !== 0) {
      return domainComparison;
    }
  }
  
  // If domains are equal or missing, compare local parts
  if (localA && localB) {
    return collator.compare(localA, localB);
  }
  
  // Handle cases where local part is missing
  if (localA && !localB) return -1;
  if (!localA && localB) return 1;
  
  return 0;
}

/**
 * Compare arrays of tags, sorting by first tag then by array length
 * @param a - First array of tags
 * @param b - Second array of tags
 * @param locale - Locale for comparison
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareTagArrays(
  a: Array<{ name: string } | string> | null | undefined,
  b: Array<{ name: string } | string> | null | undefined,
  locale?: string
): number {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  
  const collator = createCollator(locale);
  
  // Get first tag names
  const firstA = a.length > 0 ? (typeof a[0] === 'string' ? a[0] : a[0].name) : '';
  const firstB = b.length > 0 ? (typeof b[0] === 'string' ? b[0] : b[0].name) : '';
  
  // Compare first tags
  const firstComparison = collator.compare(firstA, firstB);
  if (firstComparison !== 0) {
    return firstComparison;
  }
  
  // If first tags are equal, compare array lengths
  return a.length - b.length;
}

/**
 * Compare two strings with null/undefined handling
 * @param a - First string
 * @param b - Second string
 * @param locale - Locale for comparison
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareStringsWithNulls(
  a: string | null | undefined,
  b: string | null | undefined,
  locale?: string
): number {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return 1; // Nulls last
  if (b == null) return -1; // Nulls last
  
  const collator = createCollator(locale);
  return collator.compare(a, b);
}