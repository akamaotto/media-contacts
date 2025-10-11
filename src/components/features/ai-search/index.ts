/**
 * AI Search Feature Components
 *
 * This module provides a complete set of components for AI-powered contact search,
 * including modal interface, form validation, and specialized selectors.
 */

// Main Components
export { FindContactsModal } from './find-contacts-modal';
export { SearchForm } from './search-form';

// Selector Components
export { CountrySelector } from './country-selector';
export { CategorySelector } from './category-selector';
export { BeatSelector } from './beat-selector';
export { SearchOptionsForm } from './search-options-form';

// Types and Utilities
export type {
  SearchFormData,
  SearchOptions,
  FindContactsModalProps,
  SearchFormProps,
  CountrySelectorProps,
  CategorySelectorProps,
  BeatSelectorProps,
  SearchOptionsFormProps,
  CategoryHierarchy,
  Country,
  Beat,
  ValidationErrors,
  FormStatus,
  SearchProgress,
  QueryGenerationResponse,
  GeneratedQuery,
  QueryMetrics
} from './types';

export {
  defaultSearchFormData,
  searchFormValidationRules,
  accessibilityLabels,
  performanceThresholds
} from './types';

// Re-export for convenience
export * from './types';