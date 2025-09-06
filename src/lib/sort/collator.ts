/**
 * Locale-aware string comparison utilities for consistent sorting
 */

/**
 * Creates a collator for stable, locale-aware string sorting
 * @param locale - Locale string (e.g., 'en-US', 'fr-FR') or undefined for system default
 * @returns Intl.Collator instance
 */
export function createCollator(locale?: string): Intl.Collator {
  return new Intl.Collator(locale, {
    numeric: true, // Enable numeric collation (e.g., "2" < "10")
    sensitivity: 'base', // Case-insensitive comparison
  });
}

/**
 * Compare two strings using locale-aware collation
 * @param a - First string
 * @param b - Second string
 * @param locale - Locale string or undefined for system default
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareStrings(a: string, b: string, locale?: string): number {
  const collator = createCollator(locale);
  return collator.compare(a, b);
}

/**
 * Sort an array of strings using locale-aware collation
 * @param strings - Array of strings to sort
 * @param locale - Locale string or undefined for system default
 * @param descending - Whether to sort in descending order (default: false)
 * @returns New sorted array
 */
export function sortStrings(
  strings: string[],
  locale?: string,
  descending = false
): string[] {
  const collator = createCollator(locale);
  return [...strings].sort((a, b) => {
    const result = collator.compare(a, b);
    return descending ? -result : result;
  });
}