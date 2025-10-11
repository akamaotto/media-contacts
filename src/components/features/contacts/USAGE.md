# Contact Results Display Components - Usage Guide

This guide provides detailed examples and best practices for using the Contact Results Display Components.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Data Structure](#data-structure)
3. [View Modes](#view-modes)
4. [Filtering and Sorting](#filtering-and-sorting)
5. [Bulk Operations](#bulk-operations)
6. [Export Functionality](#export-functionality)
7. [Customization](#customization)
8. [Performance Optimization](#performance-optimization)
9. [Accessibility](#accessibility)
10. [Troubleshooting](#troubleshooting)

## Basic Setup

### Minimal Example

```tsx
import React from 'react';
import { ResultsTable, useContactManagement, DEFAULT_TABLE_COLUMNS } from '@/components/features/contacts';

function ContactDisplay() {
  const contactManagement = useContactManagement(contacts);

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

### Advanced Setup with Custom Configuration

```tsx
import React, { useState, useEffect } from 'react';
import { 
  ResultsTable, 
  useContactManagement, 
  useTableColumns,
  DEFAULT_TABLE_COLUMNS 
} from '@/components/features/contacts';

function AdvancedContactDisplay() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Custom columns configuration
  const customColumns = [
    ...DEFAULT_TABLE_COLUMNS,
    {
      id: 'customField',
      label: 'Custom Field',
      sortable: true,
      filterable: true,
      visible: false,
      render: (value, contact) => (
        <span className="text-blue-600">{value}</span>
      ),
    },
  ];
  
  const tableColumns = useTableColumns(customColumns);
  
  // Contact management with custom options
  const contactManagement = useContactManagement(contacts, {
    enableVirtualization: true,
    pageSize: 50,
    debounceMs: 500,
  });
  
  // Load contacts
  useEffect(() => {
    setLoading(true);
    fetchContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }, []);
  
  // Event handlers
  const handleContactPreview = (contact) => {
    // Handle contact preview
  };
  
  const handleImport = (contactIds) => {
    // Handle import
  };
  
  const handleBulkAction = (action, contactIds) => {
    // Handle bulk actions
  };
  
  return (
    <div className="h-screen flex flex-col">
      <ResultsTable
        contacts={contactManagement.contacts}
        loading={loading}
        selectedContacts={contactManagement.selectedContacts}
        onSelectionChange={contactManagement.selectContacts}
        onContactPreview={handleContactPreview}
        onImport={handleImport}
        columns={tableColumns.columns}
        onColumnsChange={tableColumns.setColumns}
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
    </div>
  );
}
```

## Data Structure

### Contact Object

The Contact object should follow this structure:

```tsx
interface Contact {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  confidenceScore: number; // 0-1
  qualityScore: number; // 0-1
  verificationStatus: 'CONFIRMED' | 'PENDING' | 'REJECTED' | 'MANUAL_REVIEW';
  relevanceScore: number; // 0-1
  sourceUrl: string;
  extractionMethod: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  imported?: boolean;
  favorite?: boolean;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  contactInfo?: {
    company?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    location?: string;
    languages?: string[];
    avatar?: string;
  };
  socialProfiles?: Array<{
    platform: string;
    handle: string;
    url: string;
    verified?: boolean;
    followers?: number;
    description?: string;
  }>;
  metadata?: {
    processingSteps?: Array<{
      operation: string;
      startTime: Date;
      duration: number;
      status: string;
      details?: any;
    }>;
    confidenceFactors?: {
      nameConfidence: number;
      emailConfidence: number;
      titleConfidence: number;
      bioConfidence: number;
      socialConfidence: number;
      overallConfidence: number;
    };
    qualityFactors?: {
      sourceCredibility: number;
      contentFreshness: number;
      contactCompleteness: number;
      informationConsistency: number;
      overallQuality: number;
    };
  };
}
```

## View Modes

### Table View

The default view mode with virtualization for large datasets:

```tsx
<ResultsTable
  // ...props
  viewMode="table"
  onViewModeChange={setViewMode}
/>
```

### Grid View

Card-based layout for visual browsing:

```tsx
<ResultsTable
  // ...props
  viewMode="grid"
  onViewModeChange={setViewMode}
/>
```

### List View

Compact list view for efficient scanning:

```tsx
<ResultsTable
  // ...props
  viewMode="list"
  onViewModeChange={setViewMode}
/>
```

### Standalone Components

You can also use the view components independently:

```tsx
import { ContactCard } from '@/components/features/contacts';

function ContactGrid({ contacts }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {contacts.map(contact => (
        <ContactCard
          key={contact.id}
          contact={contact}
          selected={selectedContacts.includes(contact.id)}
          onSelect={(selected) => toggleSelection(contact.id, selected)}
          onPreview={() => previewContact(contact)}
        />
      ))}
    </div>
  );
}
```

## Filtering and Sorting

### Basic Filtering

```tsx
// Search by name, email, title, bio, company, etc.
contactManagement.updateFilter({ search: 'John' });

// Filter by confidence range
contactManagement.updateFilter({ confidenceMin: 0.8 });

// Filter by verification status
contactManagement.updateFilter({ verificationStatus: ['CONFIRMED'] });

// Filter by import status
contactManagement.updateFilter({ imported: true });

// Filter by favorite status
contactManagement.updateFilter({ favorite: true });

// Filter by tags
contactManagement.updateFilter({ tags: ['important'] });

// Filter by date range
contactManagement.updateFilter({
  dateRange: {
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
  },
});
```

### Advanced Filtering

```tsx
// Custom filters
contactManagement.updateFilter({
  customFilters: {
    company: 'Tech Corp',
    location: 'San Francisco',
  },
});

// Combine multiple filters
contactManagement.updateFilter({
  search: 'John',
  confidenceMin: 0.7,
  verificationStatus: ['CONFIRMED', 'PENDING'],
  imported: false,
  tags: ['developer'],
});
```

### Sorting

```tsx
// Sort by name ascending
contactManagement.updateSort({ key: 'name', direction: 'asc' });

// Sort by confidence score descending
contactManagement.updateSort({ key: 'confidenceScore', direction: 'desc' });

// Sort by creation date
contactManagement.updateSort({ key: 'createdAt', direction: 'desc' });

// Sort by nested property
contactManagement.updateSort({ key: 'contactInfo.company', direction: 'asc' });
```

## Bulk Operations

### Selection Management

```tsx
// Toggle contact selection
contactManagement.toggleContactSelection('contact-1');

// Select all contacts
contactManagement.selectAllContacts();

// Clear selection
contactManagement.clearSelection();

// Select specific contacts
contactManagement.selectContacts(['contact-1', 'contact-2']);
```

### Bulk Actions

```tsx
// Import selected contacts
contactManagement.performBulkAction('import');

// Mark as favorite
contactManagement.performBulkAction('favorite');

// Archive contacts
contactManagement.performBulkAction('archive');

// Delete contacts
contactManagement.performBulkAction('delete');

// Verify contacts
contactManagement.performBulkAction('verify');

// Add tags
contactManagement.performBulkAction('tag');

// Categorize contacts
contactManagement.performBulkAction('categorize');
```

### Custom Bulk Actions

```tsx
const handleCustomBulkAction = (action, contactIds) => {
  switch (action) {
    case 'customAction':
      // Handle custom action
      break;
    // Add more actions
  }
};

<ResultsTable
  // ...props
  onBulkAction={handleCustomBulkAction}
/>
```

## Export Functionality

### Basic Export

```tsx
import { useContactExport } from '@/components/features/contacts';

function ContactExport() {
  const { exporting, exportModalOpen, setExportModalOpen, exportContacts } = useContactExport(contacts);
  
  const handleExport = (format, options) => {
    // Handle export
  };
  
  return (
    <Button onClick={() => setExportModalOpen(true)}>
      Export Contacts
    </Button>
    
    <ExportModal
      isOpen={exportModalOpen}
      onClose={() => setExportModalOpen(false)}
      onExport={handleExport}
      loading={exporting}
      selectedCount={selectedContacts.length}
      totalCount={contacts.length}
    />
  );
}
```

### Export Formats

```tsx
// Export as CSV
exportContacts('csv', { selectedOnly: true, includeMetadata: false });

// Export as JSON
exportContacts('json', { selectedOnly: true, includeMetadata: true });

// Export as vCard
exportContacts('vcard', { selectedOnly: true });

// Export as Excel
exportContacts('xlsx', { selectedOnly: true, includeMetadata: false });
```

### Custom Export

```tsx
const handleCustomExport = (format, options) => {
  const contactsToExport = options.selectedOnly 
    ? selectedContacts 
    : allContacts;
    
  // Custom export logic
  switch (format) {
    case 'customFormat':
      // Handle custom format
      break;
    // Add more formats
  }
};
```

## Customization

### Custom Columns

```tsx
const customColumns = [
  ...DEFAULT_TABLE_COLUMNS,
  {
    id: 'customField',
    label: 'Custom Field',
    sortable: true,
    filterable: true,
    visible: true,
    render: (value, contact) => (
      <span className="text-blue-600">{value}</span>
    ),
    filterComponent: ({ column, value, onChange }) => (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select value" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
];
```

### Custom Cell Renderers

```tsx
const customColumns = [
  ...DEFAULT_TABLE_COLUMNS,
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    visible: true,
    render: (value, contact) => {
      const statusConfig = {
        active: { color: 'bg-green-100 text-green-800', label: 'Active' },
        inactive: { color: 'bg-red-100 text-red-800', label: 'Inactive' },
        pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      };
      
      const config = statusConfig[value] || statusConfig.pending;
      
      return (
        <Badge className={config.color}>
          {config.label}
        </Badge>
      );
    },
  },
];
```

### Custom Themes

```css
/* Custom CSS variables for theming */
.contact-display {
  --contact-primary: #3b82f6;
  --contact-primary-foreground: #ffffff;
  --contact-secondary: #f1f5f9;
  --contact-secondary-foreground: #0f172a;
  --contact-muted: #f8fafc;
  --contact-muted-foreground: #64748b;
  --contact-border: #e2e8f0;
  --contact-input: #ffffff;
  --contact-ring: #3b82f6;
  --contact-radius: 0.5rem;
}
```

## Performance Optimization

### Virtualization

The ResultsTable component uses virtualization by default for efficient rendering of large datasets:

```tsx
const contactManagement = useContactManagement(contacts, {
  enableVirtualization: true,
  pageSize: 25,
  debounceMs: 300,
});
```

### Memoization

Components are memoized to prevent unnecessary re-renders:

```tsx
import { memo } from 'react';

const CustomComponent = memo(({ data }) => {
  // Component implementation
});
```

### Debounced Filtering

Filter operations are debounced to reduce API calls:

```tsx
const contactManagement = useContactManagement(contacts, {
  debounceMs: 500,
});
```

### Performance Monitoring

Monitor performance metrics:

```tsx
const { performanceMetrics } = contactManagement;

console.log('Render time:', performanceMetrics.renderTime);
console.log('Filter time:', performanceMetrics.filterTime);
console.log('Sort time:', performanceMetrics.sortTime);
console.log('Memory usage:', performanceMetrics.memoryUsage);
```

## Accessibility

### Keyboard Navigation

All components support full keyboard navigation:

```tsx
// Keyboard shortcuts are built-in
// Ctrl/Cmd + A: Select all
// Ctrl/Cmd + Shift + A: Clear selection
// Ctrl/Cmd + E: Export
// Ctrl/Cmd + I: Import
// Arrow Keys: Navigate between contacts
// Escape: Close modals
```

### Screen Reader Support

Components include proper ARIA labels and descriptions:

```tsx
<ResultsTable
  // ...props
  aria-label="Contact results table"
  aria-describedby="table-description"
/>
```

### Focus Management

Logical focus flow and visible focus indicators:

```tsx
// Focus is managed automatically
// Custom focus styles can be applied with CSS
.contact-display:focus-visible {
  outline: 2px solid var(--contact-ring);
  outline-offset: 2px;
}
```

## Troubleshooting

### Common Issues

#### Virtualization Not Working

```tsx
// Ensure the container has a fixed height
<div style={{ height: '800px' }}>
  <ResultsTable
    // ...props
    enableVirtualization={true}
  />
</div>
```

#### Performance Issues

```tsx
// Use debounced filtering
const contactManagement = useContactManagement(contacts, {
  debounceMs: 500,
});

// Limit visible columns
const visibleColumns = columns.filter(column => column.visible);
```

#### Export Not Working

```tsx
// Ensure the export function is properly implemented
const handleExport = async (format, options) => {
  try {
    // Export logic
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

### Debug Mode

Enable debug mode for detailed logging:

```tsx
const contactManagement = useContactManagement(contacts, {
  debug: true,
});
```

### Performance Profiling

Profile component performance:

```tsx
import { withPerformanceTracking } from '@/components/features/contacts';

const ProfiledComponent = withPerformanceTracking(MyComponent, 'MyComponent');
```

## Best Practices

1. **Use Virtualization**: Always enable virtualization for large datasets
2. **Debounce Filtering**: Use debounced filtering to reduce API calls
3. **Memoize Components**: Memoize components to prevent unnecessary re-renders
4. **Customize Columns**: Customize columns to show only relevant information
5. **Implement Proper Error Handling**: Handle errors gracefully
6. **Provide Loading States**: Show loading states during data fetching
7. **Optimize Images**: Use optimized images for contact avatars
8. **Test Accessibility**: Test with screen readers and keyboard navigation
9. **Monitor Performance**: Monitor performance metrics regularly
10. **Use TypeScript**: Use TypeScript for type safety

## Conclusion

The Contact Results Display Components provide a comprehensive solution for displaying and managing AI-extracted contacts. With proper configuration and optimization, they can handle large datasets efficiently while providing a great user experience.

For more information, refer to the [README.md](./README.md) file or the [example.tsx](./example.tsx) file.