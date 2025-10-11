/**
 * Results Display Components Hooks
 * Custom hooks for contact management, filtering, sorting, and performance optimization
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useErrorHandler } from '@/hooks/use-error-handling';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Contact, 
  ContactFilter, 
  SortConfig, 
  TableColumn, 
  PaginationConfig,
  ContactViewMode,
  BulkActionType,
  PerformanceMetrics,
  DEFAULT_TABLE_COLUMNS,
  DEFAULT_PAGINATION,
  DEFAULT_FILTER,
  DEFAULT_SORT
} from './types';
import { 
  ContactProcessor,
  filterContacts,
  sortContacts,
  paginateContacts,
  calculatePerformanceMetrics,
  withPerformanceTracking,
  debounce
} from './utils';

/**
 * Hook for managing contact data with filtering, sorting, and pagination
 */
export function useContactManagement(
  initialContacts: Contact[] = [],
  options: {
    enableVirtualization?: boolean;
    pageSize?: number;
    debounceMs?: number;
  } = {}
) {
  const {
    enableVirtualization = true,
    pageSize = 25,
    debounceMs = 300
  } = options;

  // State management
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [filter, setFilter] = useState<ContactFilter>(DEFAULT_FILTER);
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT);
  const [pagination, setPagination] = useState<PaginationConfig>({
    ...DEFAULT_PAGINATION,
    pageSize
  });
  const [viewMode, setViewMode] = useState<ContactViewMode>('table');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced filter
  const debouncedFilter = useDebouncedValue(filter, debounceMs);

  // Contact processor for caching
  const processorRef = useRef(new ContactProcessor());
  const processor = processorRef.current;

  // Error handling
  const errorHandler = useErrorHandler();

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    sortTime: 0,
    filterTime: 0,
    memoryUsage: 0,
    totalContacts: 0,
    visibleContacts: 0,
  });

  // Process contacts with filtering, sorting, and pagination
  const processedContacts = useMemo(() => {
    const startTime = performance.now();
    
    try {
      // Filter contacts
      const filterStart = performance.now();
      const filtered = processor.process(contacts, 'filter', debouncedFilter);
      const filterTime = performance.now() - filterStart;

      // Sort contacts
      const sortStart = performance.now();
      const sorted = processor.process(filtered, 'sort', sort);
      const sortTime = performance.now() - sortStart;

      // Update pagination
      const totalPages = Math.ceil(sorted.length / pagination.pageSize);
      if (totalPages !== pagination.totalPages || sorted.length !== pagination.total) {
        setPagination(prev => ({
          ...prev,
          total: sorted.length,
          totalPages,
          page: Math.min(prev.page, totalPages || 1)
        }));
      }

      // Paginate contacts
      const paginated = processor.process(sorted, 'paginate', {
        page: pagination.page,
        pageSize: pagination.pageSize
      });

      const renderTime = performance.now() - startTime;

      // Update performance metrics
      setPerformanceMetrics(calculatePerformanceMetrics(
        { filter: filterTime, sort: sortTime, render: renderTime },
        contacts.length,
        paginated.length
      ));

      return paginated;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        timestamp: new Date(),
        operationType: 'contact_processing'
      });
      return [];
    }
  }, [contacts, debouncedFilter, sort, pagination.page, pagination.pageSize, errorHandler, processor]);

  // Update contacts
  const updateContacts = useCallback((newContacts: Contact[]) => {
    setLoading(true);
    try {
      setContacts(newContacts);
      processor.clearCache();
    } catch (error) {
      errorHandler.handleError(error as Error, {
        timestamp: new Date(),
        operationType: 'update_contacts'
      });
    } finally {
      setLoading(false);
    }
  }, [errorHandler, processor]);

  // Filter management
  const updateFilter = useCallback((newFilter: Partial<ContactFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const clearFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Sort management
  const updateSort = useCallback((newSort: Partial<SortConfig>) => {
    setSort(prev => ({ ...prev, ...newSort }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Pagination management
  const updatePagination = useCallback((newPagination: Partial<PaginationConfig>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => ({ 
      ...prev, 
      page: Math.min(prev.page + 1, prev.totalPages) 
    }));
  }, []);

  const previousPage = useCallback(() => {
    setPagination(prev => ({ 
      ...prev, 
      page: Math.max(prev.page - 1, 1) 
    }));
  }, []);

  // Selection management
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }, []);

  const selectAllContacts = useCallback(() => {
    setSelectedContacts(processedContacts.map(contact => contact.id));
  }, [processedContacts]);

  const clearSelection = useCallback(() => {
    setSelectedContacts([]);
  }, []);

  const selectContacts = useCallback((contactIds: string[]) => {
    setSelectedContacts(contactIds);
  }, []);

  // Bulk operations
  const performBulkAction = useCallback(async (action: BulkActionType, contactIds?: string[]) => {
    const targetIds = contactIds || selectedContacts;
    if (!targetIds.length) return;

    setLoading(true);
    try {
      // This would be implemented based on the specific action
      // For now, we'll just simulate the operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update contacts based on the action
      switch (action) {
        case 'import':
          setContacts(prev => prev.map(contact => 
            targetIds.includes(contact.id) 
              ? { ...contact, imported: true }
              : contact
          ));
          break;
        case 'favorite':
          setContacts(prev => prev.map(contact => 
            targetIds.includes(contact.id) 
              ? { ...contact, favorite: !contact.favorite }
              : contact
          ));
          break;
        case 'archive':
          setContacts(prev => prev.map(contact => 
            targetIds.includes(contact.id) 
              ? { ...contact, archived: true }
              : contact
          ));
          break;
        // Add other actions as needed
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        timestamp: new Date(),
        operationType: 'bulk_action',
        action
      });
    } finally {
      setLoading(false);
    }
  }, [selectedContacts, errorHandler]);

  return {
    // Data
    contacts: processedContacts,
    allContacts: contacts,
    totalContacts: contacts.length,
    filteredContacts: useMemo(() => 
      filterContacts(contacts, debouncedFilter), 
      [contacts, debouncedFilter]
    ),
    
    // State
    filter,
    sort,
    pagination,
    viewMode,
    selectedContacts,
    loading,
    performanceMetrics,
    
    // Actions
    updateContacts,
    updateFilter,
    clearFilter,
    updateSort,
    updatePagination,
    goToPage,
    nextPage,
    previousPage,
    setViewMode,
    toggleContactSelection,
    selectAllContacts,
    clearSelection,
    selectContacts,
    performBulkAction,
    
    // Computed values
    hasSelection: selectedContacts.length > 0,
    allSelected: processedContacts.length > 0 && selectedContacts.length === processedContacts.length,
    someSelected: selectedContacts.length > 0 && selectedContacts.length < processedContacts.length,
  };
}

/**
 * Hook for managing table columns
 */
export function useTableColumns(
  initialColumns: TableColumn[] = DEFAULT_TABLE_COLUMNS
) {
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);

  const updateColumn = useCallback((columnId: string, updates: Partial<TableColumn>) => {
    setColumns(prev => prev.map(column => 
      column.id === columnId 
        ? { ...column, ...updates }
        : column
    ));
  }, []);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumns(prev => prev.map(column => 
      column.id === columnId 
        ? { ...column, visible: !column.visible }
        : column
    ));
  }, []);

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [movedColumn] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, movedColumn);
      return newColumns;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_TABLE_COLUMNS);
  }, []);

  const visibleColumns = useMemo(() => 
    columns.filter(column => column.visible), 
    [columns]
  );

  return {
    columns,
    visibleColumns,
    columnManagerOpen,
    setColumnManagerOpen,
    updateColumn,
    toggleColumnVisibility,
    reorderColumns,
    resetColumns,
  };
}

/**
 * Hook for managing contact preview
 */
export function useContactPreview(contacts: Contact[]) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const currentContact = useMemo(() => {
    if (previewIndex === null) return null;
    return contacts[previewIndex] || null;
  }, [contacts, previewIndex]);

  const openPreview = useCallback((contactId: string) => {
    const index = contacts.findIndex(contact => contact.id === contactId);
    if (index !== -1) {
      setPreviewIndex(index);
      setPreviewOpen(true);
    }
  }, [contacts]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const nextContact = useCallback(() => {
    if (previewIndex !== null && previewIndex < contacts.length - 1) {
      setPreviewIndex(prev => prev! + 1);
    }
  }, [previewIndex, contacts.length]);

  const previousContact = useCallback(() => {
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(prev => prev! - 1);
    }
  }, [previewIndex]);

  const hasNext = previewIndex !== null && previewIndex < contacts.length - 1;
  const hasPrevious = previewIndex !== null && previewIndex > 0;

  return {
    currentContact,
    previewOpen,
    openPreview,
    closePreview,
    nextContact,
    previousContact,
    hasNext,
    hasPrevious,
  };
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useContactKeyboardShortcuts(
  actions: {
    onSelectAll?: () => void;
    onClearSelection?: () => void;
    onExport?: () => void;
    onImport?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    onClose?: () => void;
    onSearch?: (query: string) => void;
  }
) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !event.shiftKey) {
        event.preventDefault();
        actions.onSelectAll?.();
      }

      // Ctrl/Cmd + Shift + A: Clear selection
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        actions.onClearSelection?.();
      }

      // Ctrl/Cmd + E: Export
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        actions.onExport?.();
      }

      // Ctrl/Cmd + I: Import
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        actions.onImport?.();
      }

      // Arrow keys: Navigation
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        actions.onNext?.();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        actions.onPrevious?.();
      }

      // Escape: Close
      if (event.key === 'Escape') {
        event.preventDefault();
        actions.onClose?.();
      }

      // Ctrl/Cmd + F: Focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        // Focus on search input (this would need to be implemented in the component)
        const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  return {
    searchQuery,
    setSearchQuery,
  };
}

/**
 * Hook for managing responsive behavior
 */
export function useContactResponsive() {
  const isMobile = useIsMobile();
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  const defaultViewMode: ContactViewMode = useMemo(() => {
    if (isMobile) return 'list';
    if (isTablet) return 'grid';
    return 'table';
  }, [isMobile, isTablet]);

  const defaultPageSize = useMemo(() => {
    if (isMobile) return 10;
    if (isTablet) return 20;
    return 25;
  }, [isMobile, isTablet]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    defaultViewMode,
    defaultPageSize,
  };
}

/**
 * Hook for managing export functionality
 */
export function useContactExport(contacts: Contact[]) {
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const errorHandler = useErrorHandler();

  const exportContacts = useCallback(async (
    format: 'csv' | 'json' | 'vcard' | 'xlsx',
    options: {
      selectedOnly?: boolean;
      includeMetadata?: boolean;
      contactIds?: string[];
    } = {}
  ) => {
    setExporting(true);
    
    try {
      const { selectedOnly = false, includeMetadata = false, contactIds } = options;
      
      let contactsToExport = contacts;
      
      if (contactIds) {
        contactsToExport = contacts.filter(contact => contactIds.includes(contact.id));
      } else if (selectedOnly) {
        // This would need to be passed in or managed differently
        // For now, we'll export all contacts
      }

      const timestamp = new Date().toISOString().split('T')[0];
      let filename = `contacts_${timestamp}`;
      let content = '';
      let mimeType = '';

      switch (format) {
        case 'csv':
          filename += '.csv';
          mimeType = 'text/csv';
          content = generateCSV(contactsToExport, includeMetadata);
          break;
        case 'json':
          filename += '.json';
          mimeType = 'application/json';
          content = JSON.stringify(
            contactsToExport.map(contact => formatContactForExport(contact, 'json', includeMetadata)),
            null,
            2
          );
          break;
        case 'vcard':
          filename += '.vcf';
          mimeType = 'text/vcard';
          content = contactsToExport.map(contact => generateVCard(contact)).join('\n');
          break;
        case 'xlsx':
          // This would require a library like xlsx
          throw new Error('XLSX export not implemented yet');
      }

      downloadFile(content, filename, mimeType);
      
      setExportModalOpen(false);
    } catch (error) {
      errorHandler.handleError(error as Error, {
        timestamp: new Date(),
        operationType: 'export_contacts',
        format
      });
    } finally {
      setExporting(false);
    }
  }, [contacts, errorHandler]);

  return {
    exporting,
    exportModalOpen,
    setExportModalOpen,
    exportContacts,
  };
}

// Helper functions (these would be imported from utils)
function generateCSV(contacts: Contact[], includeMetadata: boolean): string {
  // Implementation would go here
  return '';
}

function formatContactForExport(contact: Contact, format: string, includeMetadata: boolean): any {
  // Implementation would go here
  return {};
}

function generateVCard(contact: Contact): string {
  // Implementation would go here
  return '';
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  // Implementation would go here
}

function useMediaQuery(query: string): boolean {
  // This would use the existing useMediaQuery hook
  return false;
}