/**
 * Type definitions for AI Search Components
 * Shared interfaces and types used across the AI search feature components
 */

import { SearchConfiguration } from '@/lib/ai/search-orchestration/types';

export interface SearchFormData {
  query: string;
  countries: string[];
  categories: string[];
  beats: string[];
  options: SearchOptions;
}

export interface SearchOptions {
  maxQueries?: number;
  diversityThreshold?: number;
  minRelevanceScore?: number;
  enableAIEnhancement?: boolean;
  fallbackStrategies?: boolean;
  cacheEnabled?: boolean;
  priority?: 'low' | 'medium' | 'high';
  languages?: string[];
  regions?: string[];
  outlets?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface FindContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<SearchFormData>;
  onSubmit: (data: SearchFormData) => Promise<void>;
  loading?: boolean;
}

export interface SearchFormProps {
  onSubmit: (data: SearchFormData) => void;
  initialValues?: Partial<SearchFormData>;
  loading?: boolean  ;
  disabled?: boolean;
}

export interface CountrySelectorProps {
  value: string[];
  onChange: (countries: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
  error?: string;
}

export interface CategorySelectorProps {
  value: string[];
  onChange: (categories: string[]) => void;
  categories: CategoryHierarchy[];
  maxDepth?: number;
  disabled?: boolean;
  error?: string;
}

export interface BeatSelectorProps {
  value: string[];
  onChange: (beats: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
  error?: string;
  allowCustom?: boolean;
}

export interface SearchOptionsFormProps {
  value: SearchOptions;
  onChange: (options: SearchOptions) => void;
  disabled?: boolean;
  className?: string;
}

export interface CategoryHierarchy {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: CategoryHierarchy[];
  count?: number;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  flag?: string;
  count?: number;
  region?: string;
}

export interface Beat {
  id: string;
  name: string;
  description?: string;
  count?: number;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export interface FormStatus {
  loading: boolean;
  error?: string;
  success?: boolean;
}

export interface SearchProgress {
  searchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  resultsFound?: number;
  errors?: string[];
}

// API Response types from the Query Generation API
export interface QueryGenerationResponse {
  searchId: string;
  batchId: string;
  originalQuery: string;
  queries: GeneratedQuery[];
  metrics: QueryMetrics;
  status: string;
  errors?: string[];
}

export interface GeneratedQuery {
  id: string;
  query: string;
  type: string;
  scores: {
    relevance: number;
    diversity: number;
    specificity: number;
  };
  metadata: Record<string, any>;
  criteria: SearchConfiguration['criteria'];
}

export interface QueryMetrics {
  totalGenerated: number;
  totalDuplicates: number;
  averageScore: number;
  processingTimeMs: number;
}

// Form validation schemas
export const searchFormValidationRules = {
  query: {
    required: 'Search query is required',
    minLength: {
      value: 3,
      message: 'Query must be at least 3 characters long'
    },
    maxLength: {
      value: 1000,
      message: 'Query cannot exceed 1000 characters'
    }
  },
  countries: {
    required: 'At least one country must be selected',
    min: {
      value: 1,
      message: 'Please select at least one country'
    }
  },
  categories: {
    required: false
  },
  beats: {
    required: false
  }
};

export const defaultSearchFormData: SearchFormData = {
  query: '',
  countries: [],
  categories: [],
  beats: [],
  options: {
    maxQueries: 10,
    diversityThreshold: 0.7,
    minRelevanceScore: 0.3,
    enableAIEnhancement: true,
    fallbackStrategies: true,
    cacheEnabled: true,
    priority: 'medium'
  }
};

// Accessibility labels and messages
export const accessibilityLabels = {
  countrySelector: {
    trigger: 'Select countries for search',
    clearSelection: 'Clear country selection',
    removeCountry: 'Remove country from selection'
  },
  categorySelector: {
    trigger: 'Select categories for search',
    expandCategory: 'Expand category',
    collapseCategory: 'Collapse category',
    clearSelection: 'Clear category selection',
    removeCategory: 'Remove category from selection'
  },
  beatSelector: {
    trigger: 'Select beats for search',
    addCustomBeat: 'Add custom beat',
    removeBeat: 'Remove beat from selection',
    clearSelection: 'Clear beat selection'
  },
  modal: {
    closeButton: 'Close search form',
    submitButton: 'Start AI search',
    cancelButton: 'Cancel search'
  }
};

// Performance thresholds
export const performanceThresholds = {
  modalOpenTime: 100, // ms
  formValidationTime: 50, // ms
  countrySearchTime: 200, // ms for 200+ countries
  componentInteractionTime: 50 // ms
};
