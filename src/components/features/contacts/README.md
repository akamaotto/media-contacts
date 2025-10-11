# Contact Results Display Components

A comprehensive set of components for displaying and managing AI-extracted contacts with advanced features like virtualization, bulk operations, and export functionality.

## Features

- **Multiple View Modes**: Table, grid, and list views for different browsing preferences
- **Virtualization**: Efficient rendering of large datasets with @tanstack/react-virtual
- **Bulk Operations**: Select and perform actions on multiple contacts
- **Export Functionality**: Export contacts in CSV, JSON, vCard, and Excel formats
- **Column Management**: Customize visible and sortable columns
- **Contact Preview**: Detailed modal with full contact information
- **Performance Monitoring**: Built-in performance metrics and optimization
- **Responsive Design**: Mobile-friendly with adaptive layouts
- **Accessibility**: Full keyboard navigation and screen reader support

## Installation

```bash
npm install @tanstack/react-virtual
```

## Quick Start

```tsx
import { 
  ResultsTable, 
  useContactManagement, 
  DEFAULT_TABLE_COLUMNS 
} from '@/components/features/contacts';

function ContactDisplay() {
  const contactManagement = useContactManagement(contacts, {
    pageSize: 25,
    debounceMs: 300,
  });

  return (
    <ResultsTable
      contacts={contactManagement.contacts}
      loading={loading}
      selectedContacts={contactManagement.selectedContacts}
      onSelectionChange={contactManagement.selectContacts}
      onContactPreview={handleContactPreview}
      onImport={handleImport}
      columns={DEFAULT_TABLE_COLUMNS}
      onColumnsChange={setColumns}
      viewMode={contactManagement.viewMode}
      onViewModeChange={contactManagement.setViewMode}
      sort={contactManagement.sort}
      onSortChange={contactManagement.updateSort}
      filter={contactManagement.filter}
      onFilterChange={contactManagement.updateFilter}
      pagination={contactManagement.pagination}
      onPaginationChange={contactManagement.updatePagination}
      onBulkAction={handleBulkAction}
    />
  );
}
```

## Components

### ResultsTable

The main component for displaying contacts with virtualization and advanced features.

```tsx
<ResultsTable
  contacts={contacts}
  loading={loading}
  selectedContacts={selectedContacts}
  onSelectionChange={setSelectedContacts}
  onContactPreview={handlePreview}
  onImport={handleImport}
  columns={columns}
  onColumnsChange={setColumns}
  viewMode="table"
  onViewModeChange={setViewMode}
  sort={sort}
  onSortChange={setSort}
  filter={filter}
  onFilterChange={setFilter}
  pagination={pagination}
  onPaginationChange={setPagination}
  onBulkAction={handleBulkAction}
/>
```

### ContactCard

Card component for displaying contact information in grid or list views.

```tsx
<ContactCard
  contact={contact}
  selected={isSelected}
  onSelect={setSelected}
  onPreview={handlePreview}
  compact={false}
  showActions={true}
/>
```

### ContactPreview

Modal component for displaying detailed contact information.

```tsx
<ContactPreview
  contact={contact}
  isOpen={isOpen}
  onClose={handleClose}
  onImport={handleImport}
  onNext={handleNext}
  onPrevious={handlePrevious}
  hasNext={hasNext}
  hasPrevious={hasPrevious}
/>
```

### BulkActions

Toolbar for bulk selection and operations.

```tsx
<BulkActions
  selectedCount={selectedCount}
  totalCount={totalCount}
  onImport={handleImport}
  onExport={handleExport}
  onSelectAll={handleSelectAll}
  onClearSelection={handleClearSelection}
  onBulkAction={handleBulkAction}
/>
```

### ConfidenceBadge

Visual indicator for data quality and reliability.

```tsx
<ConfidenceBadge
  confidence={0.85}
  showLabel={true}
  size="md"
  variant="default"
/>
```

### ExportModal

Modal for configuring export options.

```tsx
<ExportModal
  isOpen={isOpen}
  onClose={handleClose}
  onExport={handleExport}
  loading={loading}
  selectedCount={selectedCount}
  totalCount={totalCount}
/>
```

### ColumnManager

Interface for managing table column visibility and configuration.

```tsx
<ColumnManager
  columns={columns}
  onColumnsChange={setColumns}
  isOpen={isOpen}
  onClose={handleClose}
/>
```

## Hooks

### useContactManagement

Main hook for managing contact state, filtering, sorting, and pagination.

```tsx
const contactManagement = useContactManagement(contacts, {
  enableVirtualization: true,
  pageSize: 25,
  debounceMs: 300,
});

// Returns:
// {
//   contacts,           // Processed contacts
//   allContacts,        // All contacts
//   totalContacts,      // Total contact count
//   filteredContacts,   // Filtered contacts
//   filter,             // Current filter
//   sort,               // Current sort
//   pagination,         // Current pagination
//   viewMode,           // Current view mode
//   selectedContacts,   // Selected contact IDs
//   loading,            // Loading state
//   performanceMetrics, // Performance metrics
//   updateContacts,     // Update contacts
//   updateFilter,       // Update filter
//   clearFilter,        // Clear filter
//   updateSort,         // Update sort
//   updatePagination,   // Update pagination
//   goToPage,           // Go to specific page
//   nextPage,           // Go to next page
//   previousPage,       // Go to previous page
//   setViewMode,        // Set view mode
//   toggleContactSelection, // Toggle contact selection
//   selectAllContacts,  // Select all contacts
//   clearSelection,     // Clear selection
//   selectContacts,     // Select specific contacts
//   performBulkAction,  // Perform bulk action
//   hasSelection,       // Has selection
//   allSelected,        // All contacts selected
//   someSelected,       // Some contacts selected
// }
```

### useTableColumns

Hook for managing table columns.

```tsx
const tableColumns = useTableColumns(initialColumns);

// Returns:
// {
//   columns,           // All columns
//   visibleColumns,    // Visible columns
//   columnManagerOpen, // Column manager open state
//   setColumnManagerOpen, // Set column manager open state
//   updateColumn,      // Update column
//   toggleColumnVisibility, // Toggle column visibility
//   reorderColumns,    // Reorder columns
//   resetColumns,      // Reset columns
// }
```

### useContactPreview

Hook for managing contact preview state.

```tsx
const contactPreview = useContactPreview(contacts);

// Returns:
// {
//   currentContact,    // Current contact
//   previewOpen,       // Preview open state
//   openPreview,       // Open preview
//   closePreview,      // Close preview
//   nextContact,       // Next contact
//   previousContact,   // Previous contact
//   hasNext,           // Has next contact
//   hasPrevious,       // Has previous contact
// }
```

## Types

### Contact

```tsx
interface Contact {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  confidenceScore: number;
  qualityScore: number;
  verificationStatus: VerificationStatus;
  relevanceScore: number;
  sourceUrl: string;
  extractionMethod: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  imported?: boolean;
  favorite?: boolean;
  tags?: string[];
  notes?: string;
  // ... additional properties
}
```

### TableColumn

```tsx
interface TableColumn {
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
  filterComponent?: React.ComponentType<{
    column: TableColumn;
    value: any;
    onChange: (value: any) => void;
  }>;
}
```

### ContactFilter

```tsx
interface ContactFilter {
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
```

## Performance Optimization

The components include several performance optimizations:

1. **Virtualization**: Only renders visible rows for large datasets
2. **Memoization**: Components are memoized to prevent unnecessary re-renders
3. **Debounced Filtering**: Filter operations are debounced to reduce API calls
4. **Cached Processing**: Contact processing is cached to avoid repeated calculations
5. **Lazy Loading**: Images and other resources are loaded on demand

## Accessibility

The components follow WCAG guidelines and include:

1. **Keyboard Navigation**: Full keyboard support for all interactions
2. **Screen Reader Support**: Proper ARIA labels and descriptions
3. **Focus Management**: Logical focus flow and visible focus indicators
4. **Semantic HTML**: Proper use of semantic elements
5. **Color Contrast**: Sufficient color contrast for readability

## Keyboard Shortcuts

- `Ctrl/Cmd + A`: Select all contacts
- `Ctrl/Cmd + Shift + A`: Clear selection
- `Ctrl/Cmd + E`: Export contacts
- `Ctrl/Cmd + I`: Import contacts
- `Arrow Keys`: Navigate between contacts in preview
- `Escape`: Close modals
- `Ctrl/Cmd + F`: Focus search input

## Export Formats

The system supports multiple export formats:

1. **CSV**: Comma-separated values for spreadsheets
2. **JSON**: JavaScript Object Notation for developers
3. **vCard**: Virtual contact file for address books
4. **Excel**: Microsoft Excel format with advanced formatting

## Customization

The components can be customized through:

1. **Themes**: Apply custom themes with CSS variables
2. **Columns**: Configure visible and sortable columns
3. **Actions**: Add custom bulk actions
4. **Renderers**: Provide custom cell renderers
5. **Filters**: Add custom filter components

## Example

See `example.tsx` for a comprehensive example of all components and features.

## Contributing

When contributing to these components:

1. Follow the existing code style and patterns
2. Add TypeScript types for all props and state
3. Include accessibility attributes
4. Add tests for new features
5. Update documentation for any API changes

## License

These components are part of the internal contact management system and are not licensed for external use.