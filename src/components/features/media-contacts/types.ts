// Shared types for media contacts components

// Import types from external libraries for consistency
import type { Region as CountryDataRegion, CountryData } from '@/lib/types/geography';
import type { Language } from '@/lib/types/geography';

// Types for related entities
export interface Country {
  id: string;
  name: string;
  code?: string | null;
  phone_code?: string | null;
  capital?: string | null;
  flag_emoji?: string | null;
  regions?: {
    id: string;
    name: string;
    code: string;
    category: string;
  }[];
  languages?: {
    id: string;
    name: string;
    code: string;
  }[];
  _count?: {
    mediaContacts: number;
  };
  [key: string]: any; // Allow additional properties
}

export interface Beat {
  id: string;
  name: string;
  description?: string | null;
}

export interface Outlet {
  id: string;
  name: string;
}

// Re-export Region from geography types to ensure consistency
export type { CountryData as CountryData };
export type { Region } from '@/lib/types/geography';

// Interface for actions passed to the getColumns function
export interface ColumnActions {
  onEditContact: (contact: MediaContactTableItem) => void;
  onDeleteContact: (contact: MediaContactTableItem) => void;
  onViewContact: (contact: MediaContactTableItem) => void;
}

export interface MediaContactTableItem {
  id: string;
  name: string;
  email: string;
  title: string;
  emailVerified?: boolean; // Preferred property name
  email_verified_status?: boolean; // Keeping for backward compatibility
  updated_at: Date | string;
  outlets: Outlet[];
  countries: Country[];
  beats: Beat[];
  languages?: Language[];
  regions?: Array<{ id: string; name: string; code: string }>;
  outletCount?: number;
  beatCount?: number;
  countryCount?: number;
  regionCount?: number;
  languageCount?: number;
  bio?: string | null;
  socials?: string[] | null;
  authorLinks?: string[] | null;
  // Add any other fields that might be used in the application
  [key: string]: any; // For any additional dynamic properties
}

export interface ApiContact {
  id: string;
  name: string;
  email: string;
  title: string;
  email_verified_status: boolean;
  updated_at: string;
  outlets: Array<{ id: string; name: string }>;
  beats: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string }>;
  regions: Array<{ id: string; name: string; code: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
  outletCount: number;
  beatCount: number;
  countryCount: number;
  regionCount: number;
  languageCount: number;
  bio?: string | null;
  socials?: string[] | null;
  authorLinks?: string[] | null;
}

export interface ReferenceData {
  countries: Array<{ id: string; name: string; code?: string; phone_code?: string; capital?: string; flag_emoji?: string }>;
  beats: Array<{ id: string; name: string; description?: string }>;
  regions: Array<{ id: string; name: string; code: string; category: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
  outlets: Array<{ id: string; name: string; description?: string; website?: string }>;
}

// Enhanced pagination interface
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

// Enhanced badge list interface
export interface EnhancedBadgeListProps {
  items: Array<{ id: string; name: string }>;
  totalCount: number;
  colorClass?: string;
  maxVisible?: number;
  showTooltips?: boolean;
  responsive?: boolean;
  emptyText?: string;
  onItemClick?: (item: { id: string; name: string }) => void;
}

// Badge preset configuration
export interface BadgePresetConfig {
  colorClass: string;
  maxVisible: number;
  emptyText: string;
}

// API response interface
export interface ApiResponse {
  contacts: ApiContact[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  performance: {
    queryTime: number;
    totalTime: number;
    contactsReturned: number;
  };
}

// Filter parameters interface
export interface FilterParams {
  searchTerm?: string;
  countryIds?: string[];
  beatIds?: string[];
  outletIds?: string[];
  regionCodes?: string[];
  languageCodes?: string[];
  emailVerified?: 'all' | 'verified' | 'unverified';
  page?: number;
  pageSize?: number;
}

// Loading and error state interfaces
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastQueryTime: number;
}

export interface ReferenceDataState extends LoadingState {
  data: ReferenceData | null;
}

// Fast table component interface
export interface FastTableContact {
  id: string;
  name: string;
  email: string;
  title: string;
  email_verified_status: boolean;
  updated_at: string;
  outlets: Array<{ id: string; name: string }>;
  beats: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string }>;
  regions: Array<{ id: string; name: string; code: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
  outletCount: number;
  beatCount: number;
  countryCount: number;
  regionCount: number;
  languageCount: number;
}

export interface FastTableProps {
  searchTerm?: string;
  countryIds?: string[];
  beatIds?: string[];
  outletIds?: string[];
  regionCodes?: string[];
  languageCodes?: string[];
  emailVerified?: 'all' | 'verified' | 'unverified';
  page?: number;
  pageSize?: number;
  onEditContact: (contact: FastTableContact) => void;
  onDeleteContact: (contact: FastTableContact) => void;
  onViewContact: (contact: FastTableContact) => void;
  onDataChange?: (totalCount: number) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

// API filters component interface
export interface ApiFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCountryIds: string[];
  onCountryFilterChange: (countryIds: string[]) => void;
  selectedBeatIds: string[];
  onBeatFilterChange: (beatIds: string[]) => void;
  selectedOutletIds: string[];
  onOutletFilterChange: (outletIds: string[]) => void;
  selectedRegionCodes: string[];
  onRegionFilterChange: (regionCodes: string[]) => void;
  selectedLanguageCodes: string[];
  onLanguageFilterChange: (languageCodes: string[]) => void;
  emailVerified: 'all' | 'verified' | 'unverified';
  onEmailVerifiedChange: (value: 'all' | 'verified' | 'unverified') => void;
  countries: Array<{ id: string; name: string; code?: string }>;
  beats: Array<{ id: string; name: string }>;
  outlets: Array<{ id: string; name: string; description?: string; website?: string }>;
  regions: Array<{ id: string; name: string; code: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
}

// Utility types
export type EmailVerificationStatus = 'all' | 'verified' | 'unverified';
export type SortDirection = 'asc' | 'desc';
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// Contact action types
export type ContactAction = 'view' | 'edit' | 'delete' | 'copy-email';

// Filter change handler types
export type FilterChangeHandler<T> = (value: T) => void;
export type MultiSelectFilterHandler = FilterChangeHandler<string[]>;
export type SingleSelectFilterHandler = FilterChangeHandler<string>;

// Component event handlers
export interface ContactEventHandlers {
  onView: (contact: FastTableContact | ApiContact) => void;
  onEdit: (contact: FastTableContact | ApiContact) => void;
  onDelete: (contact: FastTableContact | ApiContact) => void;
  onCopyEmail?: (email: string) => void;
}

// Enhanced error interface
export interface ApiError {
  message: string;
  code?: string | number;
  details?: Record<string, any>;
  timestamp?: Date;
}

// Type guards
export const isApiContact = (contact: any): contact is ApiContact => {
  return contact && typeof contact.id === 'string' && typeof contact.email_verified_status === 'boolean';
};

export const isMediaContactTableItem = (contact: any): contact is MediaContactTableItem => {
  return contact && typeof contact.id === 'string' && (
    typeof contact.emailVerified === 'boolean' ||
    typeof contact.email_verified_status === 'boolean'
  );
};

// Type adapter to convert ApiContact to MediaContactTableItem
export const adaptApiContactToTableItem = (contact: ApiContact): MediaContactTableItem => ({
  ...contact,
  emailVerified: contact.email_verified_status,
  updated_at: contact.updated_at
});
