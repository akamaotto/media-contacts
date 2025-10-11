/**
 * Results Display Components Types
 * Unified types for contact display and management components
 */

import { ExtractedContact, SocialProfile, ContactInfo, VerificationStatus } from '@/lib/ai/contact-extraction/types';

// Unified Contact interface that extends the existing ExtractedContact
export interface Contact extends ExtractedContact {
  // Additional display-specific fields
  imported?: boolean;
  selected?: boolean;
  tags?: string[];
  notes?: string;
  lastContacted?: Date;
  favorite?: boolean;
  archived?: boolean;
  category?: string;
  customFields?: Record<string, any>;
}

// Source information for display
export interface ContactSource {
  id: string;
  url: string;
  name: string;
  type: 'website' | 'social' | 'article' | 'directory' | 'other';
  credibility: number;
  verified: boolean;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

// Table column configuration
export interface TableColumn {
  id: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  render?: (value: any, contact: Contact) => React.ReactNode;
  filterComponent?: React.ComponentType<{ column: TableColumn; value: any; onChange: (value: any) => void }>;
}

// View modes for contacts display
export type ContactViewMode = 'table' | 'grid' | 'list';

// Sort configuration
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Filter configuration
export interface ContactFilter {
  search?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  verificationStatus?: VerificationStatus[];
  sources?: string[];
  tags?: string[];
  imported?: boolean;
  favorite?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  customFilters?: Record<string, any>;
}

// Pagination configuration
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Bulk action types
export type BulkActionType = 
  | 'import'
  | 'export'
  | 'tag'
  | 'categorize'
  | 'favorite'
  | 'archive'
  | 'delete'
  | 'verify'
  | 'merge';

// Export formats
export type ExportFormat = 'csv' | 'json' | 'vcard' | 'xlsx';

// Component props interfaces
export interface ResultsTableProps {
  contacts: Contact[];
  loading?: boolean;
  selectedContacts: string[];
  onSelectionChange: (ids: string[]) => void;
  onContactPreview: (contact: Contact) => void;
  onImport: (ids: string[]) => void;
  columns: TableColumn[];
  onColumnsChange: (columns: TableColumn[]) => void;
  viewMode: ContactViewMode;
  onViewModeChange: (mode: ContactViewMode) => void;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  filter: ContactFilter;
  onFilterChange: (filter: ContactFilter) => void;
  pagination: PaginationConfig;
  onPaginationChange: (pagination: PaginationConfig) => void;
  onBulkAction: (action: BulkActionType, contactIds: string[]) => void;
}

export interface ContactCardProps {
  contact: Contact;
  selected?: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export interface ContactPreviewProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'subtle';
  className?: string;
}

export interface SourceListProps {
  sources: ContactSource[];
  verified?: boolean;
  compact?: boolean;
  maxItems?: number;
  className?: string;
}

export interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onImport: () => void;
  onExport: (format: ExportFormat) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkAction: (action: BulkActionType) => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ColumnManagerProps {
  columns: TableColumn[];
  onColumnsChange: (columns: TableColumn[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, options: ExportOptions) => void;
  loading?: boolean;
  selectedCount: number;
  totalCount: number;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeSources?: boolean;
  selectedOnly?: boolean;
  fields?: string[];
  filter?: ContactFilter;
}

// Performance monitoring
export interface PerformanceMetrics {
  renderTime: number;
  sortTime: number;
  filterTime: number;
  memoryUsage: number;
  totalContacts: number;
  visibleContacts: number;
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
}

// Error states
export interface ContactDisplayError {
  type: 'load' | 'filter' | 'sort' | 'export' | 'import';
  message: string;
  details?: any;
  retryable?: boolean;
}

// Loading states
export interface ContactDisplayLoading {
  initial?: boolean;
  filtering?: boolean;
  sorting?: boolean;
  exporting?: boolean;
  importing?: boolean;
}

// Accessibility labels
export interface AccessibilityLabels {
  tableLabel: string;
  sortButtonLabel: string;
  filterButtonLabel: string;
  selectAllLabel: string;
  bulkActionsLabel: string;
  viewModeToggleLabel: string;
  exportButtonLabel: string;
  contactPreviewLabel: string;
  confidenceLabel: string;
  sourceVerificationLabel: string;
}

// Theme customization
export interface ContactDisplayTheme {
  primaryColor?: string;
  confidenceColors?: {
    high: string;
    medium: string;
    low: string;
  };
  verificationColors?: {
    verified: string;
    pending: string;
    rejected: string;
  };
  borderRadius?: string;
  fontSize?: string;
}

// Default configurations
export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'name', label: 'Name', sortable: true, filterable: true, visible: true },
  { id: 'title', label: 'Title', sortable: true, filterable: true, visible: true },
  { id: 'company', label: 'Company', sortable: true, filterable: true, visible: true },
  { id: 'email', label: 'Email', sortable: true, filterable: true, visible: true },
  { id: 'confidenceScore', label: 'Confidence', sortable: true, filterable: true, visible: true },
  { id: 'verificationStatus', label: 'Status', sortable: true, filterable: true, visible: true },
  { id: 'sourceUrl', label: 'Source', sortable: true, filterable: true, visible: false },
  { id: 'createdAt', label: 'Found Date', sortable: true, filterable: true, visible: false },
];

export const DEFAULT_PAGINATION: PaginationConfig = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
};

export const DEFAULT_FILTER: ContactFilter = {
  confidenceMin: 0,
  confidenceMax: 1,
};

export const DEFAULT_SORT: SortConfig = {
  key: 'createdAt',
  direction: 'desc',
};

// Utility functions
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600 bg-green-50';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
  if (confidence >= 0.4) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
};

export const getVerificationStatusColor = (status: VerificationStatus): string => {
  switch (status) {
    case VerificationStatus.CONFIRMED:
      return 'text-green-600 bg-green-50';
    case VerificationStatus.PENDING:
      return 'text-yellow-600 bg-yellow-50';
    case VerificationStatus.REJECTED:
      return 'text-red-600 bg-red-50';
    case VerificationStatus.MANUAL_REVIEW:
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const formatContactName = (contact: Contact): string => {
  if (!contact.name) return 'Unknown';
  return contact.name.trim();
};

export const formatContactTitle = (contact: Contact): string => {
  if (!contact.title) return '';
  return contact.title.trim();
};

export const formatContactCompany = (contact: Contact): string => {
  const company = contact.contactInfo?.company;
  if (!company) return '';
  return company.trim();
};

export const getContactInitials = (contact: Contact): string => {
  const name = formatContactName(contact);
  if (!name || name === 'Unknown') return '?';
  
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
};