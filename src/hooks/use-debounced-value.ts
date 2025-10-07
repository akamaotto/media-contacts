import { useEffect, useState } from 'react';

/**
 * Debounces a changing value by the provided delay.
 * Returns the debounced value so callers can safely react to the
 * eventual steady state (e.g. triggering network requests).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
