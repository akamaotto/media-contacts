/**
 * Results Display Components Index
 * Exports all components, utilities, hooks, and types for the contact display system
 */

// Main components
export { default as ResultsTable } from './results-table';
export { default as ContactCard } from './contact-card';
export { default as ContactCardSkeleton } from './contact-card';
export { default as ContactPreview } from './contact-preview';
export { default as BulkActions } from './bulk-actions';
export { default as BulkActionsCompact } from './bulk-actions';
export { default as BulkActionConfirmation } from './bulk-actions';
export { default as ColumnManager } from './column-manager';
export { default as ColumnManagerCompact } from './column-manager';
export { default as ExportModal } from './export-modal';

// Utility components
export { default as ConfidenceBadge } from './confidence-badge';
export { default as ConfidenceBar } from './confidence-badge';
export { default as ConfidenceScore } from './confidence-badge';
export { default as ConfidenceLegend } from './confidence-badge';
export { default as SourceList } from './source-list';
export { default as SourceListCompact } from './source-list';
export { default as SourceVerificationStatus } from './source-list';

// Hooks
export {
  useContactManagement,
  useTableColumns,
  useContactPreview,
  useContactKeyboardShortcuts,
  useContactResponsive,
  useContactExport,
} from './hooks';

// Types and interfaces
export type {
  Contact,
  ContactSource,
  TableColumn,
  ContactViewMode,
  SortConfig,
  ContactFilter,
  PaginationConfig,
  BulkActionType,
  ExportFormat,
  ResultsTableProps,
  ContactCardProps,
  ContactPreviewProps,
  ConfidenceBadgeProps,
  SourceListProps,
  BulkActionsProps,
  ColumnManagerProps,
  ExportModalProps,
  ExportOptions,
  PerformanceMetrics,
  KeyboardShortcut,
  ContactDisplayError,
  ContactDisplayLoading,
  AccessibilityLabels,
  ContactDisplayTheme,
} from './types';

// Utilities
export {
  filterContacts,
  sortContacts,
  paginateContacts,
  calculatePerformanceMetrics,
  ContactProcessor,
  generateContactId,
  validateContact,
  isValidEmail,
  isValidUrl,
  formatContactForExport,
  generateCSV,
  generateVCard,
  downloadFile,
  isKeyboardEvent,
  generateAriaLabel,
  withPerformanceTracking,
  getValueByPath,
  setValueByPath,
  debounce,
} from './utils';

// Constants
export {
  DEFAULT_TABLE_COLUMNS,
  DEFAULT_PAGINATION,
  DEFAULT_FILTER,
  DEFAULT_SORT,
  getConfidenceColor,
  getVerificationStatusColor,
  formatContactName,
  formatContactTitle,
  formatContactCompany,
  getContactInitials,
} from './types';